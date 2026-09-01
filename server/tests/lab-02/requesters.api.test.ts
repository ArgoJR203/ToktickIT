import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

describe("GET /api/requesters (API-10)", () => {
  it("returns only active development requesters and excludes inactive ones", async () => {
    const res = await request(app).get("/api/requesters");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);

    // All returned requesters must have isActive = true
    res.body.forEach((requester: { id: number; name: string; email: string; isActive: boolean }) => {
      expect(requester.isActive).toBe(true);
      expect(requester).toHaveProperty("id");
      expect(requester).toHaveProperty("name");
      expect(requester).toHaveProperty("email");
    });

    // Verify Robert Taylor (inactive) is excluded
    const inactiveUser = res.body.find((r: { email: string }) => r.email === "robert.taylor@example.com");
    expect(inactiveUser).toBeUndefined();

    // Verify seeded active requesters are present
    const activeEmails = res.body.map((r: { email: string }) => r.email);
    expect(activeEmails).toContain("jennifer.anderson@example.com");
    expect(activeEmails).toContain("sarah.johnson@example.com");
    expect(activeEmails).toContain("david.lee@example.com");
    expect(activeEmails).toContain("michael.brown@example.com");
  });
});
