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
 * Strictly rejects booleans, objects, floats, hex strings ("0x10"), and non-positive numbers.
 */
export function parseAndValidateVersion(rawVersion: unknown): {
  isValid: boolean;
  version?: number;
  error?: string;
} {
  if (rawVersion === undefined || rawVersion === null) {
    return { isValid: false, error: "Version is required." };
  }

  // Reject booleans, objects, arrays, symbols, functions
  if (typeof rawVersion !== "number" && typeof rawVersion !== "string") {
    return { isValid: false, error: "Version must be a positive integer." };
  }

  // If string, strictly digits only (no hex 0x..., no signs +/-, no scientific notation, no decimals)
  if (typeof rawVersion === "string") {
    const trimmed = rawVersion.trim();
    if (!/^\d+$/.test(trimmed)) {
      return { isValid: false, error: "Version must be a positive integer." };
    }
    const parsed = parseInt(trimmed, 10);
    if (parsed <= 0) {
      return { isValid: false, error: "Version must be a positive integer." };
    }
    return { isValid: true, version: parsed };
  }

  // If number, must be positive safe integer
  if (!Number.isInteger(rawVersion) || rawVersion <= 0) {
    return { isValid: false, error: "Version must be a positive integer." };
  }

  return { isValid: true, version: rawVersion };
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
        message: "Ticket has been modified by another user. Please reload the latest ticket data.",
      },
    };
  }

  return { isMatch: true };
}
