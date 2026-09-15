/**
 * Admin Safety Validator
 * Satisfies BR-21, BR-22, AC-14, AC-15, and UNIT-04.
 */

export interface ValidationResult {
  allowed: boolean;
  code?: string;
  message?: string;
}

/**
 * Validates that an Administrator is not deactivating their own account (BR-21).
 *
 * @param currentAdminId The ID of the authenticated administrator making the request
 * @param targetUserId The ID of the user being modified
 * @param targetIsActive The requested new active status (true/false)
 */
export function validateSelfDeactivation(
  currentAdminId: number,
  targetUserId: number,
  targetIsActive?: boolean
): ValidationResult {
  if (targetIsActive === false && currentAdminId === targetUserId) {
    return {
      allowed: false,
      code: "ADMIN_SAFETY_VIOLATION",
      message: "Administrators cannot deactivate their own account.",
    };
  }
  return { allowed: true };
}

/**
 * Validates that the action does not deactivate or demote the last active Administrator (BR-22).
 *
 * @param activeAdminCount The total number of active ADMINISTRATOR users currently in the system
 * @param targetUserCurrentRole The current role of the target user ('REQUESTER', 'IT_STAFF', 'ADMINISTRATOR')
 * @param nextRole The proposed new role (if role change is requested)
 * @param nextIsActive The proposed new active status (if active state change is requested)
 */
export function validateLastAdminPreservation(
  activeAdminCount: number,
  targetUserCurrentRole: string,
  nextRole?: string,
  nextIsActive?: boolean
): ValidationResult {
  // Only applies if the target user is currently an active Administrator
  if (targetUserCurrentRole !== "ADMINISTRATOR") {
    return { allowed: true };
  }

  // If there is only 1 active administrator remaining:
  if (activeAdminCount <= 1) {
    // 1. Check if deactivation is being attempted
    if (nextIsActive === false) {
      return {
        allowed: false,
        code: "ADMIN_SAFETY_VIOLATION",
        message: "Cannot deactivate the last active Administrator in the system.",
      };
    }

    // 2. Check if demotion (role change away from ADMINISTRATOR) is being attempted
    if (nextRole && nextRole !== "ADMINISTRATOR") {
      return {
        allowed: false,
        code: "ADMIN_SAFETY_VIOLATION",
        message: "Cannot change the role of the last active Administrator in the system.",
      };
    }
  }

  return { allowed: true };
}
