import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("GET /api/tickets/:id API Integration Tests (API-05, AC-03, BR-18)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketAId: number;
  let ticketANumber: string;

  beforeAll(async () => {
    const prisma = getPrisma();
    const activeRequesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      take: 2,
    });
    if (activeRequesters.length < 2) {
      throw new Error("At least 2 active requesters required for test");
    }
    requesterAId = activeRequesters[0].id;
    requesterBId = activeRequesters[1].id;

    const category = await prisma.category.findFirst();
    if (!category) throw new Error("No category seeded");
    categoryId = category.id;

    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    if (!system) throw new Error("No related system seeded");
    relatedSystemId = system.id;

    // Create Ticket A owned by Requester A
    const resA = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", requesterAId.toString())
      .send({
        categoryId,
        relatedSystemId,
        summary: "Requester A ticket detail test issue",
        description: "Detailed description for ticket detail endpoint verification.",
        requestedPriority: "HIGH",
      });

    expect(resA.status).toBe(201);
    ticketAId = resA.body.id;
    ticketANumber = resA.body.ticketNumber;
  });

  it("returns 200 OK with full ticket details when accessed by the ticket owner (API-05, AC-03)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketAId}`)
      .set("x-requester-id", requesterAId.toString());

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(ticketAId);
    expect(res.body.ticketNumber).toBe(ticketANumber);
    expect(res.body.summary).toBe("Requester A ticket detail test issue");
    expect(res.body.description).toBe("Detailed description for ticket detail endpoint verification.");
    expect(res.body.requestedPriority).toBe("HIGH");
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.requesterId).toBe(requesterAId);

    // Associated relational models
    expect(res.body.category).toBeDefined();
    expect(res.body.category.id).toBe(categoryId);
    expect(typeof res.body.category.name).toBe("string");

    expect(res.body.relatedSystem).toBeDefined();
    expect(res.body.relatedSystem.id).toBe(relatedSystemId);
    expect(typeof res.body.relatedSystem.name).toBe("string");

    expect(res.body.requester).toBeDefined();
    expect(res.body.requester.id).toBe(requesterAId);
    expect(typeof res.body.requester.name).toBe("string");
    expect(typeof res.body.requester.email).toBe("string");

    expect(Array.isArray(res.body.attachments)).toBe(true);
  });

  it("returns 403 Forbidden when attempting to access another requester's ticket (API-05, BR-18)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketAId}`)
      .set("x-requester-id", requesterBId.toString());

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
    expect(res.body.message).toMatch(/do not own this ticket/i);
  });

  it("returns 404 Not Found when ticket ID does not exist", async () => {
    const nonExistentId = 999999;
    const res = await request(app)
      .get(`/api/tickets/${nonExistentId}`)
      .set("x-requester-id", requesterAId.toString());

    expect(res.status).toBe(404);
    expect(res.body.error).toBe("NOT_FOUND");
    expect(res.body.message).toBe("Ticket not found");
  });

  it("returns 401 Unauthorized when x-requester-id header is missing", async () => {
    const res = await request(app).get(`/api/tickets/${ticketAId}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });

  it("returns 400 Bad Request when ticket ID is not a valid number", async () => {
    const res = await request(app)
      .get("/api/tickets/invalid-id")
      .set("x-requester-id", requesterAId.toString());

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_INPUT");
  });
});
