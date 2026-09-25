import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import bcrypt from "bcrypt";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Lab 3 Comments, Notes & Resolution Indication (API-08, API-11, API-12, API-19)", () => {
  let requesterToken: string;
  let otherRequesterToken: string;
  let staffToken: string;
  let requesterId: number;
  let otherRequesterId: number;
  let staffId: number;
  let ticketId: number;
  let categoryId: number;
  let relatedSystemId: number;

  beforeAll(async () => {
    const prisma = getPrisma();
    const defaultHash = await bcrypt.hash("Password123!", 10);

    // Setup Requester 1 (Owner)
    const requester = await prisma.user.upsert({
      where: { email: "comments.owner@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false },
      create: {
        name: "Comments Owner",
        email: "comments.owner@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });
    requesterId = requester.id;

    // Setup Requester 2 (Non-owner)
    const otherRequester = await prisma.user.upsert({
      where: { email: "comments.other@example.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false },
      create: {
        name: "Comments Other",
        email: "comments.other@example.com",
        passwordHash: defaultHash,
        role: "REQUESTER",
        isActive: true,
        mustChangePassword: false,
      },
    });
    otherRequesterId = otherRequester.id;

    // Setup IT Staff
    const staff = await prisma.user.upsert({
      where: { email: "comments.staff@toktickit.com" },
      update: { passwordHash: defaultHash, isActive: true, mustChangePassword: false },
      create: {
        name: "Comments Staff",
        email: "comments.staff@toktickit.com",
        passwordHash: defaultHash,
        role: "IT_STAFF",
        isActive: true,
        mustChangePassword: false,
      },
    });
    staffId = staff.id;

    // Log in all accounts
    const reqLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "comments.owner@example.com", password: "Password123!" });
    requesterToken = reqLogin.body.token;

    const otherLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "comments.other@example.com", password: "Password123!" });
    otherRequesterToken = otherLogin.body.token;

    const staffLogin = await request(app)
      .post("/api/auth/login")
      .send({ email: "comments.staff@toktickit.com", password: "Password123!" });
    staffToken = staffLogin.body.token;

    // Fetch or create Category & Related System
    const cat = await prisma.category.findFirst();
    if (!cat) throw new Error("No category found");
    categoryId = cat.id;

    const sys = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    if (!sys) throw new Error("No related system found");
    relatedSystemId = sys.id;

    // Create a Ticket owned by Requester 1
    const ticketRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        categoryId,
        relatedSystemId,
        summary: "Comments and Notes Integration Ticket",
        description: "Testing public comments, internal notes isolation, and resolution signal.",
        requestedPriority: "HIGH",
      });
    expect(ticketRes.status).toBe(201);
    ticketId = ticketRes.body.id;
  });

  // -------------------------------------------------------------------------
  // API-08: Requester requests Internal Notes -> 403 Forbidden (AC-04, BR-04, BR-19)
  // -------------------------------------------------------------------------
  it("API-08: rejects Requester requesting internal notes with 403 Forbidden without leaking data (Handout §10 exact)", async () => {
    // 1. Staff creates an internal note first
    const staffNoteRes = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "Confidential staff investigation note." });
    expect(staffNoteRes.status).toBe(201);

    // 2. Requester attempts to GET internal notes
    const resGet = await request(app)
      .get(`/api/tickets/${ticketId}/notes`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(resGet.status).toBe(403);
    expect(resGet.body.error.code).toBe("FORBIDDEN");
    expect(resGet.body.error.message).toContain("Internal notes are restricted to IT Staff and Administrators");
    expect(resGet.body.data).toBeUndefined();

    // 3. Requester attempts to POST internal note
    const resPost = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ content: "Sneaky requester internal note." });

    expect(resPost.status).toBe(403);
    expect(resPost.body.error.code).toBe("FORBIDDEN");
  });

  // -------------------------------------------------------------------------
  // API-11: Public Comments creation and retrieval (AC-11, FR-09)
  // -------------------------------------------------------------------------
  it("API-11: allows ticket owner and IT Staff to post and view public comments in chronological order", async () => {
    // 1. Ticket owner posts comment
    const ownerCommentRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ content: "Hello, I am having issues with this setup." });

    expect(ownerCommentRes.status).toBe(201);
    expect(ownerCommentRes.body.content).toBe("Hello, I am having issues with this setup.");
    expect(ownerCommentRes.body.author.id).toBe(requesterId);
    expect(ownerCommentRes.body.author.role).toBe("REQUESTER");
    expect(ownerCommentRes.body.author.name).toBe("Comments Owner");

    // 2. IT Staff posts reply
    const staffCommentRes = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "We are actively investigating the logs." });

    expect(staffCommentRes.status).toBe(201);
    expect(staffCommentRes.body.content).toBe("We are actively investigating the logs.");
    expect(staffCommentRes.body.author.id).toBe(staffId);
    expect(staffCommentRes.body.author.role).toBe("IT_STAFF");

    // 3. Requester retrieves public comments timeline
    const getRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${requesterToken}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body)).toBe(true);
    expect(getRes.body.length).toBeGreaterThanOrEqual(2);

    const contents = getRes.body.map((c: any) => c.content);
    expect(contents).toContain("Hello, I am having issues with this setup.");
    expect(contents).toContain("We are actively investigating the logs.");

    // 4. Non-owner requester is rejected with 403 Forbidden
    const forbiddenGet = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${otherRequesterToken}`);
    expect(forbiddenGet.status).toBe(403);
    expect(forbiddenGet.body.error.code).toBe("FORBIDDEN");

    const forbiddenPost = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${otherRequesterToken}`)
      .send({ content: "I am an unauthorized requester." });
    expect(forbiddenPost.status).toBe(403);
    expect(forbiddenPost.body.error.code).toBe("FORBIDDEN");
  });

  // -------------------------------------------------------------------------
  // API-12: Whitespace-only comment/note rejection (BR-18)
  // -------------------------------------------------------------------------
  it("API-12: rejects empty or whitespace-only comments and notes with 400 Bad Request", async () => {
    // Empty comment
    const emptyComment = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ content: "" });
    expect(emptyComment.status).toBe(400);
    expect(emptyComment.body.error.code).toBe("INVALID_INPUT");

    // Whitespace comment
    const whitespaceComment = await request(app)
      .post(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({ content: "   \n\t   " });
    expect(whitespaceComment.status).toBe(400);
    expect(whitespaceComment.body.error.code).toBe("INVALID_INPUT");

    // Whitespace note (by staff)
    const whitespaceNote = await request(app)
      .post(`/api/tickets/${ticketId}/notes`)
      .set("Authorization", `Bearer ${staffToken}`)
      .send({ content: "      " });
    expect(whitespaceNote.status).toBe(400);
    expect(whitespaceNote.body.error.code).toBe("INVALID_INPUT");
  });

  // -------------------------------------------------------------------------
  // API-19: Requester "Problem Appears Resolved" signal (AC-12, BR-05, BR-16)
  // -------------------------------------------------------------------------
  it("API-19: records problem resolution indication without prematurely setting RESOLVED or CLOSED", async () => {
    // Transition ticket to IN_PROGRESS directly in DB for testing the signal
    await getPrisma().ticket.update({
      where: { id: ticketId },
      data: { currentStatus: "IN_PROGRESS" },
    });

    // 1. Requester indicates resolution
    const resolveRes = await request(app)
      .post(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({});

    expect(resolveRes.status).toBe(200);
    expect(resolveRes.body.resolutionIndicated).toBe(true);
    expect(resolveRes.body.resolutionIndicatedAt).toBeDefined();
    expect(resolveRes.body.message).toContain("Problem resolution indicated");

    // 2. Verify ticket state in DB: currentStatus MUST still be IN_PROGRESS (BR-05, BR-16)
    const updatedTicket = await getPrisma().ticket.findUnique({
      where: { id: ticketId },
    });
    expect(updatedTicket?.resolutionIndicated).toBe(true);
    expect(updatedTicket?.currentStatus).toBe("IN_PROGRESS");
    expect(updatedTicket?.currentStatus).not.toBe("RESOLVED");
    expect(updatedTicket?.currentStatus).not.toBe("CLOSED");

    // 3. Automated public comment was appended
    const commentsRes = await request(app)
      .get(`/api/tickets/${ticketId}/comments`)
      .set("Authorization", `Bearer ${requesterToken}`);
    const comments = commentsRes.body;
    const automated = comments.find((c: any) =>
      c.content.includes("Requester indicated that the problem appears resolved")
    );
    expect(automated).toBeDefined();
    expect(automated.author.id).toBe(requesterId);

    // 4. Reject when ticket is in invalid status (e.g. NEW or RESOLVED)
    const newTicketRes = await request(app)
      .post("/api/tickets")
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({
        categoryId,
        relatedSystemId,
        summary: "Brand new ticket in NEW status",
        description: "Cannot indicate resolved when NEW.",
        requestedPriority: "LOW",
      });
    const newTicketId = newTicketRes.body.id;

    const invalidResolveRes = await request(app)
      .post(`/api/tickets/${newTicketId}/resolve-indication`)
      .set("Authorization", `Bearer ${requesterToken}`)
      .send({});
    expect(invalidResolveRes.status).toBe(400);
    expect(invalidResolveRes.body.error.code).toBe("INVALID_TRANSITION");

    // 5. Non-owner requester cannot indicate resolution
    const forbiddenResolve = await request(app)
      .post(`/api/tickets/${ticketId}/resolve-indication`)
      .set("Authorization", `Bearer ${otherRequesterToken}`)
      .send({});
    expect(forbiddenResolve.status).toBe(403);
  });
});
