import { TicketStatus } from "@prisma/client";

/**
 * Permitted status transitions matrix according to BR-14:
 * - NEW -> OPEN, IN_PROGRESS, CANCELLED
 * - OPEN -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
 * - IN_PROGRESS -> WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
 * - WAITING_FOR_REQUESTER -> IN_PROGRESS, RESOLVED, CANCELLED
 * - RESOLVED -> CLOSED, REOPENED
 * - CLOSED -> REOPENED
 * - REOPENED -> IN_PROGRESS, WAITING_FOR_REQUESTER, CANCELLED
 * - CANCELLED is terminal: no transitions allowed.
 */
export const ALLOWED_TRANSITIONS: Record<TicketStatus, readonly TicketStatus[]> = {
  NEW: ["OPEN", "IN_PROGRESS", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  CANCELLED: [],
} as const;

/**
 * Checks if a status transition from currentStatus to nextStatus is permitted.
 */
export function isValidStatusTransition(
  currentStatus: TicketStatus,
  nextStatus: TicketStatus
): boolean {
  if (currentStatus === nextStatus) {
    return false;
  }
  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(nextStatus) : false;
}

/**
 * Returns list of allowed next statuses for a given status.
 */
export function getAllowedTransitions(currentStatus: TicketStatus): readonly TicketStatus[] {
  return ALLOWED_TRANSITIONS[currentStatus] || [];
}
