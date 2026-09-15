import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { clearRevocations } from "../../src/utils/token-revocation.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Auth API Integration Tests (API-01 through API-06)", () => {
  beforeEach(async () => {
    clearRevocations();
    const defaultHash = await bcrypt.hash("Password123!", 10);
    await getPrisma().user.updateMany({
      where: { email: "david.lee@example.com" },
      data: {
        passwordHash: defaultHash,
        mustChangePassword: true,
      },
    });
  });


  // -------------------------------------------------------------------------
  // API-01: Valid user login (Handout §10 exact)
  // -------------------------------------------------------------------------
  it("API-01: logs in successfully with valid credentials and returns JWT token and safe user profile", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jennifer.anderson@example.com",
        password: "Password123!",
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.length).toBeGreaterThan(20);

    expect(res.body).toHaveProperty("user");
    const user = res.body.user;
    expect(user.email).toBe("jennifer.anderson@example.com");
    expect(user.name).toBe("Jennifer Anderson");
    expect(user.role).toBe("REQUESTER");
    expect(user.isActive).toBe(true);
    expect(user.mustChangePassword).toBe(false);

    // Ensure password hash is NEVER exposed in the response
    expect(user).not.toHaveProperty("password");
    expect(user).not.toHaveProperty("passwordHash");
  });

  // -------------------------------------------------------------------------
  // API-02: Inactive account login rejection (BR-01, AC-05)
  // -------------------------------------------------------------------------
  it("API-02: rejects login for deactivated accounts safely without leaking account state", async () => {
    // Robert Taylor is seeded as isActive = false
    const res = await request(app)
      .post("/api/auth/login")
      .send({
        email: "robert.taylor@example.com",
        password: "Password123!",
      });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(res.body.error.message).toContain("Invalid email or password");
    expect(res.body).not.toHaveProperty("token");

    // Also verify non-existent email returns identical generic 401 error
    const nonExistentRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "ghost.user@example.com",
        password: "Password123!",
      });

    expect(nonExistentRes.status).toBe(401);
    expect(nonExistentRes.body.error.code).toBe("INVALID_CREDENTIALS");
    expect(nonExistentRes.body.error.message).toBe(res.body.error.message);
  });

  // -------------------------------------------------------------------------
  // API-03: Password boundary: length < 8 chars (BR-07)
  // -------------------------------------------------------------------------
  it("API-03: rejects password change when new password length < 8 characters", async () => {
    // Login as active requester
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "sarah.johnson@example.com",
        password: "Password123!",
      });

    const token = loginRes.body.token;

    const res = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "Short1!",
        confirmPassword: "Short1!",
      });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
    expect(res.body.error.code).toBe("INVALID_INPUT");
    expect(res.body.error.details.some((d: string) => d.includes("8 characters"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // API-04: Password boundary: missing uppercase or number/special char (BR-07)
  // -------------------------------------------------------------------------
  it("API-04: rejects password change when missing uppercase or numeric/special character", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "sarah.johnson@example.com",
        password: "Password123!",
      });

    const token = loginRes.body.token;

    // Missing uppercase
    const noUpperRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "password123!",
        confirmPassword: "password123!",
      });

    expect(noUpperRes.status).toBe(400);
    expect(noUpperRes.body.error.code).toBe("INVALID_INPUT");
    expect(noUpperRes.body.error.details.some((d: string) => d.includes("uppercase"))).toBe(true);

    // Missing number or special character
    const noNumberRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword: "LongPasswordOnly",
        confirmPassword: "LongPasswordOnly",
      });

    expect(noNumberRes.status).toBe(400);
    expect(noNumberRes.body.error.code).toBe("INVALID_INPUT");
    expect(noNumberRes.body.error.details.some((d: string) => d.includes("number or special character"))).toBe(true);
  });

  // -------------------------------------------------------------------------
  // API-05: Mandatory password change at first login (BR-02, AC-02)
  // -------------------------------------------------------------------------
  it("API-05: changes password successfully and clears mustChangePassword flag", async () => {
    // David Lee is seeded with mustChangePassword = true
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "david.lee@example.com",
        password: "Password123!",
      });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.user.mustChangePassword).toBe(true);
    const token = loginRes.body.token;

    // Perform valid password change
    const newPassword = "BrandNewPassword2026!";
    const changeRes = await request(app)
      .post("/api/auth/change-password")
      .set("Authorization", `Bearer ${token}`)
      .send({
        currentPassword: "Password123!",
        newPassword,
        confirmPassword: newPassword,
      });

    expect(changeRes.status).toBe(200);
    expect(changeRes.body.user.mustChangePassword).toBe(false);

    // Verify subsequent login works with the NEW password
    const newLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "david.lee@example.com",
        password: newPassword,
      });

    expect(newLoginRes.status).toBe(200);
    expect(newLoginRes.body.user.mustChangePassword).toBe(false);

    // Verify old password is now rejected
    const oldLoginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "david.lee@example.com",
        password: "Password123!",
      });

    expect(oldLoginRes.status).toBe(401);
  });

  // -------------------------------------------------------------------------
  // API-06: User logout & token revocation (BR-09, AC-06, §12)
  // -------------------------------------------------------------------------
  it("API-06: invalidates JWT token on logout and rejects subsequent calls with 401 TOKEN_REVOKED", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "jennifer.anderson@example.com",
        password: "Password123!",
      });

    const token = loginRes.body.token;

    // Verify token works before logout
    const meBefore = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meBefore.status).toBe(200);
    expect(meBefore.body.user.email).toBe("jennifer.anderson@example.com");

    // Perform logout
    const logoutRes = await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toContain("Successfully logged out");

    // Subsequent request with the revoked token must return 401 TOKEN_REVOKED
    const meAfter = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meAfter.status).toBe(401);
    expect(meAfter.body.error.code).toBe("TOKEN_REVOKED");
    expect(meAfter.body.error.message).toContain("revoked");
  });
});
