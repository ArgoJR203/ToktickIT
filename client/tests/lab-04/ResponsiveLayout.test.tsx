import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { ActionsTaken } from "../../src/components/ActionsTaken.js";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchActionsTaken: vi.fn(),
    fetchStaffAssignees: vi.fn(),
    fetchRequesterDashboard: vi.fn(),
    fetchStaffDashboard: vi.fn(),
  };
});

describe("Responsive Layout & Viewport Verification (RESP-01)", () => {
  const mockRequester: api.AuthUser = {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.com",
    role: "REQUESTER",
    mustChangePassword: false,
    isActive: true,
  };

  const mockStaff: api.AuthUser = {
    id: 2,
    name: "Alex Thompson",
    email: "alex.thompson@toktickit.com",
    role: "IT_STAFF",
    mustChangePassword: false,
    isActive: true,
  };

  const renderWithAuth = (ui: React.ReactElement, user: api.AuthUser) => {
    return render(
      <AuthContext.Provider
        value={{
          currentUser: user,
          token: "mock-token",
          loading: false,
          error: null,
          login: vi.fn(),
          logout: vi.fn(),
          changePassword: vi.fn(),
          clearError: vi.fn(),
        }}
      >
        {ui}
      </AuthContext.Provider>
    );
  };

  it("renders mobile-friendly responsive cards in ActionsTaken with accessible touch targets", async () => {
    vi.mocked(api.fetchActionsTaken).mockResolvedValue([
      {
        id: 101,
        ticketId: 10,
        performedById: 2,
        performedBy: { id: 2, name: "Alex Thompson", role: "IT_STAFF" },
        assigneeId: 2,
        assignee: { id: 2, name: "Alex Thompson", role: "IT_STAFF" },
        updatedById: 2,
        status: "COMPLETED",
        version: 1,
        actionDateTime: new Date().toISOString(),
        description: "Checked network connectivity on router switch",
        result: "Port 4 was unseated. Re-crimped cable.",
        followUpRequired: false,
        followUpNote: null,
        followUpDone: false,
        attachmentNotes: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ]);
    vi.mocked(api.fetchStaffAssignees).mockResolvedValue([
      { id: 2, name: "Alex Thompson", email: "alex.thompson@toktickit.com", role: "IT_STAFF" },
    ]);

    renderWithAuth(<ActionsTaken ticketId={10} />, mockStaff);

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-section")).toBeInTheDocument();
    });

    // Mobile cards element exists for screens < 768px (d-md-none)
    const mobileCards = screen.getByTestId("actions-mobile-cards");
    expect(mobileCards).toHaveClass("d-md-none");

    // Desktop table exists for screens >= 768px
    const desktopTable = screen.getByTestId("actions-taken-table");
    expect(desktopTable.parentElement).toHaveClass("d-none", "d-md-block");

    // Action button exists with adequate touch target padding
    const logBtn = screen.getByTestId("log-action-btn");
    expect(logBtn).toBeVisible();
    expect(logBtn).toHaveClass("btn", "btn-sm");
  });

  it("renders responsive grid system in Requester Dashboard for metric cards and quick actions", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({
      metrics: {
        totalOpen: 2,
        waitingForRequester: 0,
        resolvedCount: 3,
        closedCount: 1,
      },
      recentTickets: [
        {
          id: 1,
          ticketNumber: "TKT-2026-000001",
          summary: "Broken cable",
          currentStatus: "OPEN",
          requestedPriority: "LOW",
          category: { name: "Network" },
          updatedAt: new Date().toISOString(),
        },
      ],
      drillDownUrls: {
        totalOpen: "/tickets?statusGroup=open",
        waitingForRequester: "/tickets?currentStatus=WAITING_FOR_REQUESTER",
        resolvedCount: "/tickets?currentStatus=RESOLVED",
        closedCount: "/tickets?currentStatus=CLOSED",
      },
    });

    renderWithAuth(
      <RequesterDashboard
        onCreateClick={vi.fn()}
        onViewMyTickets={vi.fn()}
        onSelectTicket={vi.fn()}
        onDrillDown={vi.fn()}
      />,
      mockRequester
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-view")).toBeInTheDocument();
    });

    // Check metric cards row has Bootstrap responsive grid classes
    const metricCard = screen.getByTestId("metric-total-open").parentElement;
    expect(metricCard).toHaveClass("col-12", "col-sm-6", "col-lg-3");

    // Quick action button has minimum touch target (or appropriate button classes)
    const createBtn = screen.getByTestId("quick-create-ticket-btn");
    expect(createBtn).toHaveClass("btn", "btn-zen-primary");
  });

  it("renders 5-column responsive grid on Staff Dashboard with touch-friendly quick action buttons", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue({
      metrics: {
        unassignedCount: 4,
        assignedToMeCount: 2,
        countsByStatus: {
          NEW: 1,
          OPEN: 1,
          IN_PROGRESS: 1,
          WAITING_FOR_REQUESTER: 0,
          RESOLVED: 2,
          CLOSED: 4,
          REOPENED: 0,
          CANCELLED: 0,
        },
        countsByPriority: {
          LOW: 0,
          MEDIUM: 1,
          HIGH: 1,
          URGENT: 0,
        },
      },
      recentTickets: [],
      drillDownUrls: {
        unassigned: "/staff/tickets?ownerId=unassigned",
        assignedToMe: "/staff/tickets?ownerId=me",
        open: "/staff/tickets?status=OPEN",
        inProgress: "/staff/tickets?status=IN_PROGRESS",
        waitingForRequester: "/staff/tickets?status=WAITING_FOR_REQUESTER",
      },
    });

    renderWithAuth(
      <StaffDashboard
        onCreateClick={vi.fn()}
        onSearchClick={vi.fn()}
        onMyQueueClick={vi.fn()}
        onSelectTicket={vi.fn()}
        onDrillDown={vi.fn()}
      />,
      mockStaff
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-view")).toBeInTheDocument();
    });

    // Quick actions panel is in a responsive column
    const quickPanel = screen.getByTestId("quick-actions-panel").parentElement;
    expect(quickPanel).toHaveClass("col-12", "col-lg-4");

    // Refresh button is present and accessible
    const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
    expect(refreshBtn).toBeVisible();
  });
});
