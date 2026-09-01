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

describe("GET /api/categories (API-11)", () => {
  it("returns all 4 seeded ticket categories in id order", async () => {
    const res = await request(app).get("/api/categories");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 1, name: "Account and Access" },
      { id: 2, name: "Hardware" },
      { id: 3, name: "Software" },
      { id: 4, name: "Network" },
    ]);
  });
});

describe("GET /api/related-systems (API-12)", () => {
  it("returns active related systems without category filter", async () => {
    const res = await request(app).get("/api/related-systems");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(7);

    const names = res.body.map((sys: { name: string }) => sys.name);
    expect(names).toContain("Email");
    expect(names).toContain("Campus Wi-Fi");
    expect(names).toContain("VPN");
    expect(names).toContain("LEB2 App");
    expect(names).toContain("Grade Submission App");
    expect(names).toContain("Printer");
    expect(names).toContain("Corporate Laptop");
  });

  it("filters related systems by categoryId query parameter", async () => {
    const resCat1 = await request(app).get("/api/related-systems?categoryId=1");
    expect(resCat1.status).toBe(200);
    const cat1Names = resCat1.body.map((sys: { name: string }) => sys.name);
    expect(cat1Names).toContain("Email");
    expect(cat1Names).not.toContain("Campus Wi-Fi");

    const resCat4 = await request(app).get("/api/related-systems?categoryId=4");
    expect(resCat4.status).toBe(200);
    const cat4Names = resCat4.body.map((sys: { name: string }) => sys.name);
    expect(cat4Names).toContain("Campus Wi-Fi");
    expect(cat4Names).toContain("VPN");
    expect(cat4Names).not.toContain("Email");
  });
});
