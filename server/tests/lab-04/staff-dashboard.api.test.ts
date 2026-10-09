import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 4 IT Staff & Administrator Dashboard Integration Tests (API-15, API-16, API-17, BR-16, BR-17, AC-10, AC-11)
 */
describe("IT Staff & Administrator Dashboard API Integration Tests (API-15..17)", () => {
  let requesterToken: string;
  let staffToken: string;
  let adminToken: string;

  let requesterUser: any;
  let staffUser: any;
  let adminUser: any;

  let testCategory: any;
  let testSystem: any;

  beforeAll(async () => {
    const prisma = getPrisma();
    const defaultHash = await bcrypt.hash("Password123!", 10);

    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true, categoryId: { not: null } },
      include: { category: true },
    });
    if (!system || !system.category) {
      throw new Error("Seeded system and category required for tests");
    }
    testSystem = system;
    testCategory = system.category;

    requesterUser = await prisma.user.upsert({
      where: { email: "sdash.req@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "StaffDash Requester",
        email: "sdash.req@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "sdash.staff@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "StaffDash Staff",
        email: "sdash.staff@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "sdash.admin@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "ADMINISTRATOR" },
      create: {
        name: "StaffDash Admin",
        email: "sdash.admin@toktickit.com",
        passwordHash: defaultHash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const rLogin = await request(app).post("/api/auth/login").send({ email: "sdash.req@example.com", password: "Password123!" });
    requesterToken = rLogin.body.token;

    const sLogin = await request(app).post("/api/auth/login").send({ email: "sdash.staff@toktickit.com", password: "Password123!" });
    staffToken = sLogin.body.token;

    const aLogin = await request(app).post("/api/auth/login").send({ email: "sdash.admin@toktickit.com", password: "Password123!" });
    adminToken = aLogin.body.token;
  });

  async function createOperationalTicket(overrides: Record<string, any> = {}) {
    return getPrisma().ticket.create({
      data: {
        ticketNumber: `TKT-OP-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        requesterId: requesterUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        summary: "Operational test ticket",
        description: "Operational ticket description",
        currentStatus: "OPEN",
        version: 1,
        ...overrides,
      },
    });
  }

  describe("API-15: IT Staff Operational Dashboard Metrics (AC-10, BR-16)", () => {
    it("returns operational metrics, recent queue, and drill-down URLs for IT Staff without adminStats", async () => {
      // Create specific known tickets
      await createOperationalTicket({ ownerId: null, currentStatus: "OPEN", itPriority: "URGENT" });
      await createOperationalTicket({ ownerId: staffUser.id, currentStatus: "IN_PROGRESS", itPriority: "HIGH" });
      await createOperationalTicket({ ownerId: staffUser.id, currentStatus: "CLOSED", itPriority: "LOW" });

      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);

      // Verify metrics object structure
      expect(res.body.metrics).toBeDefined();
      expect(typeof res.body.metrics.unassignedCount).toBe("number");
      expect(typeof res.body.metrics.assignedToMeCount).toBe("number");

      // Verify all 8 statuses are present in countsByStatus
      const expectedStatuses = [
        "NEW",
        "OPEN",
        "IN_PROGRESS",
        "WAITING_FOR_REQUESTER",
        "RESOLVED",
        "CLOSED",
        "REOPENED",
        "CANCELLED",
      ];
      for (const st of expectedStatuses) {
        expect(res.body.metrics.countsByStatus[st]).toBeDefined();
        expect(typeof res.body.metrics.countsByStatus[st]).toBe("number");
      }

      // Verify all 4 priorities are present in countsByPriority
      const expectedPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      for (const pr of expectedPriorities) {
        expect(res.body.metrics.countsByPriority[pr]).toBeDefined();
        expect(typeof res.body.metrics.countsByPriority[pr]).toBe("number");
      }

      // Verify recentTickets
      expect(Array.isArray(res.body.recentTickets)).toBe(true);
      expect(res.body.recentTickets.length).toBeLessThanOrEqual(5);
      if (res.body.recentTickets.length > 0) {
        const first = res.body.recentTickets[0];
        expect(first.ticketNumber).toBeDefined();
        expect(first.summary).toBeDefined();
        expect(first.currentStatus).toBeDefined();
        expect(first.itPriority).toBeDefined();
        expect(first.requester).toBeDefined();
      }

      // Verify drillDownUrls
      expect(res.body.drillDownUrls).toEqual({
        unassigned: "/staff/tickets?ownerId=unassigned",
        assignedToMe: "/staff/tickets?ownerId=me",
        open: "/staff/tickets?currentStatus=OPEN",
        inProgress: "/staff/tickets?currentStatus=IN_PROGRESS",
        waitingForRequester: "/staff/tickets?currentStatus=WAITING_FOR_REQUESTER",
      });

      // IT_STAFF must NOT receive adminStats
      expect(res.body.adminStats).toBeUndefined();
    });
  });

  describe("API-16: Administrator Dashboard User Account Metrics Extension (AC-11, BR-17)", () => {
    it("includes dynamically computed adminStats when requested by ADMINISTRATOR", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);

      // Verify adminStats exists
      expect(res.body.adminStats).toBeDefined();
      expect(typeof res.body.adminStats.totalUsers).toBe("number");
      expect(typeof res.body.adminStats.activeUsers).toBe("number");
      expect(res.body.adminStats.totalUsers).toBeGreaterThanOrEqual(res.body.adminStats.activeUsers);

      // Verify usersByRole breakdown
      expect(res.body.adminStats.usersByRole).toBeDefined();
      expect(typeof res.body.adminStats.usersByRole.REQUESTER).toBe("number");
      expect(typeof res.body.adminStats.usersByRole.IT_STAFF).toBe("number");
      expect(typeof res.body.adminStats.usersByRole.ADMINISTRATOR).toBe("number");

      // Verify DB consistency
      const expectedTotal = await getPrisma().user.count();
      const expectedActive = await getPrisma().user.count({ where: { isActive: true } });
      expect(res.body.adminStats.totalUsers).toBe(expectedTotal);
      expect(res.body.adminStats.activeUsers).toBe(expectedActive);
    });
  });

  describe("API-17: Cross-Role Protection (BR-15, BR-16)", () => {
    it("blocks Requesters from accessing staff dashboard with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/staff/dashboard")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it("rejects unauthenticated request with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/staff/dashboard");
      expect(res.status).toBe(401);
    });
  });
});
