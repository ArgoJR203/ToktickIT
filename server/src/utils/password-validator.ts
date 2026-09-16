/**
 * Validates password complexity adhering to BR-07:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number or special character
 */
export function validatePasswordComplexity(password: unknown): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (typeof password !== "string") {
    return {
      valid: false,
      errors: ["Password must be a string."],
    };
  }

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters in length.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter.");
  }

  // Number or special character
  if (!/[0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password)) {
    errors.push("Password must contain at least one number or special character.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
