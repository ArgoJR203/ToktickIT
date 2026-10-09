import { TicketStatus, ITPriority, Role } from "@prisma/client";

/**
 * Pure Dashboard Metrics Calculator (UNIT-04, BR-16, BR-18)
 * Provides authoritative algorithms for computing role dashboard metrics from ticket & user sets.
 */

export interface RequesterMetrics {
  totalOpen: number;
  waitingForRequester: number;
  resolvedCount: number;
  closedCount: number;
}

export interface StaffOperationalMetrics {
  unassignedCount: number;
  assignedToMeCount: number;
  countsByStatus: Record<TicketStatus, number>;
  countsByPriority: Record<ITPriority, number>;
}

export interface AdminUserStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<Role, number>;
}

const ALL_STATUSES: TicketStatus[] = [
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "REOPENED",
  "CANCELLED",
];

const ALL_PRIORITIES: ITPriority[] = ["LOW", "MEDIUM", "HIGH", "URGENT"];

const ALL_ROLES: Role[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

const OPEN_STATUS_SET = new Set<TicketStatus>([
  "NEW",
  "OPEN",
  "IN_PROGRESS",
  "WAITING_FOR_REQUESTER",
  "REOPENED",
]);

const TERMINAL_STATUS_SET = new Set<TicketStatus>(["CLOSED", "CANCELLED"]);

/**
 * Calculates requester metrics from a list of tickets owned by the requester.
 * (BR-15, AC-02)
 */
export function calculateRequesterMetrics(
  tickets: Array<{ currentStatus: TicketStatus }>
): RequesterMetrics {
  let totalOpen = 0;
  let waitingForRequester = 0;
  let resolvedCount = 0;
  let closedCount = 0;

  for (const ticket of tickets) {
    if (OPEN_STATUS_SET.has(ticket.currentStatus)) {
      totalOpen++;
    }
    if (ticket.currentStatus === "WAITING_FOR_REQUESTER") {
      waitingForRequester++;
    }
    if (ticket.currentStatus === "RESOLVED") {
      resolvedCount++;
    }
    if (ticket.currentStatus === "CLOSED") {
      closedCount++;
    }
  }

  return {
    totalOpen,
    waitingForRequester,
    resolvedCount,
    closedCount,
  };
}

/**
 * Calculates IT Staff operational metrics from tickets and current staff user ID.
 * (BR-16, AC-10)
 */
export function calculateStaffMetrics(
  tickets: Array<{
    ownerId: number | null;
    currentStatus: TicketStatus;
    itPriority: ITPriority;
  }>,
  staffUserId: number
): StaffOperationalMetrics {
  let unassignedCount = 0;
  let assignedToMeCount = 0;

  const countsByStatus: Record<TicketStatus, number> = {
    NEW: 0,
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_FOR_REQUESTER: 0,
    RESOLVED: 0,
    CLOSED: 0,
    REOPENED: 0,
    CANCELLED: 0,
  };

  const countsByPriority: Record<ITPriority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };

  for (const ticket of tickets) {
    // Status count over all tickets
    if (countsByStatus[ticket.currentStatus] !== undefined) {
      countsByStatus[ticket.currentStatus]++;
    }

    const isNonTerminal = !TERMINAL_STATUS_SET.has(ticket.currentStatus);

    if (isNonTerminal) {
      if (ticket.ownerId === null) {
        unassignedCount++;
      } else if (ticket.ownerId === staffUserId) {
        assignedToMeCount++;
      }

      if (countsByPriority[ticket.itPriority] !== undefined) {
        countsByPriority[ticket.itPriority]++;
      }
    }
  }

  return {
    unassignedCount,
    assignedToMeCount,
    countsByStatus,
    countsByPriority,
  };
}

/**
 * Calculates Administrator user metrics from a list of user accounts.
 * (BR-17, AC-11)
 */
export function calculateAdminUserStats(
  users: Array<{ isActive: boolean; role: Role }>
): AdminUserStats {
  const usersByRole: Record<Role, number> = {
    REQUESTER: 0,
    IT_STAFF: 0,
    ADMINISTRATOR: 0,
  };

  let activeUsers = 0;

  for (const user of users) {
    if (user.isActive) {
      activeUsers++;
    }
    if (usersByRole[user.role] !== undefined) {
      usersByRole[user.role]++;
    }
  }

  return {
    totalUsers: users.length,
    activeUsers,
    usersByRole,
  };
}

/**
 * Formats and validates staff operational metrics from database query results (AC-10, BR-16).
 * Ensures all 8 statuses and 4 priorities are populated with defaults.
 */
export function formatStaffOperationalMetrics(
  unassignedCount: number,
  assignedToMeCount: number,
  statusGroups: Array<{ currentStatus: TicketStatus; _count: { _all: number } }>,
  priorityGroups: Array<{ itPriority: ITPriority; _count: { _all: number } }>
): StaffOperationalMetrics {
  const countsByStatus: Record<TicketStatus, number> = {
    NEW: 0,
    OPEN: 0,
    IN_PROGRESS: 0,
    WAITING_FOR_REQUESTER: 0,
    RESOLVED: 0,
    CLOSED: 0,
    REOPENED: 0,
    CANCELLED: 0,
  };
  for (const sg of statusGroups) {
    if (sg.currentStatus in countsByStatus) {
      countsByStatus[sg.currentStatus] = sg._count._all;
    }
  }

  const countsByPriority: Record<ITPriority, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
    URGENT: 0,
  };
  for (const pg of priorityGroups) {
    if (pg.itPriority in countsByPriority) {
      countsByPriority[pg.itPriority] = pg._count._all;
    }
  }

  return {
    unassignedCount,
    assignedToMeCount,
    countsByStatus,
    countsByPriority,
  };
}

/**
 * Formats and validates Administrator user statistics from database query results (AC-11, BR-17).
 */
export function formatAdminUserStats(
  totalUsers: number,
  activeUsers: number,
  roleGroups: Array<{ role: Role; _count: { _all: number } }>
): AdminUserStats {
  const usersByRole: Record<Role, number> = {
    REQUESTER: 0,
    IT_STAFF: 0,
    ADMINISTRATOR: 0,
  };
  for (const rg of roleGroups) {
    if (rg.role in usersByRole) {
      usersByRole[rg.role] = rg._count._all;
    }
  }

  return {
    totalUsers,
    activeUsers,
    usersByRole,
  };
}

/**
 * Formats and validates Requester metrics into standard contract shape (AC-02, BR-15).
 */
export function formatRequesterMetrics(
  totalOpen: number,
  waitingForRequester: number,
  resolvedCount: number,
  closedCount: number
): RequesterMetrics {
  return {
    totalOpen,
    waitingForRequester,
    resolvedCount,
    closedCount,
  };
}
