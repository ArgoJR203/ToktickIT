import { describe, it, expect } from "vitest";
import { ActionStatus } from "@prisma/client";
import { validateActionTaken } from "../../src/utils/actions-taken-validator.js";

/**
 * UNIT-01: Actions Taken Content & Follow-up Validator (Issue #4-2 / Handout §10)
 *
 * Verifies:
 * - Mandatory description and result (1-2000 chars)
 * - Boundary conditions (2000 chars allowed, 2001 chars rejected)
 * - Empty / whitespace-only inputs rejected
 * - Follow-up note conditionally required iff followUpRequired === true (1-1000 chars)
 * - ActionStatus validation
 * - Future datetime support
 */

describe("UNIT-01: Actions Taken Content & Follow-up Validator", () => {
  const validBaseAction = {
    description: "Replaced faulty NIC and ran loopback test",
    result: "All diagnostic tests passed successfully",
    status: ActionStatus.COMPLETED,
    actionDateTime: new Date().toISOString(),
    followUpRequired: false,
  };

  it("accepts valid action with required fields", () => {
    const result = validateActionTaken(validBaseAction);
    expect(result.isValid).toBe(true);
  });

  it("rejects missing or empty description (BR-04)", () => {
    const emptyDesc = validateActionTaken({ ...validBaseAction, description: "" });
    expect(emptyDesc.isValid).toBe(false);
    expect(emptyDesc.errorCode).toBe("INVALID_INPUT");
    expect(emptyDesc.field).toBe("description");

    const whitespaceDesc = validateActionTaken({ ...validBaseAction, description: "   " });
    expect(whitespaceDesc.isValid).toBe(false);
    expect(whitespaceDesc.errorCode).toBe("INVALID_INPUT");
  });

  it("rejects missing or empty result (BR-04)", () => {
    const emptyResult = validateActionTaken({ ...validBaseAction, result: "" });
    expect(emptyResult.isValid).toBe(false);
    expect(emptyResult.errorCode).toBe("INVALID_INPUT");
    expect(emptyResult.field).toBe("result");

    const whitespaceResult = validateActionTaken({ ...validBaseAction, result: "\t\n  " });
    expect(whitespaceResult.isValid).toBe(false);
    expect(whitespaceResult.errorCode).toBe("INVALID_INPUT");
  });

  it("validates boundary lengths: 2000 characters allowed, 2001 characters rejected (API-19)", () => {
    const exact2000 = "a".repeat(2000);
    const exact2001 = "a".repeat(2001);

    const valid2000 = validateActionTaken({
      ...validBaseAction,
      description: exact2000,
      result: exact2000,
    });
    expect(valid2000.isValid).toBe(true);

    const invalidDesc = validateActionTaken({
      ...validBaseAction,
      description: exact2001,
    });
    expect(invalidDesc.isValid).toBe(false);
    expect(invalidDesc.errorCode).toBe("FIELD_TOO_LONG");
    expect(invalidDesc.field).toBe("description");

    const invalidResult = validateActionTaken({
      ...validBaseAction,
      result: exact2001,
    });
    expect(invalidResult.isValid).toBe(false);
    expect(invalidResult.errorCode).toBe("FIELD_TOO_LONG");
    expect(invalidResult.field).toBe("result");
  });

  it("enforces followUpNote when followUpRequired is true (BR-05 / AC-05)", () => {
    const missingNote = validateActionTaken({
      ...validBaseAction,
      followUpRequired: true,
      followUpNote: undefined,
    });
    expect(missingNote.isValid).toBe(false);
    expect(missingNote.errorCode).toBe("INVALID_INPUT");
    expect(missingNote.field).toBe("followUpNote");

    const emptyNote = validateActionTaken({
      ...validBaseAction,
      followUpRequired: true,
      followUpNote: "   ",
    });
    expect(emptyNote.isValid).toBe(false);
    expect(emptyNote.errorCode).toBe("INVALID_INPUT");

    const validWithNote = validateActionTaken({
      ...validBaseAction,
      followUpRequired: true,
      followUpNote: "Check back in 48 hours for error telemetry",
    });
    expect(validWithNote.isValid).toBe(true);
  });

  it("rejects followUpNote exceeding 1000 characters", () => {
    const longNote = validateActionTaken({
      ...validBaseAction,
      followUpRequired: true,
      followUpNote: "x".repeat(1001),
    });
    expect(longNote.isValid).toBe(false);
    expect(longNote.errorCode).toBe("FIELD_TOO_LONG");
  });

  it("rejects followUpNote when followUpRequired is false on creation", () => {
    const superfluousNote = validateActionTaken({
      ...validBaseAction,
      followUpRequired: false,
      followUpNote: "Unneeded note",
    });
    expect(superfluousNote.isValid).toBe(false);
    expect(superfluousNote.errorCode).toBe("INVALID_INPUT");
  });

  it("accepts future actionDateTime for work planning (BR-04 / API-20)", () => {
    const tomorrow = new Date(Date.now() + 86400000).toISOString();
    const plannedAction = validateActionTaken({
      ...validBaseAction,
      status: ActionStatus.PENDING,
      actionDateTime: tomorrow,
    });
    expect(plannedAction.isValid).toBe(true);
  });

  it("rejects invalid date format for actionDateTime", () => {
    const invalidDate = validateActionTaken({
      ...validBaseAction,
      actionDateTime: "not-a-valid-date",
    });
    expect(invalidDate.isValid).toBe(false);
    expect(invalidDate.errorCode).toBe("INVALID_DATETIME");
  });

  it("validates status against ActionStatus enum (BR-08)", () => {
    for (const status of Object.values(ActionStatus)) {
      const result = validateActionTaken({
        ...validBaseAction,
        status,
      });
      expect(result.isValid).toBe(true);
    }

    const invalidStatus = validateActionTaken({
      ...validBaseAction,
      status: "COMPLETED_EXTRA",
    });
    expect(invalidStatus.isValid).toBe(false);
    expect(invalidStatus.errorCode).toBe("INVALID_STATUS");
  });

  it("rejects attachmentNotes exceeding 500 characters (BR-06)", () => {
    const longNotes = validateActionTaken({
      ...validBaseAction,
      attachmentNotes: "a".repeat(501),
    });
    expect(longNotes.isValid).toBe(false);
    expect(longNotes.errorCode).toBe("FIELD_TOO_LONG");

    const validNotes = validateActionTaken({
      ...validBaseAction,
      attachmentNotes: "diagram-v1.pdf, switch-config.txt",
    });
    expect(validNotes.isValid).toBe(true);
  });
});
