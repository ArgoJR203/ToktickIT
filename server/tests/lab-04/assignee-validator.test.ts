import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import { validateAssignee } from "../../src/utils/assignee-validator.js";

/**
 * UNIT-05: Action Assignee Active Status Validator (Issue #4-2 / AC-15 / BR-07)
 *
 * Verifies:
 * - Active IT_STAFF user is accepted
 * - Active ADMINISTRATOR user is accepted
 * - Inactive staff/admin user is rejected with INACTIVE_ASSIGNEE
 * - REQUESTER user is rejected with INACTIVE_ASSIGNEE
 * - Non-existent user (null/undefined) is rejected with USER_NOT_FOUND
 */

describe("UNIT-05: Action Assignee Active Status Validator", () => {
  it("accepts an active IT_STAFF user as assignee", () => {
    const result = validateAssignee({
      id: 7,
      role: Role.IT_STAFF,
      isActive: true,
    });
    expect(result.isValid).toBe(true);
  });

  it("accepts an active ADMINISTRATOR user as assignee", () => {
    const result = validateAssignee({
      id: 11,
      role: Role.ADMINISTRATOR,
      isActive: true,
    });
    expect(result.isValid).toBe(true);
  });

  it("rejects an inactive IT_STAFF user (AC-15 / BR-07)", () => {
    const result = validateAssignee({
      id: 10,
      role: Role.IT_STAFF,
      isActive: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("INACTIVE_ASSIGNEE");
    expect(result.message).toContain("inactive");
  });

  it("rejects an inactive ADMINISTRATOR user (AC-15)", () => {
    const result = validateAssignee({
      id: 11,
      role: Role.ADMINISTRATOR,
      isActive: false,
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("INACTIVE_ASSIGNEE");
  });

  it("rejects a REQUESTER role user from being assigned an action", () => {
    const result = validateAssignee({
      id: 1,
      role: Role.REQUESTER,
      isActive: true,
    });
    expect(result.isValid).toBe(false);
    expect(result.errorCode).toBe("INACTIVE_ASSIGNEE");
    expect(result.message).toContain("IT_STAFF or ADMINISTRATOR");
  });

  it("rejects null or undefined candidate user", () => {
    const nullResult = validateAssignee(null);
    expect(nullResult.isValid).toBe(false);
    expect(nullResult.errorCode).toBe("USER_NOT_FOUND");

    const undefResult = validateAssignee(undefined);
    expect(undefResult.isValid).toBe(false);
    expect(undefResult.errorCode).toBe("USER_NOT_FOUND");
  });
});
