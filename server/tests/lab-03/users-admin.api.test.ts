import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Administrator User Management API Tests (API-20..25)", () => {
  let adminToken: string;
  let adminUser: any;
  let staffToken: string;
  let requesterToken: string;
  let mustChangePasswordToken: string;

  afterAll(async () => {
    // Ensure standard seeded accounts remain active for other test suites
    await getPrisma().user.updateMany({
      where: { email: { in: ["john.smith@toktickit.com", "admin.manager@toktickit.com"] } },
      data: { isActive: true },
    });
  });

  beforeAll(async () => {
    const prisma = getPrisma();
    const defaultHash = await bcrypt.hash("Password123!", 10);

    // 1. Create/upsert admin user
    adminUser = await prisma.user.upsert({
      where: { email: "admin.manager@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "ADMINISTRATOR" },
      create: {
        name: "Admin Manager",
        email: "admin.manager@toktickit.com",
        passwordHash: defaultHash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // 2. Create/upsert staff user
    await prisma.user.upsert({
      where: { email: "admin.test.staff@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Admin Test Staff",
        email: "admin.test.staff@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // 3. Create/upsert requester user
    await prisma.user.upsert({
      where: { email: "admin.test.requester@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Admin Test Requester",
        email: "admin.test.requester@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // 4. Create/upsert mustChange user
    await prisma.user.upsert({
      where: { email: "admin.test.mustchange@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: true, role: "ADMINISTRATOR" },
      create: {
        name: "Admin Test MustChange",
        email: "admin.test.mustchange@toktickit.com",
        passwordHash: defaultHash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: true,
      },
    });

    // Obtain tokens
    const adminLogin = await request(app).post("/api/auth/login").send({ email: "admin.manager@toktickit.com", password: "Password123!" });
    adminToken = adminLogin.body.token;

    const staffLogin = await request(app).post("/api/auth/login").send({ email: "admin.test.staff@toktickit.com", password: "Password123!" });
    staffToken = staffLogin.body.token;

    const reqLogin = await request(app).post("/api/auth/login").send({ email: "admin.test.requester@example.com", password: "Password123!" });
    requesterToken = reqLogin.body.token;

    const mustChangeLogin = await request(app).post("/api/auth/login").send({ email: "admin.test.mustchange@toktickit.com", password: "Password123!" });
    mustChangePasswordToken = mustChangeLogin.body.token;
  });

  describe("API-25 & FR-07: Authorization & RBAC for Admin Endpoints", () => {
    it("rejects unauthenticated requests with 401 Unauthorized", async () => {
      const res = await request(app).get("/api/admin/users");
      expect(res.status).toBe(401);
    });

    it("rejects Requester access with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${requesterToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("rejects IT Staff access with 403 Forbidden", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${staffToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("FORBIDDEN");
    });

    it("blocks Admin requiring password change with 403 PASSWORD_CHANGE_REQUIRED", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${mustChangePasswordToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error?.code).toBe("PASSWORD_CHANGE_REQUIRED");
    });

    it("allows authenticated Administrator to access /api/admin/users", async () => {
      const res = await request(app)
        .get("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      // Verify safe fields; never leak passwordHash
      for (const u of res.body) {
        expect(u.id).toBeDefined();
        expect(u.name).toBeDefined();
        expect(u.email).toBeDefined();
        expect(u.role).toBeDefined();
        expect(u.passwordHash).toBeUndefined();
      }
    });
  });

  const runId = Date.now();

  describe("API-20: Administrator Creates User (AC-13, FR-18)", () => {
    it("creates a new user with initial password and marks mustChangePassword = true", async () => {
      const email = `alice.engineer.${runId}@toktickit.com`;
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Alice Engineer",
          email,
          role: "IT_STAFF",
          isActive: true,
          initialPassword: "InitialSecret123!",
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe("Alice Engineer");
      expect(res.body.email).toBe(email);
      expect(res.body.role).toBe("IT_STAFF");
      expect(res.body.isActive).toBe(true);
      expect(res.body.mustChangePassword).toBe(true);
      expect(res.body.passwordHash).toBeUndefined();

      // Verify in DB that password is encrypted and can be authenticated
      const userInDb = await getPrisma().user.findUnique({
        where: { id: res.body.id },
      });
      expect(userInDb?.mustChangePassword).toBe(true);
      const isMatch = await bcrypt.compare("InitialSecret123!", userInDb!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it("rejects initial password that fails password complexity rules (BR-07)", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Weak Password User",
          email: `weak.user.${runId}@example.com`,
          role: "REQUESTER",
          isActive: true,
          initialPassword: "weak", // less than 8 chars, missing upper/number
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("INVALID_INPUT");
      expect(res.body.error.details).toBeDefined();
    });

    it("rejects creation if name is empty or role is invalid", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "   ",
          email: `noname.${runId}@example.com`,
          role: "IT_STAFF",
          initialPassword: "ValidPassword123!",
        });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_INPUT");
    });
  });

  describe("API-21: Duplicate Email Rejection (BR-20)", () => {
    it("rejects creating user with an existing email with 409 DUPLICATE_EMAIL", async () => {
      const res = await request(app)
        .post("/api/admin/users")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({
          name: "Duplicate User",
          email: "admin.manager@toktickit.com", // existing email
          role: "REQUESTER",
          initialPassword: "Password123!",
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("DUPLICATE_EMAIL");
      expect(res.body.error.message).toContain("already exists");
    });

    it("rejects editing user to an email that belongs to another user with 409 DUPLICATE_EMAIL", async () => {
      // Create user A
      const userA = await getPrisma().user.create({
        data: {
          name: "User A",
          email: `usera.${runId}@example.com`,
          passwordHash: "hash",
          role: "REQUESTER",
        },
      });

      // Try updating adminUser to userA's email
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ email: `usera.${runId}@example.com` });

      expect(res.status).toBe(409);
      expect(res.body.error?.code).toBe("DUPLICATE_EMAIL");
    });
  });

  describe("API-22: Prevent Administrator Self-Deactivation (AC-14, BR-21)", () => {
    it("rejects an Administrator attempting to deactivate their own account with 400 ADMIN_SAFETY_VIOLATION", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
      expect(res.body.error.code).toBe("ADMIN_SAFETY_VIOLATION");
      expect(res.body.error.message).toContain("cannot deactivate their own account");
    });

    it("allows an Administrator to edit their own name without deactivation", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${adminUser.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ name: "Admin Manager Updated" });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Admin Manager Updated");
    });
  });

  describe("API-23: Prevent Removing or Deactivating Last Active Administrator (AC-15, BR-22)", () => {
    let solitaryAdmin: any;
    let secondaryAdmin: any;

    beforeAll(async () => {
      const prisma = getPrisma();
      const defaultHash = await bcrypt.hash("Password123!", 10);

      secondaryAdmin = await prisma.user.create({
        data: {
          name: "Secondary Admin",
          email: `secondary.admin.${runId}@toktickit.com`,
          passwordHash: defaultHash,
          role: "ADMINISTRATOR",
          isActive: true,
          mustChangePassword: false,
        },
      });
    });

    it("allows deactivating an administrator when multiple active administrators exist", async () => {
      const res = await request(app)
        .patch(`/api/admin/users/${secondaryAdmin.id}`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ isActive: false });

      expect(res.status).toBe(200);
      expect(res.body.isActive).toBe(false);
    });

    it("rejects demoting the last active Administrator in the system with 400 ADMIN_SAFETY_VIOLATION", async () => {
      const prisma = getPrisma();
      // Ensure only adminUser is currently active among ADMINISTRATORs
      const deactivatedAdmins = await prisma.user.findMany({
        where: {
          role: "ADMINISTRATOR",
          isActive: true,
          id: { not: adminUser.id },
        },
        select: { id: true },
      });
      const deactivatedIds = deactivatedAdmins.map((u) => u.id);

      try {
        await prisma.user.updateMany({
          where: { id: { in: deactivatedIds } },
          data: { isActive: false },
        });

        // Attempt to demote the sole active administrator to IT_STAFF
        const res = await request(app)
          .patch(`/api/admin/users/${adminUser.id}`)
          .set("Authorization", `Bearer ${adminToken}`)
          .send({ role: "IT_STAFF" });

        expect(res.status).toBe(400);
        expect(res.body.error?.code).toBe("ADMIN_SAFETY_VIOLATION");
        expect(res.body.error?.message).toContain("last active Administrator");
      } finally {
        // Restore deactivated admins
        if (deactivatedIds.length > 0) {
          await prisma.user.updateMany({
            where: { id: { in: deactivatedIds } },
            data: { isActive: true },
          });
        }
      }
    });
  });

  describe("API-24: Administrator Sets New Initial Password (AC-16, FR-20)", () => {
    let targetUser: any;

    beforeAll(async () => {
      const prisma = getPrisma();
      targetUser = await prisma.user.create({
        data: {
          name: "Target Reset User",
          email: `target.reset.${runId}@example.com`,
          passwordHash: "oldhash",
          role: "REQUESTER",
          isActive: true,
          mustChangePassword: false, // initially false
        },
      });
    });

    it("sets new initial password and forces mustChangePassword = true", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUser.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "NewTempPassword456!" });

      expect(res.status).toBe(200);
      expect(res.body.mustChangePassword).toBe(true);
      expect(res.body.userId).toBe(targetUser.id);
      expect(res.body.message).toContain("New initial password set");

      // Verify in DB
      const updatedInDb = await getPrisma().user.findUnique({
        where: { id: targetUser.id },
      });
      expect(updatedInDb?.mustChangePassword).toBe(true);
      const isMatch = await bcrypt.compare("NewTempPassword456!", updatedInDb!.passwordHash);
      expect(isMatch).toBe(true);
    });

    it("rejects password reset with weak password failing complexity", async () => {
      const res = await request(app)
        .post(`/api/admin/users/${targetUser.id}/reset-password`)
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "weak" });

      expect(res.status).toBe(400);
      expect(res.body.error?.code).toBe("INVALID_INPUT");
    });

    it("returns 404 if target user does not exist", async () => {
      const res = await request(app)
        .post("/api/admin/users/999999/reset-password")
        .set("Authorization", `Bearer ${adminToken}`)
        .send({ newInitialPassword: "NewTempPassword456!" });

      expect(res.status).toBe(404);
    });
  });

  describe("GET /api/admin/users (Search & Role Filtering)", () => {
    it("filters users by keyword search matching name or email", async () => {
      const res = await request(app)
        .get("/api/admin/users?search=Alice")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body.some((u: any) => u.name.includes("Alice"))).toBe(true);
    });

    it("filters users by role", async () => {
      const res = await request(app)
        .get("/api/admin/users?role=ADMINISTRATOR")
        .set("Authorization", `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      for (const u of res.body) {
        expect(u.role).toBe("ADMINISTRATOR");
      }
    });
  });
});
