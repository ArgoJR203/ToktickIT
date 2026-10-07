/**
 * Concurrency Version Validator (UNIT-02, BR-14, AC-08)
 * Validates version format and verifies optimistic locking match logic.
 */

export interface VersionValidationResult {
  isValid: boolean;
  version?: number;
  errorCode?: "INVALID_INPUT" | "STALE_UPDATE";
  message?: string;
}

/**
 * Validates that a submitted version is a positive integer.
 */
export function parseAndValidateVersion(rawVersion: unknown): {
  isValid: boolean;
  version?: number;
  error?: string;
} {
  if (rawVersion === undefined || rawVersion === null) {
    return { isValid: false, error: "Version is required." };
  }

  if (typeof rawVersion === "string" && !/^\d+$/.test(rawVersion.trim())) {
    return { isValid: false, error: "Version must be a positive integer." };
  }

  const parsed = Number(rawVersion);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return { isValid: false, error: "Version must be a positive integer." };
  }

  return { isValid: true, version: parsed };
}

/**
 * Validates optimistic lock matching between submitted version and current record version.
 * Returns match status and standardized STALE_UPDATE error if mismatched.
 */
export function validateOptimisticLock(
  submittedVersion: number,
  currentVersion: number
): {
  isMatch: boolean;
  error?: {
    code: "STALE_UPDATE";
    message: string;
  };
} {
  if (submittedVersion !== currentVersion) {
    return {
      isMatch: false,
      error: {
        code: "STALE_UPDATE",
        message: "Record has been modified by another user. Please reload the latest data.",
      },
    };
  }

  return { isMatch: true };
}
