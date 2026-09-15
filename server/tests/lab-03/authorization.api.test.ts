import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { clearRevocations } from "../../src/utils/token-revocation.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Authorization & RBAC Integration Tests (API-07)", () => {
  beforeEach(() => {
    clearRevocations();
  });

  // -------------------------------------------------------------------------
  // API-07: Functional endpoints blocked when password change required (BR-02, AC-02)
  // -------------------------------------------------------------------------
  it("API-07: blocks functional endpoints with 403 PASSWORD_CHANGE_REQUIRED when mustChangePassword = true", async () => {
    const defaultHash = await bcrypt.hash("Password123!", 10);
    // Use an isolated user for this test to avoid collision with concurrent auth.api.test.ts
    const gatedUser = await getPrisma().user.upsert({
      where: { email: "gated.tester@example.com" },
      update: {
        passwordHash: defaultHash,
        mustChangePassword: true,
        isActive: true,
      },
      create: {
        name: "Gated Tester",
        email: "gated.tester@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        mustChangePassword: true,
        isActive: true,
      },
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "gated.tester@example.com",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);
    const token = loginRes.body.token;

    // Attempt to access a functional gated endpoint
    const gatedRes = await request(app)
      .get("/api/test/gated-endpoint")
      .set("Authorization", `Bearer ${token}`);

    expect(gatedRes.status).toBe(403);
    expect(gatedRes.body).toHaveProperty("error");
    expect(gatedRes.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");
    expect(gatedRes.body.error.message).toContain("must change your initial password");

    // Exempt endpoints MUST still succeed:
    // 1. GET /api/auth/me
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.user.mustChangePassword).toBe(true);

    // 2. POST /api/auth/change-password
    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "UpdatedPassword2026!",
        confirmPassword: "UpdatedPassword2026!",
      });
    expect(changeRes.status).toBe(200);
    expect(changeRes.body.user.mustChangePassword).toBe(false);

    // Now that password has been changed, subsequent requests to gated endpoints succeed!
    const postChangeLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "gated.tester@example.com",
        password: "UpdatedPassword2026!",
      });
    const freshToken = postChangeLogin.body.token;

    const accessAfterRes = await request(app)
      .get("/api/test/gated-endpoint")
      .set("Authorization", `Bearer ${freshToken}`);

    expect(accessAfterRes.status).toBe(200);
    expect(accessAfterRes.body.status).toBe("ok");
  });

  // -------------------------------------------------------------------------
  // RBAC Role Enforcement Tests (requireRole)
  // -------------------------------------------------------------------------
  it("rejects unauthenticated requests to protected endpoints with 401 UNAUTHENTICATED", async () => {
    const resNoHeader = await request(app).get("/api/test/staff-only");
    expect(resNoHeader.status).toBe(401);
    expect(resNoHeader.body.error.code).toBe("UNAUTHENTICATED");

    const resEmptyBearer = await request(app)
      .get("/api/test/staff-only")
      .set("Authorization", "Bearer ");
    expect(resEmptyBearer.status).toBe(401);
    expect(resEmptyBearer.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("enforces role boundaries: Requesters are blocked from staff-only routes with 403 FORBIDDEN", async () => {
    const requesterLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jennifer.anderson@example.com",
        password: "Password123!",
      });
    const token = requesterLogin.body.token;

    // Requester accessing staff endpoint
    const res = await request(app)
      .get("/api/test/staff-only")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toContain("Access denied");

    // Requester accessing requester endpoint succeeds
    const okRes = await request(app)
      .get("/api/test/requester-only")
      .set("Authorization", `Bearer ${token}`);

    expect(okRes.status).toBe(200);
  });

  it("enforces role boundaries: IT Staff are blocked from admin-only routes with 403 FORBIDDEN", async () => {
    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "alex.thompson@toktickit.com",
        password: "Password123!",
      });
    const token = staffLogin.body.token;

    // Staff accessing admin endpoint
    const res = await request(app)
      .get("/api/test/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");

    // Staff accessing staff endpoint succeeds
    const okRes = await request(app)
      .get("/api/test/staff-only")
      .set("Authorization", `Bearer ${token}`);

    expect(okRes.status).toBe(200);
  });

  it("allows Administrators to access admin-only routes", async () => {
    const adminLogin = await request(app)
      .post("/api/auth/login")
      .send({
        email: "john.smith@toktickit.com",
        password: "Password123!",
      });
    const token = adminLogin.body.token;

    const res = await request(app)
      .get("/api/test/admin-only")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
