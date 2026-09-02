import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("POST /api/tickets API Integration Tests (API-01, API-02)", () => {
  let activeRequesterId: number;
  let categoryId: number;
  let relatedSystemId: number;

  beforeAll(async () => {
    const prisma = getPrisma();
    const requester = await prisma.requesterUser.findFirst({ where: { isActive: true } });
    if (!requester) throw new Error("No active requester seeded in database");
    activeRequesterId = requester.id;

    const category = await prisma.category.findFirst();
    if (!category) throw new Error("No category seeded in database");
    categoryId = category.id;

    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    if (!system) throw new Error("No related system seeded in database");
    relatedSystemId = system.id;
  });

  it("creates a ticket with status NEW and formatted ticket number when valid data is provided (API-01, AC-01)", async () => {
    const payload = {
      categoryId,
      relatedSystemId,
      summary: "VPN Connection drops repeatedly on Wi-Fi",
      description: "Whenever connecting to campus VPN, the session drops every 5 minutes while working.",
      requestedPriority: "HIGH",
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", activeRequesterId.toString())
      .send(payload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("ticketNumber");
    expect(res.body.ticketNumber).toMatch(/^TKT-\d{4}-\d{6}$/);
    expect(res.body.currentStatus).toBe("NEW");
    expect(res.body.requesterId).toBe(activeRequesterId);
    expect(res.body.summary).toBe(payload.summary);
    expect(res.body.description).toBe(payload.description);
    expect(res.body.requestedPriority).toBe("HIGH");
  });

  it("returns 400 Bad Request with field validation errors when input is invalid (API-02, AC-05)", async () => {
    const invalidPayload = {
      categoryId: 99999, // non-existent category
      relatedSystemId: 99999,
      summary: "Tiny", // < 5 chars
      description: "Short", // < 10 chars
      requestedPriority: "SUPER_HIGH", // invalid enum
    };

    const res = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", activeRequesterId.toString())
      .send(invalidPayload);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_INPUT");
    expect(res.body.details).toHaveProperty("summary");
    expect(res.body.details).toHaveProperty("description");
    expect(res.body.details).toHaveProperty("requestedPriority");
  });

  it("returns 401 Unauthorized when x-requester-id header is missing", async () => {
    const payload = {
      categoryId,
      relatedSystemId,
      summary: "Valid ticket summary text",
      description: "Valid ticket description text that satisfies minimum length requirements.",
      requestedPriority: "MEDIUM",
    };

    const res = await request(app)
      .post("/api/tickets")
      .send(payload);

    expect(res.status).toBe(401);
    expect(res.body.error).toBe("UNAUTHORIZED");
  });
});
