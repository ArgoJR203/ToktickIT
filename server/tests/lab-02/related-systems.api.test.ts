import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";

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
    // Category 1 = "Account and Access" -> Email (categoryId: 1)
    const resCat1 = await request(app).get("/api/related-systems?categoryId=1");
    expect(resCat1.status).toBe(200);
    const cat1Names = resCat1.body.map((sys: { name: string }) => sys.name);
    expect(cat1Names).toContain("Email");
    expect(cat1Names).not.toContain("Campus Wi-Fi");

    // Category 4 = "Network" -> Campus Wi-Fi, VPN (categoryId: 4)
    const resCat4 = await request(app).get("/api/related-systems?categoryId=4");
    expect(resCat4.status).toBe(200);
    const cat4Names = resCat4.body.map((sys: { name: string }) => sys.name);
    expect(cat4Names).toContain("Campus Wi-Fi");
    expect(cat4Names).toContain("VPN");
    expect(cat4Names).not.toContain("Email");
  });
});
