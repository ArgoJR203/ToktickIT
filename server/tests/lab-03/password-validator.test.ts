import { describe, it, expect } from "vitest";
import { validatePasswordComplexity } from "../../src/utils/password-validator.js";

describe("UNIT-01: Password Complexity Validator (BR-07)", () => {
  it("accepts valid passwords meeting all criteria", () => {
    const validPasswords = [
      "Password123!",
      "Secure#2026",
      "ValidPass1$",
      "StrongP@ss99",
      "Abcd1234!",
    ];

    for (const pwd of validPasswords) {
      const res = validatePasswordComplexity(pwd);
      expect(res.valid).toBe(true);
      expect(res.errors).toHaveLength(0);
    }
  });

  it("rejects passwords with length < 8 characters", () => {
    const shortPasswords = ["Pass1!", "Short1$", "Ab1!", ""];

    for (const pwd of shortPasswords) {
      const res = validatePasswordComplexity(pwd);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("8 characters"))).toBe(true);
    }
  });

  it("rejects passwords without uppercase letters", () => {
    const noUpper = ["password123!", "lowercase#1", "no_upper_99"];

    for (const pwd of noUpper) {
      const res = validatePasswordComplexity(pwd);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("uppercase"))).toBe(true);
    }
  });

  it("rejects passwords without lowercase letters", () => {
    const noLower = ["PASSWORD123!", "UPPERCASE#1", "NO_LOWER_99"];

    for (const pwd of noLower) {
      const res = validatePasswordComplexity(pwd);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("lowercase"))).toBe(true);
    }
  });

  it("rejects passwords without numbers or special characters", () => {
    const noNumOrSpec = ["PasswordOnly", "SimpleLetters", "VeryLongPasswordWithoutNumbers"];

    for (const pwd of noNumOrSpec) {
      const res = validatePasswordComplexity(pwd);
      expect(res.valid).toBe(false);
      expect(res.errors.some((e) => e.includes("number or special character"))).toBe(true);
    }
  });

  it("rejects non-string values gracefully", () => {
    expect(validatePasswordComplexity(null).valid).toBe(false);
    expect(validatePasswordComplexity(undefined).valid).toBe(false);
    expect(validatePasswordComplexity(12345678).valid).toBe(false);
  });
});
