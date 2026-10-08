import { describe, it, expect } from "vitest";
import {
  parseAndValidateVersion,
  validateOptimisticLock,
} from "../../src/utils/concurrency-validator.js";

describe("Optimistic Concurrency Version Validator (UNIT-02, BR-14, AC-08)", () => {
  describe("parseAndValidateVersion", () => {
    it("accepts valid positive integer version", () => {
      const res = parseAndValidateVersion(1);
      expect(res.isValid).toBe(true);
      expect(res.version).toBe(1);
      expect(res.error).toBeUndefined();
    });

    it("accepts string representation of positive integer", () => {
      const res = parseAndValidateVersion("42");
      expect(res.isValid).toBe(true);
      expect(res.version).toBe(42);
    });

    it("rejects non-positive integers (0, negative)", () => {
      expect(parseAndValidateVersion(0).isValid).toBe(false);
      expect(parseAndValidateVersion(-1).isValid).toBe(false);
      expect(parseAndValidateVersion("-5").isValid).toBe(false);
    });

    it("rejects non-integer floating point numbers", () => {
      expect(parseAndValidateVersion(1.5).isValid).toBe(false);
      expect(parseAndValidateVersion("2.3").isValid).toBe(false);
    });

    it("rejects non-numeric strings, hex strings, booleans, and null/undefined", () => {
      expect(parseAndValidateVersion("abc").isValid).toBe(false);
      expect(parseAndValidateVersion("0x10").isValid).toBe(false);
      expect(parseAndValidateVersion(true).isValid).toBe(false);
      expect(parseAndValidateVersion(false).isValid).toBe(false);
      expect(parseAndValidateVersion(null).isValid).toBe(false);
      expect(parseAndValidateVersion(undefined).isValid).toBe(false);
      expect(parseAndValidateVersion("").isValid).toBe(false);
    });
  });

  describe("validateOptimisticLock", () => {
    it("accepts matching versions", () => {
      const res = validateOptimisticLock(3, 3);
      expect(res.isMatch).toBe(true);
      expect(res.error).toBeUndefined();
    });

    it("rejects mismatched submitted version against current record version", () => {
      const res = validateOptimisticLock(1, 2);
      expect(res.isMatch).toBe(false);
      expect(res.error).toBeDefined();
      expect(res.error?.code).toBe("STALE_UPDATE");
      expect(res.error?.message).toContain("modified by another user");
    });

    it("rejects older submitted version when current version has advanced", () => {
      const res = validateOptimisticLock(2, 5);
      expect(res.isMatch).toBe(false);
      expect(res.error?.code).toBe("STALE_UPDATE");
    });
  });
});
