import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Staff Ticket Detail & Lifecycle API Tests (API-15, API-16, API-17, API-18)", () => {
  let requesterToken: string;
  let staffToken: string;
  let staffUser1: any;
  let staffUser2: any;
  let inactiveStaffUser: any;
  let adminToken: string;
  let adminUser: any;
  let mustChangePasswordToken: string;
  let requesterUser: any;

  let category: any;
  let relatedSystem: any;
  let testTicket: any;

  beforeAll(async () => {
    const prisma = getPrisma();
    const defaultHash = await bcrypt.hash("Password123!", 10);

    // 1. Fetch active system with category
    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true, categoryId: { not: null } },
      include: { category: true },
    });
    if (!system || !system.category) {
      throw new Error("Seeded system and category required for tests");
    }
    relatedSystem = system;
    category = system.category;

    // 2. Setup test users
    requesterUser = await prisma.user.upsert({
      where: { email: "detail.requester@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Detail Requester",
        email: "detail.requester@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser1 = await prisma.user.upsert({
      where: { email: "detail.staff1@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Detail Staff One",
        email: "detail.staff1@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser2 = await prisma.user.upsert({
      where: { email: "detail.staff2@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Detail Staff Two",
        email: "detail.staff2@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    inactiveStaffUser = await prisma.user.upsert({
      where: { email: "detail.staff.inactive@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: false, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Inactive Staff",
        email: "detail.staff.inactive@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: false,
        mustChangePassword: false,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "detail.admin@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "ADMINISTRATOR" },
      create: {
        name: "Detail Admin",
        email: "detail.admin@toktickit.com",
        passwordHash: defaultHash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });

    await prisma.user.upsert({
      where: { email: "detail.mustchange@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: true, role: "IT_STAFF" },
      create: {
        name: "Detail MustChange",
        email: "detail.mustchange@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
      },
    });

    // 3. Obtain authentication tokens
    const reqLogin = await request(app).post("/api/auth/login").send({ email: "detail.requester@example.com", password: "Password123!" });
    requesterToken = reqLogin.body.token;

    const staff1Login = await request(app).post("/api/auth/login").send({ email: "detail.staff1@toktickit.com", password: "Password123!" });
    staffToken = staff1Login.body.token;

    const adminLogin = await request(app).post("/api/auth/login").send({ email: "detail.admin@toktickit.com", password: "Password123!" });
    adminToken = adminLogin.body.token;

    const mustChangeLogin = await request(app).post("/api/auth/login").send({ email: "detail.mustchange@toktickit.com", password: "Password123!" });
    mustChangePasswordToken = mustChangeLogin.body.token;

    // 4. Create base ticket for testing
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        categoryId: category.id,
        relatedSystemId: relatedSystem.id,
        summary: "Staff ticket detail test ticket",
        description: "Testing staff ticket detail endpoints and transitions",
        requestedPriority: "MEDIUM",
      });
    expect(createRes.status).toBe(201);
    testTicket = createRes.body;
  });

  describe("GET /api/staff/tickets/:id (Staff Ticket Detail)", () => {
    it("returns ticket detail with permittedNextStatuses for IT Staff", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTicket.id);
      expect(res.body.ticketNumber).toBe(testTicket.ticketNumber);
      expect(res.body.summary).toBe("Staff ticket detail test ticket");
      expect(res.body.requestedPriority).toBe("MEDIUM");
      expect(res.body.itPriority).toBe("MEDIUM");
      expect(res.body.currentStatus).toBe("NEW");
      expect(Array.isArray(res.body.permittedNextStatuses)).toBe(true);
      expect(res.body.permittedNextStatuses).toEqual(["OPEN", "IN_PROGRESS", "CANCELLED"]);
      expect(res.body.category).toBeDefined();
      expect(res.body.category.name).toBe(category.name);
      expect(res.body.requester).toBeDefined();
      expect(res.body.requester.email).toBe("detail.requester@example.com");
    });

    it("returns ticket detail for Administrator", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTicket.id);
    });

    it("rejects Requester access with 403 Forbidden (RBAC / API-08)", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("rejects unauthenticated request with 401 Unauthorized", async () => {
      const res = await request(app).get(`/api/staff/tickets/${testTicket.id}`);
      expect(res.status).toBe(401);
    });

    it("blocks staff requiring password change with 403 PASSWORD_CHANGE_REQUIRED", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets/${testTicket.id}`)
        .set("Authorization", `Bearer ${mustChangePasswordToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("returns 404 for non-existent ticket", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/999999")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error?.code).toBe("NOT_FOUND");
    });

    it("returns 400 for non-numeric ticket id", async () => {
      const res = await request(app)
        .get("/api/staff/tickets/abc")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_INPUT");
    });
  });

  describe("API-15: IT Priority Initialization & Independent Update", () => {
    it("automatically copies requestedPriority into itPriority upon creation (BR-12)", async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          summary: "Check priority copy",
          description: "Verify itPriority initialization",
          requestedPriority: "URGENT",
        });

      expect(res.status).toBe(201);
      expect(res.body.requestedPriority).toBe("URGENT");
      expect(res.body.itPriority).toBe("URGENT");
    });

    it("allows IT Staff to update IT Priority independently without changing requestedPriority", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "HIGH" });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTicket.id);
      expect(res.body.itPriority).toBe("HIGH");

      // Verify in DB that requestedPriority remained MEDIUM
      const ticketInDb = await getPrisma().ticket.findUnique({ where: { id: testTicket.id } });
      expect(ticketInDb?.itPriority).toBe("HIGH");
      expect(ticketInDb?.requestedPriority).toBe("MEDIUM");
    });

    it("rejects invalid itPriority values with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ itPriority: "CRITICAL_INVALID" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_INPUT");
    });

    it("rejects Requester attempt to update IT Priority with 403 Forbidden", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/priority`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({ itPriority: "LOW" });

      expect(res.status).toBe(403);
    });
  });

  describe("API-16: Claim and Reassign Ticket Ownership (AC-08, FR-13)", () => {
    it("allows IT Staff to claim ownership (Assign to Me)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: staffUser1.id });

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(testTicket.id);
      expect(res.body.owner).toBeDefined();
      expect(res.body.owner.id).toBe(staffUser1.id);
      expect(res.body.owner.name).toBe("Detail Staff One");
    });

    it("allows reassigning ownership to another active IT Staff member", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: staffUser2.id });

      expect(res.status).toBe(200);
      expect(res.body.owner.id).toBe(staffUser2.id);
      expect(res.body.owner.name).toBe("Detail Staff Two");
    });

    it("allows reassigning ownership to an Administrator", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: adminUser.id });

      expect(res.status).toBe(200);
      expect(res.body.owner.id).toBe(adminUser.id);
    });

    it("allows unassigning ticket ownership by passing ownerId: null", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: null });

      expect(res.status).toBe(200);
      expect(res.body.owner).toBeNull();
    });

    it("rejects assigning ownership to a user with role REQUESTER with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: requesterUser.id });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_INPUT");
    });

    it("rejects assigning ownership to an inactive staff member with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: inactiveStaffUser.id });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_INPUT");
    });

    it("rejects assigning ownership to a non-existent user with 400 Bad Request", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${testTicket.id}/owner`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ ownerId: 888888 });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_INPUT");
    });
  });

  describe("API-17 & API-18: Status Transitions & Resolution Summary (AC-10, BR-14)", () => {
    let lifecycleTicket: any;

    beforeAll(async () => {
      const res = await request(app)
        .post("/api/tickets")
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({
          categoryId: category.id,
          relatedSystemId: relatedSystem.id,
          summary: "Lifecycle state machine test ticket",
          description: "Verifying valid transitions and resolution summary",
          requestedPriority: "HIGH",
        });
      lifecycleTicket = res.body;
    });

    it("API-18: rejects invalid status transition with 400 INVALID_TRANSITION (NEW -> RESOLVED)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${lifecycleTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "RESOLVED" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("INVALID_TRANSITION");
    });

    it("API-17: permits valid transition NEW -> OPEN", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${lifecycleTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "OPEN" });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("OPEN");
      expect(res.body.permittedNextStatuses).toEqual(["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"]);
    });

    it("API-17: permits valid transition OPEN -> IN_PROGRESS", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${lifecycleTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "IN_PROGRESS" });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("IN_PROGRESS");
      expect(res.body.permittedNextStatuses).toEqual(["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
    });

    it("API-17: permits valid transition IN_PROGRESS -> RESOLVED and saves resolutionSummary", async () => {
      const summaryText = "Fixed network routing certificate and restored handshake with OpenVPN.";
      const res = await request(app)
        .patch(`/api/staff/tickets/${lifecycleTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: summaryText,
        });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("RESOLVED");
      expect(res.body.resolutionSummary).toBe(summaryText);
      expect(res.body.permittedNextStatuses).toEqual(["CLOSED", "REOPENED"]);
    });

    it("API-17: permits valid transition RESOLVED -> CLOSED", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${lifecycleTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CLOSED" });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("CLOSED");
      expect(res.body.permittedNextStatuses).toEqual(["REOPENED"]);
    });

    it("API-17: permits valid transition CLOSED -> REOPENED", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${lifecycleTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "REOPENED" });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("REOPENED");
      expect(res.body.permittedNextStatuses).toEqual(["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"]);
    });

    it("API-17: permits valid transition REOPENED -> CANCELLED (terminal status)", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${lifecycleTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "CANCELLED" });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("CANCELLED");
      expect(res.body.permittedNextStatuses).toEqual([]);
    });

    it("API-18: rejects any transition from terminal CANCELLED status", async () => {
      const res = await request(app)
        .patch(`/api/staff/tickets/${lifecycleTicket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({ status: "OPEN" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_TRANSITION");
    });
  });

  describe("GET /api/staff/assignees (Eligible Assignees List)", () => {
    it("returns list containing only active IT_STAFF and ADMINISTRATOR accounts", async () => {
      const res = await request(app)
        .get("/api/staff/assignees")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(2);

      // Verify every returned user has role IT_STAFF or ADMINISTRATOR
      for (const u of res.body) {
        expect(["IT_STAFF", "ADMINISTRATOR"]).toContain(u.role);
        expect(u.name).toBeDefined();
        expect(u.email).toBeDefined();
        expect(u.passwordHash).toBeUndefined(); // Security: never leak password hash
      }

      // Verify inactive staff user is NOT present
      const inactiveFound = res.body.some((u: any) => u.id === inactiveStaffUser.id);
      expect(inactiveFound).toBe(false);

      // Verify requester user is NOT present
      const requesterFound = res.body.some((u: any) => u.id === requesterUser.id);
      expect(requesterFound).toBe(false);
    });

    it("rejects Requester access to assignees endpoint with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/staff/assignees")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
    });
  });
});
