import { describe, it, expect } from "vitest";
import {
  calculateRequesterMetrics,
  calculateStaffMetrics,
  calculateAdminUserStats,
} from "../../src/utils/dashboard-calculator.js";
import { TicketStatus, ITPriority, Role } from "@prisma/client";

describe("Dashboard Operational Metrics Calculator (UNIT-04, BR-16, BR-18)", () => {
  describe("calculateRequesterMetrics (BR-15, AC-02)", () => {
    it("returns zero counts cleanly for empty tickets array", () => {
      const res = calculateRequesterMetrics([]);
      expect(res).toEqual({
        totalOpen: 0,
        waitingForRequester: 0,
        resolvedCount: 0,
        closedCount: 0,
      });
    });

    it("accurately computes aggregate counts across open, waiting, resolved, and closed tickets", () => {
      const tickets: Array<{ currentStatus: TicketStatus }> = [
        { currentStatus: "NEW" },
        { currentStatus: "OPEN" },
        { currentStatus: "IN_PROGRESS" },
        { currentStatus: "WAITING_FOR_REQUESTER" },
        { currentStatus: "REOPENED" },
        { currentStatus: "RESOLVED" },
        { currentStatus: "RESOLVED" },
        { currentStatus: "CLOSED" },
        { currentStatus: "CLOSED" },
        { currentStatus: "CLOSED" },
        { currentStatus: "CANCELLED" },
      ];

      const res = calculateRequesterMetrics(tickets);

      // totalOpen = NEW (1) + OPEN (1) + IN_PROGRESS (1) + WAITING_FOR_REQUESTER (1) + REOPENED (1) = 5
      expect(res.totalOpen).toBe(5);
      // waitingForRequester = 1
      expect(res.waitingForRequester).toBe(1);
      // resolvedCount = 2
      expect(res.resolvedCount).toBe(2);
      // closedCount = 3
      expect(res.closedCount).toBe(3);
    });
  });

  describe("calculateStaffMetrics (BR-16, AC-10)", () => {
    it("returns zero states cleanly with all 8 statuses and 4 priorities initialized for empty array", () => {
      const res = calculateStaffMetrics([], 7);

      expect(res.unassignedCount).toBe(0);
      expect(res.assignedToMeCount).toBe(0);
      expect(res.countsByStatus).toEqual({
        NEW: 0,
        OPEN: 0,
        IN_PROGRESS: 0,
        WAITING_FOR_REQUESTER: 0,
        RESOLVED: 0,
        CLOSED: 0,
        REOPENED: 0,
        CANCELLED: 0,
      });
      expect(res.countsByPriority).toEqual({
        LOW: 0,
        MEDIUM: 0,
        HIGH: 0,
        URGENT: 0,
      });
    });

    it("accurately computes unassigned and assignedToMe counts, excluding terminal statuses", () => {
      const staffId = 7;
      const otherStaffId = 8;

      const tickets: Array<{
        ownerId: number | null;
        currentStatus: TicketStatus;
        itPriority: ITPriority;
      }> = [
        // Unassigned non-terminal
        { ownerId: null, currentStatus: "OPEN", itPriority: "HIGH" },
        { ownerId: null, currentStatus: "IN_PROGRESS", itPriority: "URGENT" },
        // Assigned to me non-terminal
        { ownerId: staffId, currentStatus: "IN_PROGRESS", itPriority: "MEDIUM" },
        { ownerId: staffId, currentStatus: "WAITING_FOR_REQUESTER", itPriority: "LOW" },
        // Assigned to other staff non-terminal
        { ownerId: otherStaffId, currentStatus: "OPEN", itPriority: "MEDIUM" },
        // Unassigned terminal (must NOT be counted in unassignedCount)
        { ownerId: null, currentStatus: "CLOSED", itPriority: "HIGH" },
        { ownerId: null, currentStatus: "CANCELLED", itPriority: "LOW" },
        // Assigned to me terminal (must NOT be counted in assignedToMeCount)
        { ownerId: staffId, currentStatus: "CLOSED", itPriority: "URGENT" },
        { ownerId: staffId, currentStatus: "CANCELLED", itPriority: "MEDIUM" },
      ];

      const res = calculateStaffMetrics(tickets, staffId);

      expect(res.unassignedCount).toBe(2);
      expect(res.assignedToMeCount).toBe(2);

      // Status totals across all tickets
      expect(res.countsByStatus.OPEN).toBe(2);
      expect(res.countsByStatus.IN_PROGRESS).toBe(2);
      expect(res.countsByStatus.WAITING_FOR_REQUESTER).toBe(1);
      expect(res.countsByStatus.CLOSED).toBe(2);
      expect(res.countsByStatus.CANCELLED).toBe(2);

      // Priority counts strictly on non-terminal tickets (5 tickets)
      // HIGH: 1, URGENT: 1, MEDIUM: 2, LOW: 1
      expect(res.countsByPriority).toEqual({
        LOW: 1,
        MEDIUM: 2,
        HIGH: 1,
        URGENT: 1,
      });
    });
  });

  describe("calculateAdminUserStats (BR-17, AC-11)", () => {
    it("accurately computes totalUsers, activeUsers, and role distribution", () => {
      const users: Array<{ isActive: boolean; role: Role }> = [
        { isActive: true, role: "REQUESTER" },
        { isActive: true, role: "REQUESTER" },
        { isActive: false, role: "REQUESTER" }, // Inactive requester
        { isActive: true, role: "IT_STAFF" },
        { isActive: true, role: "IT_STAFF" },
        { isActive: false, role: "IT_STAFF" }, // Inactive staff
        { isActive: true, role: "ADMINISTRATOR" },
      ];

      const res = calculateAdminUserStats(users);

      expect(res.totalUsers).toBe(7);
      expect(res.activeUsers).toBe(5);
      expect(res.usersByRole).toEqual({
        REQUESTER: 3,
        IT_STAFF: 3,
        ADMINISTRATOR: 1,
      });
    });
  });

  describe("formatStaffOperationalMetrics & formatAdminUserStats & formatRequesterMetrics (Production DB Formatters)", () => {
    it("formatStaffOperationalMetrics populates all 8 statuses and 4 priorities with defaults", async () => {
      const { formatStaffOperationalMetrics } = await import("../../src/utils/dashboard-calculator.js");
      const res = formatStaffOperationalMetrics(
        3,
        2,
        [
          { currentStatus: "OPEN", _count: { _all: 5 } },
          { currentStatus: "RESOLVED", _count: { _all: 8 } },
        ],
        [
          { itPriority: "URGENT", _count: { _all: 2 } },
          { itPriority: "HIGH", _count: { _all: 4 } },
        ]
      );

      expect(res.unassignedCount).toBe(3);
      expect(res.assignedToMeCount).toBe(2);
      expect(res.countsByStatus.OPEN).toBe(5);
      expect(res.countsByStatus.RESOLVED).toBe(8);
      expect(res.countsByStatus.CLOSED).toBe(0); // Defaulted
      expect(res.countsByPriority.URGENT).toBe(2);
      expect(res.countsByPriority.LOW).toBe(0); // Defaulted
    });

    it("formatAdminUserStats aggregates user count and role distributions", async () => {
      const { formatAdminUserStats } = await import("../../src/utils/dashboard-calculator.js");
      const res = formatAdminUserStats(11, 9, [
        { role: "REQUESTER", _count: { _all: 6 } },
        { role: "IT_STAFF", _count: { _all: 4 } },
        { role: "ADMINISTRATOR", _count: { _all: 1 } },
      ]);

      expect(res.totalUsers).toBe(11);
      expect(res.activeUsers).toBe(9);
      expect(res.usersByRole).toEqual({
        REQUESTER: 6,
        IT_STAFF: 4,
        ADMINISTRATOR: 1,
      });
    });

    it("formatRequesterMetrics formats requester metric contract", async () => {
      const { formatRequesterMetrics } = await import("../../src/utils/dashboard-calculator.js");
      const res = formatRequesterMetrics(3, 1, 2, 5);

      expect(res).toEqual({
        totalOpen: 3,
        waitingForRequester: 1,
        resolvedCount: 2,
        closedCount: 5,
      });
    });
  });
});
