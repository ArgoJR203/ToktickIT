import { Role } from "@prisma/client";

/**
 * Assignee Validator Utility (Issue #4-2 / UNIT-05 / AC-15 / BR-07)
 *
 * Enforces business rules:
 * - BR-07: Assignee must be an active user with role IT_STAFF or ADMINISTRATOR
 * - AC-15: Assigning an inactive staff account or non-staff user is rejected
 */

export interface AssigneeCandidate {
  id: number;
  role: Role;
  isActive: boolean;
}

export interface AssigneeValidationResult {
  isValid: boolean;
  errorCode?: "INACTIVE_ASSIGNEE" | "USER_NOT_FOUND";
  message?: string;
}

export function validateAssignee(user: AssigneeCandidate | null | undefined): AssigneeValidationResult {
  if (!user) {
    return {
      isValid: false,
      errorCode: "INACTIVE_ASSIGNEE",
      message: "Designated assignee does not exist or is not valid.",
    };
  }

  if (!user.isActive) {
    return {
      isValid: false,
      errorCode: "INACTIVE_ASSIGNEE",
      message: "Assignee user account is inactive.",
    };
  }

  if (user.role !== Role.IT_STAFF && user.role !== Role.ADMINISTRATOR) {
    return {
      isValid: false,
      errorCode: "INACTIVE_ASSIGNEE",
      message: "Assignee must have role IT_STAFF or ADMINISTRATOR.",
    };
  }

  return { isValid: true };
}
