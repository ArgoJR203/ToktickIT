import { describe, it, expect } from "vitest";
import {
  isValidStatusTransition,
  getAllowedTransitions,
  ALLOWED_TRANSITIONS,
} from "../../src/utils/status-transition-validator.js";
import { TicketStatus } from "@prisma/client";

describe("UNIT-02: Status Transition Matrix Validator (BR-14)", () => {
  it("allows valid transitions from NEW", () => {
    expect(isValidStatusTransition("NEW", "OPEN")).toBe(true);
    expect(isValidStatusTransition("NEW", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("NEW", "CANCELLED")).toBe(true);
  });

  it("blocks invalid transitions from NEW (e.g. skipping to RESOLVED or CLOSED)", () => {
    expect(isValidStatusTransition("NEW", "RESOLVED")).toBe(false);
    expect(isValidStatusTransition("NEW", "CLOSED")).toBe(false);
    expect(isValidStatusTransition("NEW", "WAITING_FOR_REQUESTER")).toBe(false);
    expect(isValidStatusTransition("NEW", "REOPENED")).toBe(false);
    expect(isValidStatusTransition("NEW", "NEW")).toBe(false);
  });

  it("allows valid transitions from OPEN", () => {
    expect(isValidStatusTransition("OPEN", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("OPEN", "WAITING_FOR_REQUESTER")).toBe(true);
    expect(isValidStatusTransition("OPEN", "CANCELLED")).toBe(true);
  });

  it("allows valid transitions from IN_PROGRESS", () => {
    expect(isValidStatusTransition("IN_PROGRESS", "WAITING_FOR_REQUESTER")).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "RESOLVED")).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("IN_PROGRESS", "CLOSED")).toBe(false);
  });

  it("allows valid transitions from WAITING_FOR_REQUESTER", () => {
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "RESOLVED")).toBe(true);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("WAITING_FOR_REQUESTER", "OPEN")).toBe(false);
  });

  it("allows valid transitions from RESOLVED", () => {
    expect(isValidStatusTransition("RESOLVED", "CLOSED")).toBe(true);
    expect(isValidStatusTransition("RESOLVED", "REOPENED")).toBe(true);
    expect(isValidStatusTransition("RESOLVED", "IN_PROGRESS")).toBe(false);
    expect(isValidStatusTransition("RESOLVED", "CANCELLED")).toBe(false);
  });

  it("allows valid transitions from CLOSED", () => {
    expect(isValidStatusTransition("CLOSED", "REOPENED")).toBe(true);
    expect(isValidStatusTransition("CLOSED", "RESOLVED")).toBe(false);
    expect(isValidStatusTransition("CLOSED", "IN_PROGRESS")).toBe(false);
    expect(isValidStatusTransition("CLOSED", "CANCELLED")).toBe(false);
  });

  it("allows valid transitions from REOPENED", () => {
    expect(isValidStatusTransition("REOPENED", "IN_PROGRESS")).toBe(true);
    expect(isValidStatusTransition("REOPENED", "WAITING_FOR_REQUESTER")).toBe(true);
    expect(isValidStatusTransition("REOPENED", "CANCELLED")).toBe(true);
    expect(isValidStatusTransition("REOPENED", "RESOLVED")).toBe(false);
  });

  it("enforces CANCELLED as a terminal status with zero allowed transitions", () => {
    expect(getAllowedTransitions("CANCELLED")).toHaveLength(0);

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

    for (const next of allStatuses) {
      expect(isValidStatusTransition("CANCELLED", next)).toBe(false);
    }
  });

  it("disallows transitioning to the same status", () => {
    const statuses: TicketStatus[] = Object.keys(ALLOWED_TRANSITIONS) as TicketStatus[];
    for (const status of statuses) {
      expect(isValidStatusTransition(status, status)).toBe(false);
    }
  });
});
