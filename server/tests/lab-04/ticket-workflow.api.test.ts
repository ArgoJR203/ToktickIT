import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

/**
 * Lab 4 Ticket Workflow & Optimistic Concurrency API Tests
 *
 * Covers:
 * - API-09: Valid status transition OPEN -> IN_PROGRESS with incremented version (200 OK, BR-11)
 * - API-10: Invalid status jump rejection NEW -> RESOLVED (400 Bad Request, INVALID_TRANSITION, BR-11, AC-07)
 * - API-11: Atomic optimistic concurrency collision (409 Conflict, STALE_UPDATE, BR-14, AC-08)
 * - API-12: Mandatory resolution summary on RESOLVED / CLOSED (400 Bad Request, MISSING_RESOLUTION_SUMMARY, BR-13, AC-09)
 * - API-13: Requester advisory resolution indication (200 OK, BR-12, AC-03)
 * - API-22: Action completion resolution gate (400 Bad Request, INCOMPLETE_ACTIONS_TAKEN, BR-20, AC-16)
 */

describe("Lab 4 Ticket Workflow & Concurrency REST API Integration Tests (API-09..13, API-22)", () => {
  let requesterToken: string;
  let otherRequesterToken: string;
  let staffToken: string;

  let requesterUser: any;
  let otherRequesterUser: any;
  let staffUser: any;

  let testCategory: any;
  let testSystem: any;

  beforeAll(async () => {
    const prisma = getPrisma();
    const defaultHash = await bcrypt.hash("Password123!", 10);

    const system = await prisma.relatedSystem.findFirst({
      where: { isActive: true, categoryId: { not: null } },
      include: { category: true },
    });
    if (!system || !system.category) {
      throw new Error("Seeded system and category required for tests");
    }
    testSystem = system;
    testCategory = system.category;

    requesterUser = await prisma.user.upsert({
      where: { email: "wf.req@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Workflow Requester",
        email: "wf.req@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    otherRequesterUser = await prisma.user.upsert({
      where: { email: "wf.other@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "REQUESTER" },
      create: {
        name: "Workflow Other Requester",
        email: "wf.other@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });

    staffUser = await prisma.user.upsert({
      where: { email: "wf.staff@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false, role: "IT_STAFF" },
      create: {
        name: "Workflow Staff",
        email: "wf.staff@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });

    const rLogin = await request(app).post("/api/auth/login").send({ email: "wf.req@example.com", password: "Password123!" });
    requesterToken = rLogin.body.token;

    const oLogin = await request(app).post("/api/auth/login").send({ email: "wf.other@example.com", password: "Password123!" });
    otherRequesterToken = oLogin.body.token;

    const sLogin = await request(app).post("/api/auth/login").send({ email: "wf.staff@toktickit.com", password: "Password123!" });
    staffToken = sLogin.body.token;
  });

  async function createTestTicket(overrides: Record<string, any> = {}) {
    return getPrisma().ticket.create({
      data: {
        ticketNumber: `TKT-WF-${Date.now()}-${Math.floor(Math.random() * 100000)}`,
        requesterId: requesterUser.id,
        ownerId: staffUser.id,
        categoryId: testCategory.id,
        relatedSystemId: testSystem.id,
        requestedPriority: "MEDIUM",
        itPriority: "MEDIUM",
        summary: "Test workflow ticket",
        description: "Testing ticket workflow and transitions",
        currentStatus: "OPEN",
        version: 1,
        ...overrides,
      },
    });
  }

  describe("API-09: Permitted Ticket Status Transitions (BR-11)", () => {
    it("advances status from OPEN to IN_PROGRESS and increments version", async () => {
      const ticket = await createTestTicket({ currentStatus: "OPEN", version: 1 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "IN_PROGRESS",
          version: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("IN_PROGRESS");
      expect(res.body.version).toBe(2);
      expect(res.body.permittedNextStatuses).toContain("WAITING_FOR_REQUESTER");
      expect(res.body.permittedNextStatuses).toContain("RESOLVED");
      expect(res.body.permittedNextStatuses).toContain("CANCELLED");

      // Verify DB persistence
      const inDb = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
      expect(inDb?.currentStatus).toBe("IN_PROGRESS");
      expect(inDb?.version).toBe(2);
    });

    it("accepts currentStatus alias in request payload for backward compatibility", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS", version: 1 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          currentStatus: "WAITING_FOR_REQUESTER",
          version: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("WAITING_FOR_REQUESTER");
      expect(res.body.version).toBe(2);
    });
  });

  describe("API-10: Illegal Status Jump Rejection (BR-11, AC-07)", () => {
    it("rejects illegal skip from NEW directly to RESOLVED", async () => {
      const ticket = await createTestTicket({ currentStatus: "NEW", version: 1 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Attempted skip directly to resolved",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_TRANSITION");
      expect(res.body.error.message).toContain("Status transition from 'NEW' to 'RESOLVED' is not permitted");

      // Verify ticket state remains untouched
      const inDb = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
      expect(inDb?.currentStatus).toBe("NEW");
    });

    it("rejects invalid status enum strings with 400 INVALID_INPUT", async () => {
      const ticket = await createTestTicket({ currentStatus: "OPEN", version: 1 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "COMPLETED_UNKNOWN",
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("API-11: Atomic Optimistic Concurrency Control (OCC) (BR-14, AC-08)", () => {
    it("rejects update when submitted version does not match current version (STALE_UPDATE)", async () => {
      const ticket = await createTestTicket({ currentStatus: "OPEN", version: 2 });

      // Client submits obsolete version = 1
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "IN_PROGRESS",
          version: 1,
        });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("STALE_UPDATE");
      expect(res.body.error.message).toContain("modified by another user");
      expect(res.body.currentTicket).toBeDefined();
      expect(res.body.currentTicket.id).toBe(ticket.id);
      expect(res.body.currentTicket.version).toBe(2);

      // Verify state was not modified
      const inDb = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
      expect(inDb?.currentStatus).toBe("OPEN");
      expect(inDb?.version).toBe(2);
    });

    it("rejects update with 409 STALE_UPDATE before checking transition or resolution summary when version is stale", async () => {
      // Ticket was cancelled by another user, version is now 5
      const ticket = await createTestTicket({ currentStatus: "CANCELLED", version: 5 });

      // Client submits obsolete version = 1 with invalid transition (CANCELLED -> RESOLVED) and missing resolution summary
      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          version: 1,
        });

      // OCC check must fire first and return 409 Conflict, NOT 400 INVALID_TRANSITION or MISSING_RESOLUTION_SUMMARY
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe("STALE_UPDATE");
      expect(res.body.currentTicket).toBeDefined();
      expect(res.body.currentTicket.id).toBe(ticket.id);
      expect(res.body.currentTicket.version).toBe(5);
      expect(res.body.currentTicket.currentStatus).toBe("CANCELLED");
    });

    it("succeeds when version is omitted in request body (legacy backward compatibility path)", async () => {
      const ticket = await createTestTicket({ currentStatus: "OPEN", version: 1 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "IN_PROGRESS",
        });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("IN_PROGRESS");
      expect(res.body.version).toBe(2);

      const inDb = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
      expect(inDb?.currentStatus).toBe("IN_PROGRESS");
      expect(inDb?.version).toBe(2);
    });

    it("rejects non-numeric versions like booleans, hex strings, and objects with 400 INVALID_INPUT", async () => {
      const ticket = await createTestTicket({ currentStatus: "OPEN", version: 1 });

      const resBool = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "IN_PROGRESS",
          version: true,
        });
      expect(resBool.status).toBe(400);
      expect(resBool.body.error.code).toBe("INVALID_INPUT");

      const resHex = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "IN_PROGRESS",
          version: "0x10",
        });
      expect(resHex.status).toBe(400);
      expect(resHex.body.error.code).toBe("INVALID_INPUT");
    });
  });

  describe("API-12: Mandatory Resolution Summary Gate (BR-13, AC-09)", () => {
    it("rejects transition to RESOLVED if resolution summary is omitted or under 5 characters", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS", version: 1 });

      // 1. Omitted resolutionSummary
      const res1 = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          version: 1,
        });

      expect(res1.status).toBe(400);
      expect(res1.body.error.code).toBe("MISSING_RESOLUTION_SUMMARY");

      // 2. Under 5 characters resolutionSummary ("done")
      const res2 = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "done",
          version: 1,
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error.code).toBe("MISSING_RESOLUTION_SUMMARY");
    });

    it("accepts valid resolution summary of at least 5 characters", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS", version: 1 });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Reinstalled software packages and verified system logs.",
          version: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("RESOLVED");
      expect(res.body.resolutionSummary).toBe("Reinstalled software packages and verified system logs.");
    });
  });

  describe("API-13: Requester Advisory Resolution Indication (BR-12, AC-03)", () => {
    it("flags resolutionIndicated = true, appends public comment, leaving currentStatus unchanged", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS", version: 1 });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/resolve-indication`)
        .set("Authorization", `Bearer ${requesterToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.resolutionIndicated).toBe(true);
      expect(res.body.resolutionIndicatedAt).toBeDefined();
      expect(res.body.currentStatus).toBe("IN_PROGRESS");
      expect(res.body.message).toContain("Problem resolution indicated");

      // Verify ticket state in DB: currentStatus remains IN_PROGRESS
      const inDb = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
      expect(inDb?.resolutionIndicated).toBe(true);
      expect(inDb?.currentStatus).toBe("IN_PROGRESS");

      // Verify automated public comment was appended
      const comments = await getPrisma().publicComment.findMany({
        where: { ticketId: ticket.id },
      });
      expect(comments.length).toBe(1);
      expect(comments[0].content).toContain("Requester indicated that the problem appears resolved.");
    });

    it("rejects indication by a different requester with 403 Forbidden", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS" });

      const res = await request(app)
        .post(`/api/tickets/${ticket.id}/resolve-indication`)
        .set("Authorization", `Bearer ${otherRequesterToken}`)
        .send({});

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe("FORBIDDEN");
    });
  });

  describe("API-22: Action Completion Resolution Gate (BR-20, AC-16)", () => {
    it("blocks transition to RESOLVED when an Action Taken is in PENDING status", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS", version: 1 });

      // Create an action in PENDING status
      await getPrisma().actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          status: "PENDING",
          description: "Scheduled network packet inspection",
          result: "Pending execution",
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "All work supposedly done",
          version: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INCOMPLETE_ACTIONS_TAKEN");
      expect(res.body.error.message).toContain("actions taken remain pending or incomplete");

      // Verify ticket state remains IN_PROGRESS
      const inDb = await getPrisma().ticket.findUnique({ where: { id: ticket.id } });
      expect(inDb?.currentStatus).toBe("IN_PROGRESS");
    });

    it("blocks transition to RESOLVED when followUpRequired is true and followUpDone is false", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS", version: 1 });

      // Create a COMPLETED action with unfinished follow-up
      const action = await getPrisma().actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          status: "COMPLETED",
          description: "Hardware replacement executed",
          result: "Replacement complete",
          followUpRequired: true,
          followUpNote: "Run 24hr load benchmark",
          followUpDone: false,
        },
      });

      // Attempt to resolve - should be blocked
      const resBlocked = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Hardware replaced successfully",
          version: 1,
        });

      expect(resBlocked.status).toBe(400);
      expect(resBlocked.body.error.code).toBe("INCOMPLETE_ACTIONS_TAKEN");

      // Mark follow-up as done
      await getPrisma().actionTaken.update({
        where: { id: action.id },
        data: { followUpDone: true },
      });

      // Attempt to resolve again - should now succeed
      const resAllowed = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Hardware replaced and 24hr benchmark passed.",
          version: 1,
        });

      expect(resAllowed.status).toBe(200);
      expect(resAllowed.body.currentStatus).toBe("RESOLVED");
    });

    it("blocks transition to RESOLVED when an Action Taken is in IN_PROGRESS status", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS", version: 1 });

      // Create an action in IN_PROGRESS status
      await getPrisma().actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          status: "IN_PROGRESS",
          description: "Active server diagnostics in progress",
          result: "Under analysis",
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "Attempted early resolution",
          version: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INCOMPLETE_ACTIONS_TAKEN");
    });

    it("blocks transition to CLOSED when incomplete actions exist", async () => {
      const ticket = await createTestTicket({ currentStatus: "RESOLVED", version: 1 });

      await getPrisma().actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          status: "PENDING",
          description: "Pending post-incident review action",
          result: "Not started",
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "CLOSED",
          resolutionSummary: "Closing with pending action",
          version: 1,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe("INCOMPLETE_ACTIONS_TAKEN");
    });

    it("permits transition to RESOLVED when all actions are COMPLETED or CANCELLED with follow-up satisfied", async () => {
      const ticket = await createTestTicket({ currentStatus: "IN_PROGRESS", version: 1 });

      // Action 1: COMPLETED with no follow-up
      await getPrisma().actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          status: "COMPLETED",
          description: "Applied hotfix patch",
          result: "Hotfix deployed successfully",
          followUpRequired: false,
        },
      });

      // Action 2: CANCELLED (abandoned route)
      await getPrisma().actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          status: "CANCELLED",
          description: "Alternative rollback plan",
          result: "Cancelled since hotfix succeeded",
          followUpRequired: false,
        },
      });

      // Action 3: COMPLETED with follow-up marked as done
      await getPrisma().actionTaken.create({
        data: {
          ticketId: ticket.id,
          performedById: staffUser.id,
          status: "COMPLETED",
          description: "Health monitor check",
          result: "Clean health probe",
          followUpRequired: true,
          followUpNote: "Verify monitoring dashboard next morning",
          followUpDone: true,
        },
      });

      const res = await request(app)
        .patch(`/api/staff/tickets/${ticket.id}/status`)
        .set("Authorization", `Bearer ${staffToken}`)
        .send({
          status: "RESOLVED",
          resolutionSummary: "All actions completed or cancelled; verified fix.",
          version: 1,
        });

      expect(res.status).toBe(200);
      expect(res.body.currentStatus).toBe("RESOLVED");
    });
  });
});
