import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 IT Staff Ticket Queue API Tests (API-13, API-14)", () => {
  let requesterToken: string;
  let staffToken: string;
  let staffUser: any;
  let adminToken: string;
  let adminUser: any;
  let mustChangePasswordToken: string;

  let category1: any;
  let category2: any;
  let system1: any;
  let system2: any;

  let ticket1: any;
  let ticket2: any;
  let ticket3: any;

  beforeAll(async () => {
    const prisma = getPrisma();
    const defaultHash = await bcrypt.hash("Password123!", 10);

    // 1. Fetch existing seeded systems and their associated categories
    const allSystems = await prisma.relatedSystem.findMany({
      where: { isActive: true, categoryId: { not: null } },
      include: { category: true },
      orderBy: { id: "asc" },
    });
    if (allSystems.length < 2) {
      throw new Error("Expected at least 2 active systems with categories");
    }

    system1 = allSystems[0];
    category1 = system1.category;

    // Pick a system with a different category if available
    const otherSys = allSystems.find((s) => s.categoryId !== system1.categoryId) || allSystems[1];
    system2 = otherSys;
    category2 = otherSys.category;

    // 2. Create test users
    const reqUser = await prisma.user.upsert({
      where: { email: "queue.requester@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Queue Requester",
        email: "queue.requester@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "queue.staff@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Queue Staff",
        email: "queue.staff@example.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "queue.admin@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "ADMINISTRATOR" },
      create: {
        name: "Queue Admin",
        email: "queue.admin@example.com",
        passwordHash: defaultHash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });

    await prisma.user.upsert({
      where: { email: "queue.mustchange@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: true, role: "IT_STAFF" },
      create: {
        name: "Queue MustChange",
        email: "queue.mustchange@example.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: true,
      },
    });

    // 3. Log in to retrieve tokens
    const reqLogin = await request(app).post("/api/auth/login").send({ email: "queue.requester@example.com", password: "Password123!" });
    requesterToken = reqLogin.body.token;

    const staffLogin = await request(app).post("/api/auth/login").send({ email: "queue.staff@example.com", password: "Password123!" });
    staffToken = staffLogin.body.token;

    const adminLogin = await request(app).post("/api/auth/login").send({ email: "queue.admin@example.com", password: "Password123!" });
    adminToken = adminLogin.body.token;

    const mustChangeLogin = await request(app).post("/api/auth/login").send({ email: "queue.mustchange@example.com", password: "Password123!" });
    mustChangePasswordToken = mustChangeLogin.body.token;

    // 4. Create distinct test tickets via normal POST /api/tickets to ensure valid pairing
    const res1 = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        categoryId: category1.id,
        relatedSystemId: system1.id,
        summary: "Alpha Unique VPN connection issue",
        description: "VPN drops every 10 minutes",
        requestedPriority: "LOW",
      });
    expect(res1.status).toBe(201);
    ticket1 = await prisma.ticket.update({
      where: { id: res1.body.id },
      data: {
        ownerId: staffUser.id,
        itPriority: "LOW",
        currentStatus: "OPEN",
      },
    });

    const res2 = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        categoryId: category2.id,
        relatedSystemId: system2.id,
        summary: "Beta Unique Email synchronization failure",
        description: "Emails not syncing to Outlook",
        requestedPriority: "URGENT",
      });
    expect(res2.status).toBe(201);
    ticket2 = await prisma.ticket.update({
      where: { id: res2.body.id },
      data: {
        ownerId: null, // Unassigned
        itPriority: "URGENT",
        currentStatus: "WAITING_FOR_REQUESTER",
      },
    });

    const res3 = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        categoryId: category1.id,
        relatedSystemId: system1.id,
        summary: "Gamma Unique Printer offline error",
        description: "Printer 3rd floor not responding",
        requestedPriority: "MEDIUM",
      });
    expect(res3.status).toBe(201);
    ticket3 = await prisma.ticket.update({
      where: { id: res3.body.id },
      data: {
        ownerId: adminUser.id,
        itPriority: "HIGH",
        currentStatus: "RESOLVED",
      },
    });
  });

  afterAll(async () => {
    const prisma = getPrisma();
    if (ticket1?.id || ticket2?.id || ticket3?.id) {
      await prisma.ticket.deleteMany({
        where: {
          id: { in: [ticket1?.id, ticket2?.id, ticket3?.id].filter(Boolean) },
        },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // API-13: IT Staff Ticket Queue retrieval (AC-07, FR-11)
  // ---------------------------------------------------------------------------
  describe("API-13: Access Control & Basic Queue Retrieval", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/staff/tickets");
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe("UNAUTHENTICATED");
    });

    it("rejects users requiring password change with 403 PASSWORD_CHANGE_REQUIRED", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${mustChangePasswordToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("rejects non-staff (REQUESTER) role with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${requesterToken}`);
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });

    it("allows IT_STAFF to retrieve shared ticket queue with pagination metadata", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("data");
      expect(res.body).toHaveProperty("pagination");
      expect(Array.isArray(res.body.data)).toBe(true);

      expect(res.body.pagination).toMatchObject({
        page: 1,
        pageSize: 10,
      });
      expect(res.body.pagination.totalItems).toBeGreaterThanOrEqual(3);
      expect(res.body.pagination.totalPages).toBeGreaterThanOrEqual(1);

      // Verify ticket structure
      const item = res.body.data.find((t: any) => t.id === ticket1.id);
      expect(item).toBeDefined();
      expect(item.ticketNumber).toBe(ticket1.ticketNumber);
      expect(item.summary).toBe(ticket1.summary);
      expect(item.requester).toMatchObject({ id: expect.any(Number), name: expect.any(String), email: expect.any(String) });
      expect(item.owner).toMatchObject({ id: staffUser.id, name: staffUser.name });
      expect(item.category).toMatchObject({ id: category1.id, name: category1.name });
      expect(item.relatedSystem).toMatchObject({ id: system1.id, name: system1.name });
      expect(item.requestedPriority).toBe("LOW");
      expect(item.itPriority).toBe("LOW");
      expect(item.currentStatus).toBe("OPEN");
    });

    it("allows ADMINISTRATOR to retrieve shared ticket queue", async () => {
      const res = await request(app)
        .get("/api/staff/tickets")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
    });
  });

  // ---------------------------------------------------------------------------
  // API-14: Queue search & multi-field filtering (AC-07, FR-12)
  // ---------------------------------------------------------------------------
  describe("API-14: Search, Filtering, Sorting & Pagination", () => {
    it("filters tickets by search keyword matching summary (case-insensitive)", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?search=email%20synchronization")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: any) => t.id);
      expect(ids).toContain(ticket2.id);
      expect(ids).not.toContain(ticket1.id);
      expect(ids).not.toContain(ticket3.id);
    });

    it("filters tickets by search keyword matching ticketNumber (case-insensitive)", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?search=${encodeURIComponent(ticket1.ticketNumber.toLowerCase())}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: any) => t.id);
      expect(ids).toContain(ticket1.id);
      expect(ids).not.toContain(ticket2.id);
    });

    it("filters tickets by categoryId", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?categoryId=${category2.id}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: any) => t.id);
      expect(ids).toContain(ticket2.id);
      if (category1.id !== category2.id) {
        expect(ids).not.toContain(ticket1.id);
        expect(ids).not.toContain(ticket3.id);
      }
    });

    it("filters tickets by status / currentStatus (including PENDING alias)", async () => {
      // By WAITING_FOR_REQUESTER
      const res1 = await request(app)
        .get("/api/staff/tickets?currentStatus=WAITING_FOR_REQUESTER")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res1.status).toBe(200);
      const ids1 = res1.body.data.map((t: any) => t.id);
      expect(ids1).toContain(ticket2.id);
      expect(ids1).not.toContain(ticket1.id);

      // Using status query param with PENDING alias
      const res2 = await request(app)
        .get("/api/staff/tickets?status=PENDING")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res2.status).toBe(200);
      const ids2 = res2.body.data.map((t: any) => t.id);
      expect(ids2).toContain(ticket2.id);
    });

    it("filters tickets by itPriority", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?itPriority=URGENT")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const ids = res.body.data.map((t: any) => t.id);
      expect(ids).toContain(ticket2.id);
      expect(ids).not.toContain(ticket1.id);
    });

    it("filters tickets by ownerId=unassigned", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=unassigned")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const unassignedItems = res.body.data.filter((t: any) => [ticket1.id, ticket2.id, ticket3.id].includes(t.id));
      expect(unassignedItems.map((t: any) => t.id)).toContain(ticket2.id);
      expect(unassignedItems.map((t: any) => t.id)).not.toContain(ticket1.id);
      expect(unassignedItems.map((t: any) => t.id)).not.toContain(ticket3.id);
    });

    it("filters tickets by ownerId=me", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?ownerId=me")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const myItems = res.body.data.filter((t: any) => [ticket1.id, ticket2.id, ticket3.id].includes(t.id));
      expect(myItems.map((t: any) => t.id)).toContain(ticket1.id);
      expect(myItems.map((t: any) => t.id)).not.toContain(ticket2.id);
      expect(myItems.map((t: any) => t.id)).not.toContain(ticket3.id);
    });

    it("filters tickets by numeric ownerId", async () => {
      const res = await request(app)
        .get(`/api/staff/tickets?ownerId=${adminUser.id}`)
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      const adminItems = res.body.data.filter((t: any) => [ticket1.id, ticket2.id, ticket3.id].includes(t.id));
      expect(adminItems.map((t: any) => t.id)).toContain(ticket3.id);
      expect(adminItems.map((t: any) => t.id)).not.toContain(ticket1.id);
    });

    it("supports sorting and pagination options", async () => {
      const res = await request(app)
        .get("/api/staff/tickets?sortBy=ticketNumber&sortOrder=asc&page=1&pageSize=2")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(200);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.pageSize).toBe(2);
      expect(res.body.data.length).toBeLessThanOrEqual(2);

      // Verify sorting order of ticketNumber asc
      if (res.body.data.length >= 2) {
        expect(res.body.data[0].ticketNumber.localeCompare(res.body.data[1].ticketNumber)).toBeLessThanOrEqual(0);
      }
    });
  });
});
