import { ActionStatus } from "@prisma/client";

/**
 * Actions Taken Content & Follow-up Validator (Issue #4-2 / UNIT-01)
 *
 * Enforces business rules:
 * - BR-04: Mandatory description and result (1-2000 chars after trimming), valid actionDateTime (past, present, or future)
 * - BR-05: followUpRequired boolean flag; followUpNote is mandatory (1-1000 chars) iff followUpRequired === true
 * - BR-06: attachmentNotes is optional (max 500 chars after trimming)
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

export function parseBoolean(val: unknown): boolean {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
  }
  if (typeof val === "number") return val !== 0;
  return Boolean(val);
}

export function validateActionTaken(input: ActionTakenInput, isPartialUpdate = false): ActionValidationResult {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return {
      isValid: false,
      errorCode: "INVALID_INPUT",
      message: "Action payload must be an object.",
    };
  }

  // 1. Description validation (BR-04)
  if (!isPartialUpdate || input.description !== undefined) {
    if (typeof input.description !== "string") {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Action description must be a string.",
        field: "description",
      };
    }
    const trimmed = input.description.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Action description is required.",
        field: "description",
      };
    }
    if (trimmed.length > 2000) {
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
    if (typeof input.result !== "string") {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Action result must be a string.",
        field: "result",
      };
    }
    const trimmed = input.result.trim();
    if (trimmed.length === 0) {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Action result is required.",
        field: "result",
      };
    }
    if (trimmed.length > 2000) {
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

  // 5. Follow-up validation (BR-05)
  if (!isPartialUpdate) {
    const followUpRequired = parseBoolean(input.followUpRequired);
    if (followUpRequired) {
      if (
        input.followUpNote === undefined ||
        input.followUpNote === null ||
        typeof input.followUpNote !== "string"
      ) {
        return {
          isValid: false,
          errorCode: "INVALID_INPUT",
          message: "Follow-up note is required when follow-up is requested.",
          field: "followUpNote",
        };
      }
      const trimmedNote = input.followUpNote.trim();
      if (trimmedNote.length === 0) {
        return {
          isValid: false,
          errorCode: "INVALID_INPUT",
          message: "Follow-up note is required when follow-up is requested.",
          field: "followUpNote",
        };
      }
      if (trimmedNote.length > 1000) {
        return {
          isValid: false,
          errorCode: "FIELD_TOO_LONG",
          message: "Follow-up note must not exceed 1000 characters.",
          field: "followUpNote",
        };
      }
    } else if (input.followUpNote) {
      // If follow-up is false on create, followUpNote must be empty
      if (typeof input.followUpNote === "string" && input.followUpNote.trim().length > 0) {
        return {
          isValid: false,
          errorCode: "INVALID_INPUT",
          message: "Follow-up note must be empty when follow-up is not required.",
          field: "followUpNote",
        };
      }
    }
  } else {
    // In partial update: validate followUpNote length and type if explicitly supplied
    if (input.followUpNote !== undefined && input.followUpNote !== null) {
      if (typeof input.followUpNote !== "string") {
        return {
          isValid: false,
          errorCode: "INVALID_INPUT",
          message: "Follow-up note must be a string.",
          field: "followUpNote",
        };
      }
      if (input.followUpNote.trim().length > 1000) {
        return {
          isValid: false,
          errorCode: "FIELD_TOO_LONG",
          message: "Follow-up note must not exceed 1000 characters.",
          field: "followUpNote",
        };
      }
    }
  }

  // 6. Attachment Notes validation (BR-06)
  if (input.attachmentNotes !== undefined && input.attachmentNotes !== null) {
    if (typeof input.attachmentNotes !== "string") {
      return {
        isValid: false,
        errorCode: "INVALID_INPUT",
        message: "Attachment notes must be a string.",
        field: "attachmentNotes",
      };
    }
    if (input.attachmentNotes.trim().length > 500) {
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
