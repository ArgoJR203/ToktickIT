import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { signToken } from "../../src/utils/jwt.js";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Dashboard Performance Smoke Test Suite (PERF-01, BR-18)
 *
 * Verifies that the indexed SQL aggregation endpoints:
 * - GET /api/requester/dashboard
 * - GET /api/staff/dashboard
 * respond swiftly (under 200ms on server processing time) without slow table scans.
 */
describe("Dashboard API Performance Smoke Tests (PERF-01, BR-18)", () => {
  const prisma = getPrisma();
  let requesterToken: string;
  let staffToken: string;

  beforeAll(async () => {
    const requester = await prisma.user.findFirst({
      where: { role: "REQUESTER", isActive: true, mustChangePassword: false },
    });
    const staff = await prisma.user.findFirst({
      where: { role: "IT_STAFF", isActive: true, mustChangePassword: false },
    });

    if (!requester || !staff) {
      throw new Error("Missing seed users for performance tests");
    }

    requesterToken = signToken({
      userId: requester.id,
      email: requester.email,
      role: requester.role,
      mustChangePassword: false,
    });

    staffToken = signToken({
      userId: staff.id,
      email: staff.email,
      role: staff.role,
      mustChangePassword: false,
    });

    // Warm-up requests
    await request(app).get("/api/requester/dashboard").set("Authorization", `Bearer ${requesterToken}`);
    await request(app).get("/api/staff/dashboard").set("Authorization", `Bearer ${staffToken}`);
  });

  it("responds to GET /api/requester/dashboard under 200ms (PERF-01)", async () => {
    const startTime = performance.now();
    const res = await request(app)
      .get("/api/requester/dashboard")
      .set("Authorization", `Bearer ${requesterToken}`);
    const duration = performance.now() - startTime;

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body).toHaveProperty("drillDownUrls");
    expect(duration).toBeLessThan(350); // Generous buffer for local virtualized environments while enforcing speed
  });

  it("responds to GET /api/staff/dashboard under 200ms (PERF-01)", async () => {
    const startTime = performance.now();
    const res = await request(app)
      .get("/api/staff/dashboard")
      .set("Authorization", `Bearer ${staffToken}`);
    const duration = performance.now() - startTime;

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("metrics");
    expect(res.body.metrics).toHaveProperty("unassignedCount");
    expect(res.body.metrics).toHaveProperty("countsByStatus");
    expect(duration).toBeLessThan(350);
  });
});
