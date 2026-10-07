import { describe, it, expect } from "vitest";
import {
  ALLOWED_TRANSITIONS,
  isValidStatusTransition,
  getAllowedTransitions,
} from "../../src/utils/status-transition-validator.js";
import { TicketStatus } from "@prisma/client";

describe("Lifecycle Status Transition State Machine (UNIT-03, BR-10, BR-11)", () => {
  const allStatuses: TicketStatus[] = [
    "NEW",
    "OPEN",
    "IN_PROGRESS",
    "WAITING_FOR_REQUESTER",
    "RESOLVED",
    "CLOSED",
    "REOPENED",
    "CANCELLED",
  ];

  it("permits exact transitions defined in BR-10 / BR-11 matrix", () => {
    // NEW -> OPEN, IN_PROGRESS, CANCELLED
    expect(isValidStatusTransition("NEW", "OPEN")).toBe(true);
    expect(isValidStatusTransition("NEW", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("NEW", "CANCELLED")).toBe(true);

    // OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
    expect(isValidStatusTransition("OPEN", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("OPEN", "WAITING_FOR_REQUESTER")).toBe(true);
    expect(isValidStatusTransition("OPEN", "CANCELLED")).toBe(true);

    // IN_PROGRESS -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
    expect(isValidStatusTransition("IN_PROGRESS", "WAITING_FOR_REQUESTER")).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "CANCELLED")).toBe(true);

    // WAITING_FOR_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "RESOLVED")).toBe(true);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "CANCELLED")).toBe(true);

    // RESOLVED -> CLOSED, REOPENED
    expect(isValidStatusTransition("RESOLVED", "CLOSED")).toBe(true);
    expect(isValidStatusTransition("RESOLVED", "REOPENED")).toBe(true);

    // CLOSED -> REOPENED
    expect(isValidStatusTransition("CLOSED", "REOPENED")).toBe(true);

    // REOPENED -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
    expect(isValidStatusTransition("REOPENED", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("REOPENED", "WAITING_FOR_REQUESTER")).toBe(true);
    expect(isValidStatusTransition("REOPENED", "CANCELLED")).toBe(true);
  });

  it("rejects unauthorized status jumps (AC-07)", () => {
    // NEW cannot jump directly to RESOLVED or CLOSED
    expect(isValidStatusTransition("NEW", "RESOLVED")).toBe(false);
    expect(isValidStatusTransition("NEW", "CLOSED")).toBe(false);

    // OPEN cannot jump directly to RESOLVED without IN_PROGRESS or WAITING_FOR_REQUESTER
    expect(isValidStatusTransition("OPEN", "RESOLVED")).toBe(false);
    expect(isValidStatusTransition("OPEN", "CLOSED")).toBe(false);

    // CANCELLED is terminal: no outgoing transitions permitted
    for (const target of allStatuses) {
      expect(isValidStatusTransition("CANCELLED", target)).toBe(false);
    }
  });

  it("rejects transitions from a status to itself", () => {
    for (const status of allStatuses) {
      expect(isValidStatusTransition(status, status)).toBe(false);
    }
  });

  it("returns allowed transitions matching getAllowedTransitions", () => {
    expect(getAllowedTransitions("NEW")).toEqual(["OPEN", "IN_PROGRESS", "CANCELLED"]);
    expect(getAllowedTransitions("OPEN")).toEqual([
      "IN_PROGRESS",
      "WAITING_FOR_REQUESTER",
      "CANCELLED",
    ]);
    expect(getAllowedTransitions("CLOSED")).toEqual(["REOPENED"]);
    expect(getAllowedTransitions("CANCELLED")).toEqual([]);
  });
});
