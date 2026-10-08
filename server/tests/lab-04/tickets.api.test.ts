import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 4 Tickets API Integration Tests (API-23, AC-12, FR-18)
 * Verifies statusGroup=open and statusGroup=resolved query filtering for dashboard drill-downs.
 */
describe("Tickets API Status Group Filtering Integration Tests (API-23)", () => {
  let requesterToken: string;
  let requesterUser: any;
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
      where: { email: "statusgroup.req@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Status Group Requester",
        email: "statusgroup.req@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const loginRes = await request(app).post("/api/auth/login").send({
      email: "statusgroup.req@example.com",
      password: "Password123!",
    });
    requesterToken = loginRes.body.token;

    // Clean up existing tickets for this requester
    await prisma.ticket.deleteMany({
      where: { requesterId: requesterUser.id },
    });

    // Seed tickets across various statuses:
    // Open group: NEW, OPEN, IN_PROGRESS, WAITING_FOR_REQUESTER, REOPENED
    // Resolved group: RESOLVED, CLOSED
    // Other: CANCELLED
    const statuses = [
      "NEW",
      "OPEN",
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "REOPENED",
      "RESOLVED",
      "CLOSED",
      "CANCELLED",
    ];

    for (const st of statuses) {
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-SG-${st}-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          requesterId: requesterUser.id,
          categoryId: testCategory.id,
          relatedSystemId: testSystem.id,
          requestedPriority: "MEDIUM",
          itPriority: "MEDIUM",
          summary: `Ticket in status ${st}`,
          description: `Description for ${st}`,
          currentStatus: st as any,
          version: 1,
        },
      });
    }
  });

  it("filters active tickets when statusGroup=open", async () => {
    const res = await request(app)
      .get("/api/tickets?statusGroup=open")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(5);

    const allowedStatuses = ["NEW", "OPEN", "IN_PROGRESS", "WAITING_FOR_REQUESTER", "REOPENED"];
    for (const t of res.body.data) {
      expect(allowedStatuses).toContain(t.currentStatus);
    }
  });

  it("filters resolved and closed tickets when statusGroup=resolved", async () => {
    const res = await request(app)
      .get("/api/tickets?statusGroup=resolved")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(2);

    const allowedStatuses = ["RESOLVED", "CLOSED"];
    for (const t of res.body.data) {
      expect(allowedStatuses).toContain(t.currentStatus);
    }
  });

  it("allows specific currentStatus filter to override or combine cleanly", async () => {
    const res = await request(app)
      .get("/api/tickets?statusGroup=open&currentStatus=OPEN")
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].currentStatus).toBe("OPEN");
  });
});
