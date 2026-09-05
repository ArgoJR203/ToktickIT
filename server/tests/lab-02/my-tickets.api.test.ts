import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/tickets API Integration Tests (API-03, API-04)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketANumber: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    const activeRequesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      take: 2,
    });
    if (activeRequesters.length < 2) throw new Error("At least 2 active requesters required for test");
    requesterAId = activeRequesters[0].id;
    requesterBId = activeRequesters[1].id;

    const category = await prisma.category.findFirst();
    if (!category) throw new Error("No category seeded");
    categoryId = category.id;

    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    if (!system) throw new Error("No related system seeded");
    relatedSystemId = system.id;

    // Create a ticket for Requester A
    const resA = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", requesterAId.toString())
      .send({
        categoryId,
        relatedSystemId,
        summary: "Requester A unique issue summary for ownership test",
        description: "Requester A issue detailed description text for testing.",
        requestedPriority: "HIGH",
      });
    ticketANumber = resA.body.ticketNumber;

    // Create a ticket for Requester B
    await request(app)
      .post("/api/tickets")
      .set("x-requester-id", requesterBId.toString())
      .send({
        categoryId,
        relatedSystemId,
        summary: "Requester B unique issue summary for ownership test",
        description: "Requester B issue detailed description text for testing.",
        requestedPriority: "LOW",
      });
  });

  it("returns tickets belonging ONLY to the x-requester-id owner (API-03, AC-03)", async () => {
    const res = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", requesterAId.toString());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("data");
    expect(res.body).toHaveProperty("pagination");
    expect(Array.isArray(res.body.data)).toBe(true);
    // Lab guideline §13.1: Verify non-empty data so assertions inside loop are actively evaluated
    expect(res.body.data.length).toBeGreaterThan(0);

    const foundTicketA = res.body.data.find(
      (t: { ticketNumber: string }) => t.ticketNumber === ticketANumber
    );
    expect(foundTicketA).toBeDefined();

    // Verify all returned tickets belong to Requester A only
    for (const ticket of res.body.data) {
      expect(ticket.requesterId).toBe(requesterAId);
    }
  });

  it("returns 401 Unauthorized when x-requester-id header is missing", async () => {
    const res = await request(app).get("/api/tickets");
    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("filters tickets by search keyword matching summary or ticketNumber (API-04, AC-04)", async () => {
    const res = await request(app)
      .get(`/api/tickets?search=${encodeURIComponent(ticketANumber)}`)
      .set("x-requester-id", requesterAId.toString());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].ticketNumber).toBe(ticketANumber);
  });

  it("supports category, priority filters and pagination structure (API-04)", async () => {
    const res = await request(app)
      .get(`/api/tickets?categoryId=${categoryId}&requestedPriority=HIGH&page=1&pageSize=5`)
      .set("x-requester-id", requesterAId.toString());

    expect(res.status).toBe(200);
    expect(res.body.pagination.page).toBe(1);
    expect(res.body.pagination.pageSize).toBe(5);
    // Lab guideline §13.1: Ensure filtered array contains items before looping
    expect(res.body.data.length).toBeGreaterThan(0);
    for (const ticket of res.body.data) {
      expect(ticket.categoryId).toBe(categoryId);
      expect(ticket.requestedPriority).toBe("HIGH");
    }
  });

  it("applies deterministic secondary sort tie-breaker when primary sort fields are identical (BR-07)", async () => {
    // Create two tickets for Requester A with identical priority "MEDIUM"
    const t1 = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", requesterAId.toString())
      .send({
        categoryId,
        relatedSystemId,
        summary: "Secondary sort test ticket 1",
        description: "Secondary sort test ticket 1 description.",
        requestedPriority: "MEDIUM",
      });

    const t2 = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", requesterAId.toString())
      .send({
        categoryId,
        relatedSystemId,
        summary: "Secondary sort test ticket 2",
        description: "Secondary sort test ticket 2 description.",
        requestedPriority: "MEDIUM",
      });

    // Query sorted by requestedPriority asc: tickets with same priority must be ordered deterministically by id desc
    const res = await request(app)
      .get("/api/tickets?sortBy=requestedPriority&sortOrder=asc&requestedPriority=MEDIUM")
      .set("x-requester-id", requesterAId.toString());

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(2);
    const idList = res.body.data.map((t: { id: number }) => t.id);
    const idx1 = idList.indexOf(t1.body.id);
    const idx2 = idList.indexOf(t2.body.id);
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx2).toBeGreaterThanOrEqual(0);
    // t2 was created after t1 (higher id), so t2 must appear before t1 with secondary id: desc
    expect(idx2).toBeLessThan(idx1);
  });
});
