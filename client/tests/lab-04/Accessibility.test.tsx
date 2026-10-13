import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { Header } from "../../src/components/Header.js";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchRequesterDashboard: vi.fn(),
    fetchStaffDashboard: vi.fn(),
  };
});

describe("DOM Accessibility & ARIA Semantic Verification (A11Y-01)", () => {
  const mockStaffUser: api.AuthUser = {
    id: 1,
    name: "Alex Thompson",
    email: "alex.thompson@toktickit.com",
    role: "IT_STAFF",
    mustChangePassword: false,
    isActive: true,
  };

  const mockRequesterUser: api.AuthUser = {
    id: 2,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.com",
    role: "REQUESTER",
    mustChangePassword: false,
    isActive: true,
  };

  const renderWithAuth = (ui: React.ReactElement, user: api.AuthUser = mockStaffUser) => {
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

  it("enforces aria-current='page' on active navigation tab in Header", () => {
    renderWithAuth(
      <Header
        activeTab="dashboard"
        onTabChange={vi.fn()}
      />,
      mockStaffUser
    );

    const dashboardTab = screen.getByTestId("nav-dashboard-tab");
    expect(dashboardTab).toHaveAttribute("aria-current", "page");

    const queueTab = screen.getByTestId("nav-ticket-queue-tab");
    expect(queueTab).not.toHaveAttribute("aria-current");
  });

  it("provides accessible screen-reader labels and status cues on Requester Dashboard", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({
      metrics: {
        totalOpen: 3,
        waitingForRequester: 1,
        resolvedCount: 4,
        closedCount: 2,
      },
      recentTickets: [
        {
          id: 10,
          ticketNumber: "TKT-2026-000010",
          summary: "Monitor display blinking",
          currentStatus: "WAITING_FOR_REQUESTER",
          requestedPriority: "MEDIUM",
          category: { name: "Hardware" },
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
      mockRequesterUser
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-view")).toBeInTheDocument();
    });

    // Refresh button has text label and accessible button role
    const refreshBtn = screen.getByTestId("refresh-dashboard-btn");
    expect(refreshBtn).toHaveAccessibleName(/refresh/i);

    // Drill down buttons have accessible names
    const totalOpenDrill = screen.getByTestId("drilldown-total-open");
    expect(totalOpenDrill).toBeInTheDocument();
    expect(totalOpenDrill).toHaveAccessibleName(/view active requests/i);

    // Status badge provides dual visual cue (badge class + clear text)
    const statusBadges = screen.getAllByText("Waiting on Me");
    expect(statusBadges.some((el) => el.classList.contains("badge"))).toBe(true);
  });

  it("provides accessible headings, aria labels, and admin metrics on Staff Dashboard", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue({
      metrics: {
        unassignedCount: 2,
        assignedToMeCount: 1,
        countsByStatus: {
          NEW: 1,
          OPEN: 1,
          IN_PROGRESS: 0,
          WAITING_FOR_REQUESTER: 0,
          RESOLVED: 1,
          CLOSED: 1,
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
      adminStats: {
        totalUsers: 11,
        activeUsers: 9,
        usersByRole: {
          REQUESTER: 6,
          IT_STAFF: 4,
          ADMINISTRATOR: 1,
        },
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
      mockStaffUser
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-view")).toBeInTheDocument();
    });

    // Semantic headings present
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Quick Actions" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Admin Statistics" })).toBeInTheDocument();

    // Metric numerals are distinguishable
    const unassignedCard = screen.getByTestId("metric-unassigned");
    expect(unassignedCard).toHaveTextContent("2");
  });
});
