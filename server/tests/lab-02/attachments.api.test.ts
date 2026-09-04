import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { app } from "../../src/app.js";
import { getPrisma } from "../../src/prisma.js";

describe("Attachment Lifecycle REST API Integration Tests (Issue #2-8 / API-06, API-07, API-08, API-09)", () => {
  let requesterAId: number;
  let requesterBId: number;
  let categoryId: number;
  let relatedSystemId: number;
  let ticketAId: number;

  beforeAll(async () => {
    const prisma = getPrisma();
    const activeRequesters = await prisma.requesterUser.findMany({
      where: { isActive: true },
      take: 2,
    });
    if (activeRequesters.length < 2) {
      throw new Error("At least 2 active requesters required for test");
    }
    requesterAId = activeRequesters[0].id;
    requesterBId = activeRequesters[1].id;

    const category = await prisma.category.findFirst();
    if (!category) throw new Error("No category seeded");
    categoryId = category.id;

    const system = await prisma.relatedSystem.findFirst({ where: { isActive: true } });
    if (!system) throw new Error("No related system seeded");
    relatedSystemId = system.id;

    // Create a ticket owned by Requester A
    const resA = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", requesterAId.toString())
      .send({
        categoryId,
        relatedSystemId,
        summary: "Attachment lifecycle test ticket",
        description: "Ticket created specifically for attachment API integration testing.",
        requestedPriority: "MEDIUM",
      });

    expect(resA.status).toBe(201);
    ticketAId = resA.body.id;
  });

  // -------------------------------------------------------------------------
  // API-06: Upload valid attachment
  // -------------------------------------------------------------------------
  it("uploads a valid PDF attachment to an owned ticket (API-06, AC-06)", async () => {
    const fileBuffer = Buffer.from("%PDF-1.4 test document content");

    const res = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .set("x-requester-id", requesterAId.toString())
      .attach("file", fileBuffer, {
        filename: "battery_report.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("id");
    expect(res.body.ticketId).toBe(ticketAId);
    expect(res.body.originalName).toBe("battery_report.pdf");
    expect(res.body.mimeType).toBe("application/pdf");
    expect(res.body.sizeBytes).toBe(fileBuffer.length);
    expect(res.body.isRemoved).toBe(false);

    // Verify record in database
    const dbRecord = await getPrisma().attachment.findUnique({
      where: { id: res.body.id },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.originalName).toBe("battery_report.pdf");
  });

  // -------------------------------------------------------------------------
  // API-08: Rejection of invalid types and oversized files
  // -------------------------------------------------------------------------
  it("rejects an unsupported file type with 400 and INVALID_FILE_TYPE (API-08, AC-07, BR-12)", async () => {
    const fileBuffer = Buffer.from("Hello text content");

    const res = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .set("x-requester-id", requesterAId.toString())
      .attach("file", fileBuffer, {
        filename: "notes.txt",
        contentType: "text/plain",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("INVALID_FILE_TYPE");
    expect(res.body.message).toContain("Unsupported file type");
  });

  it("rejects a file exceeding 5MB with 400 and FILE_TOO_LARGE (API-08, AC-07, BR-13)", async () => {
    // 5MB + 1024 bytes buffer
    const largeBuffer = Buffer.alloc(5 * 1024 * 1024 + 1024, "a");

    const res = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .set("x-requester-id", requesterAId.toString())
      .attach("file", largeBuffer, {
        filename: "huge_scan.png",
        contentType: "image/png",
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe("FILE_TOO_LARGE");
    expect(res.body.message).toContain("File exceeds maximum");
  });

  // -------------------------------------------------------------------------
  // Ownership Isolation on Upload
  // -------------------------------------------------------------------------
  it("rejects attachment upload to a ticket owned by another requester with 403 (BR-05, BR-18)", async () => {
    const fileBuffer = Buffer.from("%PDF-1.4 test");

    const res = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .set("x-requester-id", requesterBId.toString())
      .attach("file", fileBuffer, {
        filename: "unauthorized.pdf",
        contentType: "application/pdf",
      });

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
  });

  // -------------------------------------------------------------------------
  // Download Active Attachment
  // -------------------------------------------------------------------------
  it("downloads an active attachment stream with 200 OK (FR-09)", async () => {
    const fileBuffer = Buffer.from("PNG fake binary data");

    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .set("x-requester-id", requesterAId.toString())
      .attach("file", fileBuffer, {
        filename: "screenshot.png",
        contentType: "image/png",
      });

    expect(uploadRes.status).toBe(201);
    const attachmentId = uploadRes.body.id;

    const downloadRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("x-requester-id", requesterAId.toString());

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.headers["content-disposition"]).toContain("screenshot.png");
  });

  it("rejects attachment download by unauthorized requester with 403 (BR-05, BR-18)", async () => {
    const fileBuffer = Buffer.from("%PDF-1.4 sample");

    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .set("x-requester-id", requesterAId.toString())
      .attach("file", fileBuffer, {
        filename: "private.pdf",
        contentType: "application/pdf",
      });

    const attachmentId = uploadRes.body.id;

    const res = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("x-requester-id", requesterBId.toString());

    expect(res.status).toBe(403);
    expect(res.body.error).toBe("FORBIDDEN");
  });

  // -------------------------------------------------------------------------
  // API-07 & API-09: Soft Removal and 410 on Download
  // -------------------------------------------------------------------------
  it("soft-removes an attachment with reason and timestamps (API-07, AC-08, BR-15)", async () => {
    const fileBuffer = Buffer.from("%PDF-1.4 report to remove");

    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .set("x-requester-id", requesterAId.toString())
      .attach("file", fileBuffer, {
        filename: "outdated_doc.pdf",
        contentType: "application/pdf",
      });

    const attachmentId = uploadRes.body.id;

    // Attempt removal with reason < 3 chars -> 400 INVALID_REMOVAL_REASON
    const invalidRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("x-requester-id", requesterAId.toString())
      .send({ removalReason: "no" });

    expect(invalidRes.status).toBe(400);
    expect(invalidRes.body.error).toBe("INVALID_REMOVAL_REASON");

    // Perform valid soft removal
    const removeRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("x-requester-id", requesterAId.toString())
      .send({ removalReason: "Uploaded outdated document version" });

    expect(removeRes.status).toBe(200);
    expect(removeRes.body.isRemoved).toBe(true);
    expect(removeRes.body.removalReason).toBe("Uploaded outdated document version");
    expect(removeRes.body.removedAt).toBeDefined();

    // Verify in database
    const dbRecord = await getPrisma().attachment.findUnique({
      where: { id: attachmentId },
    });
    expect(dbRecord?.isRemoved).toBe(true);
    expect(dbRecord?.removalReason).toBe("Uploaded outdated document version");
    expect(dbRecord?.removedAt).not.toBeNull();

    // Attempt re-removal -> 400 ALREADY_REMOVED
    const reRemoveRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("x-requester-id", requesterAId.toString())
      .send({ removalReason: "Trying again" });

    expect(reRemoveRes.status).toBe(400);
    expect(reRemoveRes.body.error).toBe("ALREADY_REMOVED");

    // API-09: Attempt download of soft-removed file -> 410 Gone (BR-16)
    const downloadRemovedRes = await request(app)
      .get(`/api/attachments/${attachmentId}/download`)
      .set("x-requester-id", requesterAId.toString());

    expect(downloadRemovedRes.status).toBe(410);
    expect(downloadRemovedRes.body.error).toBe("GONE");
    expect(downloadRemovedRes.body.message).toContain("This attachment was removed and cannot be downloaded.");
  });

  // -------------------------------------------------------------------------
  // BR-14: Max 5 Active Attachments
  // -------------------------------------------------------------------------
  it("enforces maximum 5 active attachments per ticket (BR-14)", async () => {
    // Create a new dedicated ticket for the max attachments limit test
    const newTicketRes = await request(app)
      .post("/api/tickets")
      .set("x-requester-id", requesterAId.toString())
      .send({
        categoryId,
        relatedSystemId,
        summary: "Max 5 attachments limit ticket",
        description: "Checking that the 6th active upload is rejected per BR-14.",
        requestedPriority: "LOW",
      });

    const testTicketId = newTicketRes.body.id;

    // Upload 5 active attachments
    for (let i = 1; i <= 5; i++) {
      const upRes = await request(app)
        .post(`/api/tickets/${testTicketId}/attachments`)
        .set("x-requester-id", requesterAId.toString())
        .attach("file", Buffer.from(`attachment ${i}`), {
          filename: `file_${i}.png`,
          contentType: "image/png",
        });
      expect(upRes.status).toBe(201);
    }

    // 6th upload must be rejected with 400 MAX_ATTACHMENTS_EXCEEDED
    const overflowRes = await request(app)
      .post(`/api/tickets/${testTicketId}/attachments`)
      .set("x-requester-id", requesterAId.toString())
      .attach("file", Buffer.from("attachment 6"), {
        filename: "file_6.png",
        contentType: "image/png",
      });

    expect(overflowRes.status).toBe(400);
    expect(overflowRes.body.error).toBe("MAX_ATTACHMENTS_EXCEEDED");
    expect(overflowRes.body.message).toContain("maximum of 5 active attachments");
  });

  // -------------------------------------------------------------------------
  // Edge Cases: Authentication & Non-Existent Resources
  // -------------------------------------------------------------------------
  it("rejects requests missing x-requester-id header with 401 UNAUTHORIZED", async () => {
    // Missing on upload
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .attach("file", Buffer.from("test"), { filename: "test.pdf", contentType: "application/pdf" });
    expect(uploadRes.status).toBe(401);

    // Missing on download
    const downloadRes = await request(app).get("/api/attachments/1/download");
    expect(downloadRes.status).toBe(401);

    // Missing on remove
    const removeRes = await request(app)
      .delete("/api/attachments/1")
      .send({ removalReason: "testing reason" });
    expect(removeRes.status).toBe(401);
  });

  it("returns 404 NOT_FOUND for non-existent ticket or attachment IDs", async () => {
    // Non-existent ticket upload
    const uploadRes = await request(app)
      .post("/api/tickets/999999/attachments")
      .set("x-requester-id", requesterAId.toString())
      .attach("file", Buffer.from("test"), { filename: "test.pdf", contentType: "application/pdf" });
    expect(uploadRes.status).toBe(404);
    expect(uploadRes.body.error).toBe("NOT_FOUND");

    // Non-existent attachment download
    const downloadRes = await request(app)
      .get("/api/attachments/999999/download")
      .set("x-requester-id", requesterAId.toString());
    expect(downloadRes.status).toBe(404);
    expect(downloadRes.body.error).toBe("NOT_FOUND");

    // Non-existent attachment removal
    const removeRes = await request(app)
      .delete("/api/attachments/999999")
      .set("x-requester-id", requesterAId.toString())
      .send({ removalReason: "Testing 404" });
    expect(removeRes.status).toBe(404);
    expect(removeRes.body.error).toBe("NOT_FOUND");
  });

  it("rejects removal reason exceeding 500 characters with 400 INVALID_REMOVAL_REASON", async () => {
    const uploadRes = await request(app)
      .post(`/api/tickets/${ticketAId}/attachments`)
      .set("x-requester-id", requesterAId.toString())
      .attach("file", Buffer.from("test for long reason"), {
        filename: "test_reason.pdf",
        contentType: "application/pdf",
      });

    const attachmentId = uploadRes.body.id;

    const longReason = "a".repeat(501);
    const removeRes = await request(app)
      .delete(`/api/attachments/${attachmentId}`)
      .set("x-requester-id", requesterAId.toString())
      .send({ removalReason: longReason });

    expect(removeRes.status).toBe(400);
    expect(removeRes.body.error).toBe("INVALID_REMOVAL_REASON");
    expect(removeRes.body.message).toContain("cannot exceed 500 characters");
  });
});
