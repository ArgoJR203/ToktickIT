import { describe, it, expect } from "vitest";
import {
  validateSelfDeactivation,
  validateLastAdminPreservation,
} from "../../src/utils/admin-safety-validator.js";

describe("UNIT-04: Administrator Safety Constraints Validator (BR-21, BR-22, AC-14, AC-15)", () => {
  describe("validateSelfDeactivation (BR-21, AC-14)", () => {
    it("allows an Administrator to edit their own profile while keeping isActive true", () => {
      const result = validateSelfDeactivation(1, 1, true);
      expect(result.allowed).toBe(true);
    });

    it("allows an Administrator to edit another user's active status", () => {
      const result = validateSelfDeactivation(1, 2, false);
      expect(result.allowed).toBe(true);
    });

    it("blocks an Administrator from deactivating their own account (targetIsActive = false)", () => {
      const result = validateSelfDeactivation(1, 1, false);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("ADMIN_SAFETY_VIOLATION");
      expect(result.message).toContain("cannot deactivate their own account");
    });
  });

  describe("validateLastAdminPreservation (BR-22, AC-15)", () => {
    it("allows deactivating or demoting an admin if there are multiple active admins (count > 1)", () => {
      // Deactivating one admin when 2 active admins exist
      const deactResult = validateLastAdminPreservation(2, "ADMINISTRATOR", undefined, false);
      expect(deactResult.allowed).toBe(true);

      // Changing role of one admin when 2 active admins exist
      const roleResult = validateLastAdminPreservation(2, "ADMINISTRATOR", "IT_STAFF", true);
      expect(roleResult.allowed).toBe(true);
    });

    it("blocks deactivating the sole active Administrator (count = 1)", () => {
      const result = validateLastAdminPreservation(1, "ADMINISTRATOR", undefined, false);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("ADMIN_SAFETY_VIOLATION");
      expect(result.message).toContain("last active Administrator");
    });

    it("blocks changing the role of the sole active Administrator (demotion)", () => {
      const result = validateLastAdminPreservation(1, "ADMINISTRATOR", "IT_STAFF", true);
      expect(result.allowed).toBe(false);
      expect(result.code).toBe("ADMIN_SAFETY_VIOLATION");
      expect(result.message).toContain("last active Administrator");
    });

    it("allows editing non-admin users even when only 1 admin exists", () => {
      const requesterResult = validateLastAdminPreservation(1, "REQUESTER", "IT_STAFF", false);
      expect(requesterResult.allowed).toBe(true);

      const staffResult = validateLastAdminPreservation(1, "IT_STAFF", "REQUESTER", false);
      expect(staffResult.allowed).toBe(true);
    });

    it("allows updating sole admin's profile when role remains ADMINISTRATOR and active remains true", () => {
      const result = validateLastAdminPreservation(1, "ADMINISTRATOR", "ADMINISTRATOR", true);
      expect(result.allowed).toBe(true);
    });
  });
});
