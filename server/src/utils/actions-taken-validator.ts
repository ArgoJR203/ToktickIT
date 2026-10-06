import { ActionStatus } from "@prisma/client";

/**
 * Actions Taken Content & Follow-up Validator (Issue #4-2 / UNIT-01)
 *
 * Enforces business rules:
 * - BR-04: Mandatory description and result (1-2000 chars), valid actionDateTime (past, present, or future)
 * - BR-05: followUpRequired boolean flag; followUpNote is mandatory (1-1000 chars) iff followUpRequired === true
 * - BR-06: attachmentNotes is optional (max 500 chars)
 * - BR-08: ActionStatus must be PENDING, IN_PROGRESS, COMPLETED, or CANCELLED
 */

export const ACTION_STATUSES = [
  ActionStatus.PENDING,
  ActionStatus.IN_PROGRESS,
  ActionStatus.COMPLETED,
  ActionStatus.CANCELLED,
] as const;

export interface ActionTakenInput {
  actionDateTime?: string | Date;
  description?: unknown;
  result?: unknown;
  status?: unknown;
  followUpRequired?: unknown;
  followUpNote?: unknown;
  followUpDone?: unknown;
  attachmentNotes?: unknown;
  assigneeId?: unknown;
}

export interface ActionValidationResult {
  isValid: boolean;
  errorCode?: "INVALID_INPUT" | "FIELD_TOO_LONG" | "INVALID_DATETIME" | "INVALID_STATUS";
  message?: string;
  field?: string;
}

export function validateActionTaken(input: ActionTakenInput, isPartialUpdate = false): ActionValidationResult {
  if (!input || typeof input !== "object") {
    return {
      isValid: false,
      errorCode: "INVALID_INPUT",
      message: "Action payload must be an object.",
    };
  }

  // 1. Description validation (BR-04)
  if (!isPartialUpdate || input.description !== undefined) {
    if (typeof input.description !== "string" || input.description.trim().length === 0) {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Action description is required.",
        field: "description",
      };
    }
    if (input.description.length > 2000) {
      return {
        isValid: false,
        errorCode: "FIELD_TOO_LONG",
        message: "Action description must not exceed 2000 characters.",
        field: "description",
      };
    }
  }

  // 2. Result validation (BR-04)
  if (!isPartialUpdate || input.result !== undefined) {
    if (typeof input.result !== "string" || input.result.trim().length === 0) {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Action result is required.",
        field: "result",
      };
    }
    if (input.result.length > 2000) {
      return {
        isValid: false,
        errorCode: "FIELD_TOO_LONG",
        message: "Action result must not exceed 2000 characters.",
        field: "result",
      };
    }
  }

  // 3. Action Date/Time validation (BR-04)
  if (input.actionDateTime !== undefined && input.actionDateTime !== null) {
    const parsedDate = new Date(input.actionDateTime);
    if (isNaN(parsedDate.getTime())) {
      return {
        isValid: false,
        errorCode: "INVALID_DATETIME",
        message: "Action date/time must be a valid ISO datetime format.",
        field: "actionDateTime",
      };
    }
  }

  // 4. Status validation (BR-08)
  if (input.status !== undefined && input.status !== null) {
    if (!ACTION_STATUSES.includes(input.status as ActionStatus)) {
      return {
        isValid: false,
        errorCode: "INVALID_STATUS",
        message: `Action status must be one of: ${ACTION_STATUSES.join(", ")}.`,
        field: "status",
      };
    }
  }

  // 5. Conditional Follow-up validation (BR-05)
  const followUpRequired = Boolean(input.followUpRequired);
  if (followUpRequired) {
    if (
      input.followUpNote === undefined ||
      input.followUpNote === null ||
      typeof input.followUpNote !== "string" ||
      input.followUpNote.trim().length === 0
    ) {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Follow-up note is required when follow-up is requested.",
        field: "followUpNote",
      };
    }
    if (input.followUpNote.length > 1000) {
      return {
        isValid: false,
        errorCode: "FIELD_TOO_LONG",
        message: "Follow-up note must not exceed 1000 characters.",
        field: "followUpNote",
      };
    }
  } else if (!isPartialUpdate && input.followUpNote) {
    // If follow-up is false, follow-up note should not be non-empty string on create
    if (typeof input.followUpNote === "string" && input.followUpNote.trim().length > 0) {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Follow-up note must be empty when follow-up is not required.",
        field: "followUpNote",
      };
    }
  }

  // 6. Attachment Notes validation (BR-06)
  if (input.attachmentNotes !== undefined && input.attachmentNotes !== null) {
    if (typeof input.attachmentNotes === "string" && input.attachmentNotes.length > 500) {
      return {
        isValid: false,
        errorCode: "FIELD_TOO_LONG",
        message: "Attachment notes must not exceed 500 characters.",
        field: "attachmentNotes",
      };
    }
  }

  return { isValid: true };
}
