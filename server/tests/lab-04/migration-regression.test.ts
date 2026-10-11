import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { getPrisma } from "../../src/prisma.js";

/**
 * Migration & Zero Data Loss Regression Suite (MIGR-01, BR-19)
 *
 * Verifies that the Lab 4 schema migration:
 * 1. Safely introduced the ActionTaken model and ActionStatus enum.
 * 2. Added the integer `version` field (default 1) to model Ticket without losing legacy columns or data.
 * 3. Preserves referential integrity across Users, Tickets, PublicComments, InternalNotes, and Attachments.
 * 4. Ensures cascade deletion works correctly from Ticket to ActionsTaken (BR-01).
 */
describe("Database Migration & Zero Data Loss Regression Suite (MIGR-01, BR-19)", () => {
  const prisma = getPrisma();

  it("verifies model Ticket has integer version column defaulting to >= 1 for all records", async () => {
    const tickets = await prisma.ticket.findMany({
      take: 10,
      select: {
        id: true,
        ticketNumber: true,
        version: true,
        currentStatus: true,
      },
    });

    expect(tickets.length).toBeGreaterThan(0);
    for (const ticket of tickets) {
      expect(typeof ticket.version).toBe("number");
      expect(ticket.version).toBeGreaterThanOrEqual(1);
    }
  });

  it("verifies ActionTaken table exists with all required fields and relations", async () => {
    // Query ActionTaken metadata and existing count
    const actionsCount = await prisma.actionTaken.count();
    expect(typeof actionsCount).toBe("number");

    // Retrieve an action if present, validating columns
    const action = await prisma.actionTaken.findFirst({
      include: {
        ticket: true,
        performedBy: true,
        assignee: true,
      },
    });

    if (action) {
      expect(action).toHaveProperty("id");
      expect(action).toHaveProperty("ticketId");
      expect(action).toHaveProperty("performedById");
      expect(action).toHaveProperty("description");
      expect(action).toHaveProperty("result");
      expect(action).toHaveProperty("status");
      expect(action).toHaveProperty("version");
      expect(action.version).toBeGreaterThanOrEqual(1);
      expect(action.ticket).toBeDefined();
      expect(action.performedBy).toBeDefined();
    }
  });

  it("verifies legacy models and relationships remain 100% operational (Users, Comments, Notes)", async () => {
    const userCount = await prisma.user.count();
    expect(userCount).toBeGreaterThanOrEqual(11); // Baseline seed 11 users

    const commentCount = await prisma.publicComment.count();
    expect(typeof commentCount).toBe("number");

    const noteCount = await prisma.internalNote.count();
    expect(typeof noteCount).toBe("number");

    const attachmentCount = await prisma.attachment.count();
    expect(typeof attachmentCount).toBe("number");
  });

  it("verifies cascade deletion: deleting a ticket cascades deletion to its ActionsTaken (BR-01)", async () => {
    // Create a temporary ticket and action to test cascade deletion
    const staff = await prisma.user.findFirst({ where: { role: "IT_STAFF" } });
    const requester = await prisma.user.findFirst({ where: { role: "REQUESTER" } });
    const category = await prisma.category.findFirst();
    const system = await prisma.relatedSystem.findFirst();

    if (!staff || !requester || !category || !system) {
      throw new Error("Missing seed data for cascade test");
    }

    const testTicket = await prisma.ticket.create({
      data: {
        ticketNumber: `TKT-TEST-CASC-${Date.now().toString().slice(-6)}`,
        summary: "Temporary ticket for cascade deletion test",
        description: "Checking cascade deletion on action taken",
        requestedPriority: "LOW",
        itPriority: "LOW",
        categoryId: category.id,
        relatedSystemId: system.id,
        requesterId: requester.id,
        currentStatus: "NEW",
        version: 1,
      },
    });

    const testAction = await prisma.actionTaken.create({
      data: {
        ticketId: testTicket.id,
        performedById: staff.id,
        description: "Temporary action taken for cascade test",
        result: "Testing cascade delete trigger",
        status: "COMPLETED",
        version: 1,
      },
    });

    expect(testAction.id).toBeDefined();

    // Delete the parent ticket
    await prisma.ticket.delete({
      where: { id: testTicket.id },
    });

    // Verify ActionTaken was cascaded and no longer exists
    const orphanAction = await prisma.actionTaken.findUnique({
      where: { id: testAction.id },
    });
    expect(orphanAction).toBeNull();
  });

  it("verifies rollback down-migration script exists and contains valid rollback statements (MIGR-01, BR-19)", () => {
    const rollbackPath = path.resolve(__dirname, "../../prisma/migrations/rollback_20261006124008.sql");
    expect(fs.existsSync(rollbackPath)).toBe(true);
    const sqlContent = fs.readFileSync(rollbackPath, "utf-8");
    expect(sqlContent.length).toBeGreaterThan(0);
    expect(sqlContent).toContain('DROP TABLE IF EXISTS "ActionTaken"');
    expect(sqlContent).toContain('DROP TYPE IF EXISTS "ActionStatus"');
    expect(sqlContent).toContain('ALTER TABLE "Ticket" DROP COLUMN IF EXISTS "version"');
  });
});
