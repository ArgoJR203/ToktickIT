import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 4 Actions Taken Backend REST API Integration Tests
 *
 * Covers:
 * - API-01: Requester retrieves Actions Taken on owned ticket (200 OK, BR-09)
 * - API-02: Requester non-owned ticket authorization protection (403 Forbidden, BR-21)
 * - API-03: Create valid Action Taken by IT Staff (201 Created, Handout §10 exact, AC-01)
 * - API-04: Multi-staff collaboration on Action Taken (201 Created, BR-02, AC-04)
 * - API-05: Actions Taken description/result validation (400 Bad Request, BR-04)
 * - API-06: Conditional follow-up note validation (400 Bad Request, BR-05, AC-05)
 * - API-07: Requester forbidden from creating Action Taken (403 Forbidden, BR-09, AC-06)
 * - API-08: Update Action Taken & atomic OCC 409 conflict check (200 OK / 409 Conflict, BR-14, FR-08, AC-08)
 * - API-18: Performer spoofing protection (BR-03)
 * - API-19: Content length boundaries (2000 chars accepted, 2001 chars rejected)
 * - API-20: Planned future action date acceptance (201 Created, BR-04)
 * - API-21: Inactive assignee rejection (400 Bad Request, INACTIVE_ASSIGNEE, BR-07, AC-15)
 */

describe("Lab 4 Actions Taken REST API Integration Tests (API-01..08, API-18..21)", () => {
  let requester1Token: string;
  let requester2Token: string;
  let staff1Token: string;
  let staff2Token: string;
  let adminToken: string;

  let requesterUser1: any;
  let requesterUser2: any;
  let staffUser1: any;
  let staffUser2: any;
  let inactiveStaffUser: any;
  let adminUser: any;

  let testCategory: any;
  let testSystem: any;
  let ticketUser1: any;
  let ticketUser2: any;

  beforeAll(async () => {
    const prisma = getPrisma();
    const defaultHash = await bcrypt.hash("Password123!", 10);

    // 1. Fetch system & category
    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true, categoryId: { not: null } },
      include: { category: true },
    });
    if (!system || !system.category) {
      throw new Error("Seeded system and category required for tests");
    }
    testSystem = system;
    testCategory = system.category;

    // 2. Setup users
    requesterUser1 = await prisma.user.upsert({
      where: { email: "action.req1@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Action Requester One",
        email: "action.req1@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    requesterUser2 = await prisma.user.upsert({
      where: { email: "action.req2@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Action Requester Two",
        email: "action.req2@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser1 = await prisma.user.upsert({
      where: { email: "action.staff1@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Action Staff One",
        email: "action.staff1@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser2 = await prisma.user.upsert({
      where: { email: "action.staff2@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Action Staff Two",
        email: "action.staff2@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    inactiveStaffUser = await prisma.user.upsert({
      where: { email: "action.staff.inactive@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: false, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Inactive Action Staff",
        email: "action.staff.inactive@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: false,
        mustChangePassword: false,
      },
    });

    adminUser = await prisma.user.upsert({
      where: { email: "action.admin@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "ADMINISTRATOR" },
      create: {
        name: "Action Admin",
        email: "action.admin@toktickit.com",
        passwordHash: defaultHash,
        role: "ADMINISTRATOR",
        isActive: true,
        mustChangePassword: false,
      },
    });

    // 3. Obtain authentication tokens
    const r1Login = await request(app).post("/api/auth/login").send({ email: "action.req1@example.com", password: "Password123!" });
    requester1Token = r1Login.body.token;

    const r2Login = await request(app).post("/api/auth/login").send({ email: "action.req2@example.com", password: "Password123!" });
    requester2Token = r2Login.body.token;

    const s1Login = await request(app).post("/api/auth/login").send({ email: "action.staff1@toktickit.com", password: "Password123!" });
    staff1Token = s1Login.body.token;

    const s2Login = await request(app).post("/api/auth/login").send({ email: "action.staff2@toktickit.com", password: "Password123!" });
    staff2Token = s2Login.body.token;

    const admLogin = await request(app).post("/api/auth/login").send({ email: "action.admin@toktickit.com", password: "Password123!" });
    adminToken = admLogin.body.token;

    // 4. Create sample tickets
    ticketUser1 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-01`,
        requesterId: requesterUser1.id,
        ownerId: staffUser1.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        summary: "Ticket 1 for Requester 1",
        description: "Testing actions taken isolation and workflows",
        requestedPriority: "HIGH",
        itPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
      },
    });

    ticketUser2 = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-${Date.now()}-02`,
        requesterId: requesterUser2.id,
        ownerId: staffUser2.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        summary: "Ticket 2 for Requester 2",
        description: "Testing non-owned actions taken security isolation",
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        currentStatus: "OPEN",
      },
    });
  });

  // ---------------------------------------------------------------------------
  // API-03: Create valid Action Taken by IT Staff (Handout §10 exact / AC-01)
  // ---------------------------------------------------------------------------
  it("API-03: creates a valid Action Taken by IT Staff with auto-populated performer and approved assignee (AC-01)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Replaced faulty optical transceiver on rack switch",
        result: "Port link status active, 10Gbps link negotiation confirmed",
        status: "COMPLETED",
        assigneeId: staffUser1.id,
        followUpRequired: false,
        attachmentNotes: "transceiver_specs.pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketId).toBe(ticketUser1.id);
    expect(res.body.performedById).toBe(staffUser1.id);
    expect(res.body.performedBy.name).toBe("Action Staff One");
    expect(res.body.assigneeId).toBe(staffUser1.id);
    expect(res.body.assignee.name).toBe("Action Staff One");
    expect(res.body.status).toBe("COMPLETED");
    expect(res.body.version).toBe(1);
    expect(res.body.followUpRequired).toBe(false);
    expect(res.body.followUpDone).toBe(false);
    expect(res.body.attachmentNotes).toBe("transceiver_specs.pdf");
  });

  // ---------------------------------------------------------------------------
  // API-01: Requester views Actions Taken on owned ticket (BR-09)
  // ---------------------------------------------------------------------------
  it("API-01: retrieves Actions Taken list for owned ticket by Requester (200 OK, BR-09)", async () => {
    const res = await request(app)
      .get(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${requester1Token}`);

    expect(res.status).toBe(200);
    expect(res.body.ticketId).toBe(ticketUser1.id);
    expect(Array.isArray(res.body.actionsTaken)).toBe(true);
    expect(res.body.actionsTaken.length).toBeGreaterThanOrEqual(1);

    const firstAction = res.body.actionsTaken[0];
    expect(firstAction).toHaveProperty("description");
    expect(firstAction).toHaveProperty("result");
    expect(firstAction).toHaveProperty("performedBy");
  });

  // ---------------------------------------------------------------------------
  // API-02: Requester non-owned ticket authorization protection (BR-21)
  // ---------------------------------------------------------------------------
  it("API-02: returns 403 Forbidden when Requester accesses actions for non-owned ticket (BR-21)", async () => {
    // Requester 2 attempts to view actions on ticket owned by Requester 1
    const res = await request(app)
      .get(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${requester2Token}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
    expect(res.body.error.message).toContain("permission");
  });

  it("API-02 (non-existent): returns 404 Not Found when ticket ID does not exist in database", async () => {
    const res = await request(app)
      .get("/api/tickets/999999/actions-taken")
      .set("Authorization", `Bearer ${requester1Token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  // ---------------------------------------------------------------------------
  // API-04: Multi-staff collaboration on Action Taken (BR-02, AC-04)
  // ---------------------------------------------------------------------------
  it("API-04: allows Staff Member B to log an Action Taken on a ticket owned by Staff Member A (AC-04)", async () => {
    // ticketUser1 is owned by staffUser1. staffUser2 logs action.
    const res = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff2Token}`)
      .send({
        description: "Assisted with secondary cable dressing and labeling",
        result: "Cables dressed cleanly into patch panel channel",
        status: "COMPLETED",
        assigneeId: staffUser2.id,
      });

    expect(res.status).toBe(201);
    expect(res.body.performedById).toBe(staffUser2.id);
    expect(res.body.performedBy.email).toBe("action.staff2@toktickit.com");
  });

  // ---------------------------------------------------------------------------
  // API-05: Actions Taken description/result validation (BR-04)
  // ---------------------------------------------------------------------------
  it("API-05: rejects empty description or result with 400 Bad Request (BR-04)", async () => {
    const emptyDesc = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "   ",
        result: "Some result",
      });
    expect(emptyDesc.status).toBe(400);
    expect(emptyDesc.body.error.code).toBe("INVALID_INPUT");

    const emptyResult = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Valid description",
        result: "",
      });
    expect(emptyResult.status).toBe(400);
    expect(emptyResult.body.error.code).toBe("INVALID_INPUT");
  });

  // ---------------------------------------------------------------------------
  // API-06: Conditional follow-up note validation (BR-05, AC-05)
  // ---------------------------------------------------------------------------
  it("API-06: rejects missing follow-up note when followUpRequired is true (AC-05 / BR-05)", async () => {
    const missingNote = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Inspected core switch temperature sensors",
        result: "Fan #3 operating at 95% speed due to dust accumulation",
        followUpRequired: true,
        // followUpNote omitted
      });

    expect(missingNote.status).toBe(400);
    expect(missingNote.body.error.code).toBe("INVALID_INPUT");
    expect(missingNote.body.error.message).toContain("Follow-up note is required");

    // Success when followUpNote is provided
    const validWithNote = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Inspected core switch temperature sensors",
        result: "Fan #3 operating at 95% speed due to dust accumulation",
        followUpRequired: true,
        followUpNote: "Order replacement fan assembly module",
      });

    expect(validWithNote.status).toBe(201);
    expect(validWithNote.body.followUpRequired).toBe(true);
    expect(validWithNote.body.followUpNote).toBe("Order replacement fan assembly module");
  });

  // ---------------------------------------------------------------------------
  // API-07: Requester forbidden from creating Action Taken (BR-09, AC-06)
  // ---------------------------------------------------------------------------
  it("API-07: rejects Requester attempting to create an Action Taken with 403 Forbidden (AC-06 / BR-09)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${requester1Token}`)
      .send({
        description: "Requester trying to log an action",
        result: "Should fail with 403",
      });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe("FORBIDDEN");
  });

  // ---------------------------------------------------------------------------
  // API-08: Update Action Taken & atomic OCC 409 conflict check (BR-14, FR-08, AC-08)
  // ---------------------------------------------------------------------------
  it("API-08: updates Action Taken and enforces atomic OCC stale-update rejection (AC-08 / BR-14 / FR-08)", async () => {
    // 1. Create an action to update
    const createRes = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Initial diagnostic scan",
        result: "Scan running in background",
        status: "IN_PROGRESS",
        followUpRequired: true,
        followUpNote: "Review results once complete",
      });

    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const initialVersion = createRes.body.version; // version = 1

    // 2. Successful update with matching version
    const patchRes = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        status: "COMPLETED",
        result: "Scan finished with zero critical errors",
        followUpDone: true,
        version: initialVersion, // version 1
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe("COMPLETED");
    expect(patchRes.body.followUpDone).toBe(true);
    expect(patchRes.body.version).toBe(2);
    expect(patchRes.body.updatedById).toBe(staffUser1.id);

    // 3. Stale update attempt using outdated version (version 1 when DB is version 2)
    const staleRes = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${staff2Token}`)
      .send({
        result: "Trying to overwrite with stale data",
        version: 1, // Stale!
      });

    expect(staleRes.status).toBe(409);
    expect(staleRes.body.error.code).toBe("STALE_UPDATE");
    expect(staleRes.body).toHaveProperty("currentAction");
    expect(staleRes.body.currentAction.version).toBe(2);
  });

  // ---------------------------------------------------------------------------
  // API-18: Performer spoofing protection (BR-03)
  // ---------------------------------------------------------------------------
  it("API-18: ignores client-supplied performedById and authoritatively assigns session user (BR-03)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Spoofing test action",
        result: "Server must assign staff1, not admin",
        performedById: adminUser.id, // Attempting to spoof admin!
      });

    expect(res.status).toBe(201);
    expect(res.body.performedById).toBe(staffUser1.id); // Must be staffUser1, NOT adminUser
    expect(res.body.performedBy.id).toBe(staffUser1.id);
  });

  // ---------------------------------------------------------------------------
  // API-19: Content length boundary testing
  // ---------------------------------------------------------------------------
  it("API-19: accepts exactly 2000 characters and rejects 2001 characters (BR-04)", async () => {
    const chars2000 = "B".repeat(2000);
    const chars2001 = "B".repeat(2001);

    const validRes = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: chars2000,
        result: chars2000,
      });
    expect(validRes.status).toBe(201);

    const invalidRes = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: chars2001,
        result: "Standard result",
      });
    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error.code).toBe("FIELD_TOO_LONG");
  });

  // ---------------------------------------------------------------------------
  // API-20: Planned future action date acceptance (BR-04)
  // ---------------------------------------------------------------------------
  it("API-20: accepts future actionDateTime for planned work scheduling (BR-04)", async () => {
    const futureDate = new Date(Date.now() + 7 * 86400000).toISOString(); // 7 days in future

    const res = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Scheduled maintenance window for core router firmware upgrade",
        result: "Maintenance scheduled, awaiting service window",
        status: "PENDING",
        actionDateTime: futureDate,
      });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe("PENDING");
    expect(new Date(res.body.actionDateTime).getTime()).toBe(new Date(futureDate).getTime());
  });

  // ---------------------------------------------------------------------------
  // API-21: Inactive assignee rejection (BR-07, AC-15)
  // ---------------------------------------------------------------------------
  it("API-21: rejects assigning an inactive staff user with 400 Bad Request (INACTIVE_ASSIGNEE, AC-15)", async () => {
    const res = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Assigned action test",
        result: "Should fail due to inactive assignee",
        assigneeId: inactiveStaffUser.id,
      });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INACTIVE_ASSIGNEE");
    expect(res.body.error.message).toContain("inactive");
  });

  // ---------------------------------------------------------------------------
  // Additional Edge-Case & Feedback Tests
  // ---------------------------------------------------------------------------
  it("API-07b: rejects Requester attempting to edit/PATCH an Action Taken with 403 Forbidden (AC-06 / BR-09)", async () => {
    // Staff creates an action first
    const createRes = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Action to test Requester edit block",
        result: "Staff execution",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;

    // Requester attempts to PATCH the action
    const patchRes = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${requester1Token}`)
      .send({
        result: "Requester trying to tamper with action",
      });

    expect(patchRes.status).toBe(403);
  });

  it("API-AUTH: rejects unauthenticated requests with 401 Unauthorized across endpoints", async () => {
    const getRes = await request(app).get(`/api/tickets/${ticketUser1.id}/actions-taken`);
    expect(getRes.status).toBe(401);

    const postRes = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .send({ description: "Test", result: "Test" });
    expect(postRes.status).toBe(401);

    const patchRes = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/1`)
      .send({ result: "Test" });
    expect(patchRes.status).toBe(401);
  });

  it("API-CROSS: returns 404 Not Found when PATCHing an action belonging to a different ticket", async () => {
    // Create action under ticketUser2
    const createRes = await request(app)
      .post(`/api/tickets/${ticketUser2.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff2Token}`)
      .send({
        description: "Action under ticket 2",
        result: "Done",
      });
    expect(createRes.status).toBe(201);
    const actionUnderTicket2 = createRes.body.id;

    // Attempt to PATCH that action under ticketUser1
    const patchRes = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/${actionUnderTicket2}`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        result: "Cross-ticket update attempt",
      });

    expect(patchRes.status).toBe(404);
    expect(patchRes.body.error.code).toBe("NOT_FOUND");
    expect(patchRes.body.error.message).toContain("not found under this ticket");
  });

  it("API-UNVERSIONED: increments version when PATCHing without providing version field", async () => {
    const createRes = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Unversioned patch test",
        result: "Initial state",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const initialVersion = createRes.body.version; // 1

    const patchRes = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        result: "Updated state without explicit version",
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.version).toBe(initialVersion + 1);
  });

  it("API-PATCH-FOLLOWUP: allows PATCH with followUpRequired: true and followUpDone: true without resending followUpNote (Issue 1 / api-spec §3.3)", async () => {
    // 1. Create action with existing followUpNote
    const createRes = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Power unit replacement diagnostic",
        result: "Initial diagnostics ok",
        status: "IN_PROGRESS",
        followUpRequired: true,
        followUpNote: "Verify continuous 24h stability curve",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;
    const initialVersion = createRes.body.version;

    // 2. PATCH matching api-spec §3.3 example payload exactly (no followUpNote passed)
    const patchRes = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        status: "COMPLETED",
        result: "Telemetry confirmed normal power draw and stable discharge curve.",
        followUpRequired: true,
        followUpDone: true,
        version: initialVersion,
      });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.status).toBe("COMPLETED");
    expect(patchRes.body.followUpDone).toBe(true);
    expect(patchRes.body.followUpRequired).toBe(true);
    expect(patchRes.body.followUpNote).toBe("Verify continuous 24h stability curve"); // Preserved!
  });

  it("API-PATCH-INACTIVE: rejects PATCH updating assignee to an inactive user with 400 Bad Request (INACTIVE_ASSIGNEE)", async () => {
    const createRes = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Test action for assignee update",
        result: "Initial state",
      });
    expect(createRes.status).toBe(201);
    const actionId = createRes.body.id;

    const patchRes = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/${actionId}`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        assigneeId: inactiveStaffUser.id,
      });

    expect(patchRes.status).toBe(400);
    expect(patchRes.body.error.code).toBe("INACTIVE_ASSIGNEE");
  });

  it("API-PRIVACY: omits staff emails from GET /actions-taken for Requester role while including for IT Staff", async () => {
    // 1. Requester GET
    const reqRes = await request(app)
      .get(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${requester1Token}`);

    expect(reqRes.status).toBe(200);
    expect(reqRes.body.actionsTaken.length).toBeGreaterThan(0);
    const reqAction = reqRes.body.actionsTaken[0];
    expect(reqAction.performedBy).toHaveProperty("name");
    expect(reqAction.performedBy).not.toHaveProperty("email");
    if (reqAction.assignee) {
      expect(reqAction.assignee).toHaveProperty("name");
      expect(reqAction.assignee).not.toHaveProperty("email");
    }

    // 2. Staff GET
    const staffRes = await request(app)
      .get(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`);

    expect(staffRes.status).toBe(200);
    const staffAction = staffRes.body.actionsTaken[0];
    expect(staffAction.performedBy).toHaveProperty("email");
    if (staffAction.assignee) {
      expect(staffAction.assignee).toHaveProperty("email");
    }
  });

  it("API-STRICT-ID: rejects non-numeric or alphanumeric IDs with 400 Bad Request", async () => {
    const alphaTicket = await request(app)
      .get("/api/tickets/12abc/actions-taken")
      .set("Authorization", `Bearer ${staff1Token}`);
    expect(alphaTicket.status).toBe(400);
    expect(alphaTicket.body.error.code).toBe("INVALID_INPUT");

    const alphaAction = await request(app)
      .patch(`/api/tickets/${ticketUser1.id}/actions-taken/99xyz`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({ result: "Test" });
    expect(alphaAction.status).toBe(400);
    expect(alphaAction.body.error.code).toBe("INVALID_INPUT");

    const alphaAssignee = await request(app)
      .post(`/api/tickets/${ticketUser1.id}/actions-taken`)
      .set("Authorization", `Bearer ${staff1Token}`)
      .send({
        description: "Test",
        result: "Test",
        assigneeId: "12abc",
      });
    expect(alphaAssignee.status).toBe(400);
    expect(alphaAssignee.body.error.code).toBe("INVALID_INPUT");
  });
});

