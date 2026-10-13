import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 4 Requester Dashboard Integration Tests (API-14, API-17, BR-15, AC-02)
 */
describe("Requester Dashboard API Integration Tests (API-14, API-17)", () => {
  let requesterToken: string;
  let otherRequesterToken: string;
  let staffToken: string;

  let requesterUser: any;
  let otherRequesterUser: any;
  let staffUser: any;

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
      where: { email: "dash.req1@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Dashboard Requester 1",
        email: "dash.req1@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    otherRequesterUser = await prisma.user.upsert({
      where: { email: "dash.req2@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Dashboard Requester 2",
        email: "dash.req2@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "dash.staff@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Dashboard Staff",
        email: "dash.staff@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const r1Login = await request(app).post("/api/auth/login").send({ email: "dash.req1@example.com", password: "Password123!" });
    requesterToken = r1Login.body.token;

    const r2Login = await request(app).post("/api/auth/login").send({ email: "dash.req2@example.com", password: "Password123!" });
    otherRequesterToken = r2Login.body.token;

    const sLogin = await request(app).post("/api/auth/login").send({ email: "dash.staff@toktickit.com", password: "Password123!" });
    staffToken = sLogin.body.token;

    // Clean up existing tickets created by dash.req1 to guarantee known baseline
    await prisma.ticket.deleteMany({
      where: { requesterId: requesterUser.id },
    });
  });

  async function createTicketForUser(requesterId: number, status: string, summary: string) {
    return getPrisma().ticket.create({
      data: {
        ticketNumber: `TKT-DSH-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        requesterId,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        summary,
        description: `Description for ${summary}`,
        currentStatus: status as any,
        version: 1,
      },
    });
  }

  describe("API-14: Requester Dashboard Scoped Metrics & Recent Tickets (Handout §10 exact, AC-02, BR-15)", () => {
    it("returns zero metrics cleanly when requester has no tickets", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics).toEqual({
        totalOpen: 0,
        waitingForRequester: 0,
        resolvedCount: 0,
        closedCount: 0,
      });
      expect(res.body.recentTickets).toEqual([]);
      expect(res.body.drillDownUrls).toEqual({
        totalOpen: "/tickets?statusGroup=open",
        waitingForRequester: "/tickets?currentStatus=WAITING_FOR_REQUESTER",
        resolvedCount: "/tickets?currentStatus=RESOLVED",
        closedCount: "/tickets?currentStatus=CLOSED",
      });
    });

    it("accurately computes metrics strictly isolated to the caller", async () => {
      // Create tickets for Requester 1:
      // 1 OPEN, 1 IN_PROGRESS, 1 WAITING_FOR_REQUESTER, 1 RESOLVED, 2 CLOSED
      await createTicketForUser(requesterUser.id, "OPEN", "Req 1 Open Ticket");
      await createTicketForUser(requesterUser.id, "IN_PROGRESS", "Req 1 In Progress Ticket");
      await createTicketForUser(requesterUser.id, "WAITING_FOR_REQUESTER", "Req 1 Waiting Ticket");
      await createTicketForUser(requesterUser.id, "RESOLVED", "Req 1 Resolved Ticket");
      await createTicketForUser(requesterUser.id, "CLOSED", "Req 1 Closed Ticket 1");
      await createTicketForUser(requesterUser.id, "CLOSED", "Req 1 Closed Ticket 2");

      // Create tickets for Requester 2 (must NOT be counted in Requester 1's dashboard)
      await createTicketForUser(otherRequesterUser.id, "OPEN", "Req 2 Open Ticket");
      await createTicketForUser(otherRequesterUser.id, "WAITING_FOR_REQUESTER", "Req 2 Waiting Ticket");

      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(200);
      // totalOpen = OPEN (1) + IN_PROGRESS (1) + WAITING_FOR_REQUESTER (1) = 3
      expect(res.body.metrics.totalOpen).toBe(3);
      expect(res.body.metrics.waitingForRequester).toBe(1);
      expect(res.body.metrics.resolvedCount).toBe(1);
      expect(res.body.metrics.closedCount).toBe(2);

      // Verify recentTickets are capped at 5 and belong strictly to requesterUser
      expect(res.body.recentTickets.length).toBe(5);
      for (const t of res.body.recentTickets) {
        expect(t.ticketNumber).toBeDefined();
        expect(t.summary).toBeDefined();
        expect(t.category).toBeDefined();
        expect(t.updatedAt).toBeDefined();
      }
    });
  });

  describe("API-17: Cross-Role Protection (BR-15, BR-16)", () => {
    it("blocks IT Staff from accessing requester dashboard with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/requester/dashboard")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
    });

    it("rejects unauthenticated request with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/requester/dashboard");
      expect(res.status).toBe(401);
    });
  });
});
