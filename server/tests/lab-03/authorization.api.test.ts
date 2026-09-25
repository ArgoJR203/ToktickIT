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
    await getPrisma().user.updateMany({
      where: { email: "john.smith@toktickit.com" },
      data: { isActive: true },
    });

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

  // -------------------------------------------------------------------------
  // API-09: Requester ownership isolation (AC-03, BR-03)
  // -------------------------------------------------------------------------
  it("API-09: enforces requester ownership isolation and ignores client-supplied x-requester-id when authenticated", async () => {
    const defaultHash = await bcrypt.hash("Password123!", 10);
    const userA = await getPrisma().user.upsert({
      where: { email: "iso.userA@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false },
      create: {
        name: "Isolation User A",
        email: "iso.userA@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const userB = await getPrisma().user.upsert({
      where: { email: "iso.userB@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false },
      create: {
        name: "Isolation User B",
        email: "iso.userB@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const loginA = await request(app)
      .post("/api/auth/login")
      .send({ email: "iso.userA@example.com", password: "Password123!" });
    const tokenA = loginA.body.token;

    const loginB = await request(app)
      .post("/api/auth/login")
      .send({ email: "iso.userB@example.com", password: "Password123!" });
    const tokenB = loginB.body.token;

    const category = await getPrisma().category.findFirst();
    const system = await getPrisma().relatedSystem.findFirst({ where: { isActive: true } });

    // User B creates a ticket
    const ticketBRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenB}`)
      .send({
        categoryId: category!.id,
        relatedSystemId: system!.id,
        summary: "User B Private Ticket",
        description: "Confidential requester ticket content for user B.",
        requestedPriority: "MEDIUM",
      });
    expect(ticketBRes.status).toBe(201);
    const ticketBId = ticketBRes.body.id;

    // User A creates a ticket
    const ticketARes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${tokenA}`)
      .send({
        categoryId: category!.id,
        relatedSystemId: system!.id,
        summary: "User A Ticket",
        description: "Ticket owned by User A.",
        requestedPriority: "LOW",
      });
    expect(ticketARes.status).toBe(201);
    const ticketAId = ticketARes.body.id;

    // 1. User A tries to view User B's ticket with token A -> 403 Forbidden
    const crossAccess = await request(app)
      .get(`/api/tickets/${ticketBId}`)
      .set("Authorization", `Bearer ${tokenA}`);
    expect(crossAccess.status).toBe(403);
    expect(crossAccess.body.error).toBe("FORBIDDEN");

    // 2. User A passes x-requester-id of User B along with Token A -> Backend strictly applies token identity and rejects (BR-03)
    const spoofAttempt = await request(app)
      .get(`/api/tickets/${ticketBId}`)
      .set("Authorization", `Bearer ${tokenA}`)
      .set("x-requester-id", userB.id.toString());
    expect(spoofAttempt.status).toBe(403);
    expect(spoofAttempt.body.error).toBe("FORBIDDEN");

    // 3. User A lists tickets with x-requester-id of User B -> only User A's ticket returned
    const listRes = await request(app)
      .get("/api/tickets")
      .set("Authorization", `Bearer ${tokenA}`)
      .set("x-requester-id", userB.id.toString());
    expect(listRes.status).toBe(200);
    const ticketIds = listRes.body.data.map((t: any) => t.id);
    expect(ticketIds).toContain(ticketAId);
    expect(ticketIds).not.toContain(ticketBId);

    // 4. Attacker attempts unauthenticated ticket listing with only x-requester-id -> rejected 401 UNAUTHENTICATED
    const unauthenticatedBypass = await request(app)
      .get("/api/tickets")
      .set("x-requester-id", userA.id.toString());
    expect(unauthenticatedBypass.status).toBe(401);
    expect(unauthenticatedBypass.body.error.code).toBe("UNAUTHENTICATED");
    expect(unauthenticatedBypass.body.error.message).toBe("Authentication token is required.");

    // 5. Attacker attempts unauthenticated ticket creation with only x-requester-id -> rejected 401 UNAUTHENTICATED
    const unauthenticatedPost = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", userA.id.toString())
      .send({
        categoryId: category!.id,
        relatedSystemId: system!.id,
        summary: "Bypass Attempt",
        description: "Trying to create ticket without token.",
        requestedPriority: "LOW",
      });
    expect(unauthenticatedPost.status).toBe(401);
    expect(unauthenticatedPost.body.error.code).toBe("UNAUTHENTICATED");
  });

  // -------------------------------------------------------------------------
  // API-10: Lab 2 Requester regression under auth (FR-08, BR-24)
  // -------------------------------------------------------------------------
  it("API-10: allows authenticated requester to create tickets, view owned tickets, and manage attachments under JWT auth", async () => {
    const defaultHash = await bcrypt.hash("Password123!", 10);
    const user = await getPrisma().user.upsert({
      where: { email: "regression.requester@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false },
      create: {
        name: "Regression Requester",
        email: "regression.requester@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({ email: "regression.requester@example.com", password: "Password123!" });
    const token = loginRes.body.token;

    const category = await getPrisma().category.findFirst();
    const system = await getPrisma().relatedSystem.findFirst({ where: { isActive: true } });

    // 1. Create Ticket under auth
    const createRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${token}`)
      .send({
        categoryId: category!.id,
        relatedSystemId: system!.id,
        summary: "Regression Ticket under JWT Auth",
        description: "Testing end to end requester ticket creation under auth token.",
        requestedPriority: "URGENT",
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.requesterId).toBe(user.id);
    expect(createRes.body.requestedPriority).toBe("URGENT");
    expect(createRes.body.itPriority).toBe("URGENT"); // Handout §4.5: initial copy
    expect(createRes.body.currentStatus).toBe("NEW");
    const newTicketId = createRes.body.id;

    // 2. Fetch owned tickets under auth
    const myTicketsRes = await request(app)
      .get("/api/tickets")
      .set("Authorization", `Bearer ${token}`);
    expect(myTicketsRes.status).toBe(200);
    const myIds = myTicketsRes.body.data.map((t: any) => t.id);
    expect(myIds).toContain(newTicketId);

    // 3. Upload attachment under auth (PDF is an allowed type)
    const uploadRes = await request(app)
      .post(`/api/tickets/${newTicketId}/attachments`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("%PDF-1.4 sample auth attachment file content"), "auth_test.pdf");
    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.id;
    expect(uploadRes.body.originalName).toBe("auth_test.pdf");

    // 4. Download attachment under auth
    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("Authorization", `Bearer ${token}`);
    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers["content-disposition"]).toContain("auth_test.pdf");

    // 5. Soft-remove attachment under auth
    const removeRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ removalReason: "Uploaded wrong file version" });
    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);
  });
});

