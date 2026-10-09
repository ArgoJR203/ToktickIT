import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import React from "react";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

// Mock API
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchStaffDashboard: vi.fn(),
  };
});

const mockStaffUser: api.AuthUser = {
  id: 7,
  name: "Alex Thompson",
  email: "alex.thompson@toktickit.com",
  role: "IT_STAFF",
  mustChangePassword: false,
  isActive: true,
};

const mockAdminUser: api.AuthUser = {
  id: 11,
  name: "John Smith",
  email: "john.smith@toktickit.com",
  role: "ADMINISTRATOR",
  mustChangePassword: false,
  isActive: true,
};

const mockStaffDashboardData: api.StaffDashboardData = {
  metrics: {
    unassignedCount: 4,
    assignedToMeCount: 2,
    countsByStatus: {
      NEW: 1,
      OPEN: 3,
      IN_PROGRESS: 2,
      WAITING_FOR_REQUESTER: 1,
      RESOLVED: 5,
      CLOSED: 10,
      REOPENED: 0,
      CANCELLED: 0,
    },
    countsByPriority: {
      URGENT: 1,
      HIGH: 2,
      MEDIUM: 2,
      LOW: 1,
    },
  },
  recentTickets: [
    {
      id: 201,
      ticketNumber: "TICK-201",
      summary: "Database latency spike on cluster B",
      currentStatus: "IN_PROGRESS",
      itPriority: "HIGH",
      updatedAt: "2026-05-12T15:00:00.000Z",
      requester: { name: "Jennifer Anderson" },
      owner: { id: 7, name: "Alex Thompson" },
    },
    {
      id: 202,
      ticketNumber: "TICK-202",
      summary: "Keyboard replacement for workstation 4",
      currentStatus: "OPEN",
      itPriority: "LOW",
      updatedAt: "2026-05-12T11:00:00.000Z",
      requester: { name: "David Kim" },
      owner: null,
    },
  ],
  drillDownUrls: {
    unassigned: "/api/tickets?ownerId=unassigned",
    assignedToMe: "/api/tickets?ownerId=me",
    open: "/api/tickets?currentStatus=OPEN",
    inProgress: "/api/tickets?currentStatus=IN_PROGRESS",
    waitingForRequester: "/api/tickets?currentStatus=WAITING_FOR_REQUESTER",
  },
};

const mockAdminDashboardData: api.StaffDashboardData = {
  ...mockStaffDashboardData,
  adminStats: {
    totalUsers: 11,
    activeUsers: 9,
    usersByRole: {
      REQUESTER: 6,
      IT_STAFF: 4,
      ADMINISTRATOR: 1,
    },
  },
};

describe("StaffDashboard Component Tests (UI-08 / Issue #4-5)", () => {
  const mockOnCreateClick = vi.fn();
  const mockOnSearchClick = vi.fn();
  const mockOnMyQueueClick = vi.fn();
  const mockOnSelectTicket = vi.fn();
  const mockOnDrillDown = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockStaffDashboardData);
  });

  const renderComponent = (user: api.AuthUser = mockStaffUser) => {
    return render(
      <AuthProvider initialUser={user} initialToken="fake-jwt-token">
        <StaffDashboard
          onCreateClick={mockOnCreateClick}
          onSearchClick={mockOnSearchClick}
          onMyQueueClick={mockOnMyQueueClick}
          onSelectTicket={mockOnSelectTicket}
          onDrillDown={mockOnDrillDown}
        />
      </AuthProvider>
    );
  };

  it("UI-08.1: Renders greeting and 5 operational metric cards with correct counts", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Welcome back, Alex!")).toBeInTheDocument();
    });

    // 5 Operational Metric cards
    expect(screen.getByTestId("metric-unassigned")).toHaveTextContent("4");
    expect(screen.getByTestId("metric-open")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-in-progress")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-waiting-requester")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-assigned-to-me")).toHaveTextContent("2");
  });

  it("UI-08.2: Clicking drill-down buttons triggers onDrillDown with appropriate filter", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("metric-unassigned")).toBeInTheDocument();
    });

    // Drill down: Unassigned
    fireEvent.click(screen.getByTestId("drilldown-unassigned"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ ownerFilter: "unassigned" });

    // Drill down: Open
    fireEvent.click(screen.getByTestId("drilldown-open"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ statusFilter: "OPEN" });

    // Drill down: In Progress
    fireEvent.click(screen.getByTestId("drilldown-in-progress"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ statusFilter: "IN_PROGRESS" });

    // Drill down: Waiting Req
    fireEvent.click(screen.getByTestId("drilldown-waiting-requester"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ statusFilter: "WAITING_FOR_REQUESTER" });

    // Drill down: My Assigned
    fireEvent.click(screen.getByTestId("drilldown-assigned-to-me"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ ownerFilter: "me" });
  });

  it("UI-08.3: Renders recent queue tickets and clicking ticket number calls onSelectTicket", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("recent-queue-panel")).toBeInTheDocument();
    });

    // Check ticket numbers, summaries, requesters, owners
    expect(screen.getByText("TICK-201")).toBeInTheDocument();
    expect(screen.getByText("Database latency spike on cluster B")).toBeInTheDocument();
    expect(screen.getByText("Requester: Jennifer Anderson")).toBeInTheDocument();

    const ticket202 = screen.getByTestId("recent-ticket-202");
    expect(within(ticket202).getByText("TICK-202")).toBeInTheDocument();
    expect(within(ticket202).getByText("Keyboard replacement for workstation 4")).toBeInTheDocument();
    expect(within(ticket202).getByText("Unassigned")).toBeInTheDocument();

    // Click on ticket link
    fireEvent.click(screen.getByTestId("ticket-link-201"));
    expect(mockOnSelectTicket).toHaveBeenCalledWith(201);

    // Click on view all link
    fireEvent.click(screen.getByTestId("view-all-queue-link"));
    expect(mockOnSearchClick).toHaveBeenCalled();
  });

  it("UI-08.4: Quick action buttons trigger onCreateClick, onSearchClick, and onMyQueueClick", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("quick-actions-panel")).toBeInTheDocument();
    });

    // Quick create
    fireEvent.click(screen.getByTestId("quick-create-ticket-btn"));
    expect(mockOnCreateClick).toHaveBeenCalled();

    // Quick search
    fireEvent.click(screen.getByTestId("quick-search-tickets-btn"));
    expect(mockOnSearchClick).toHaveBeenCalled();

    // Quick my queue
    fireEvent.click(screen.getByTestId("quick-my-queue-btn"));
    expect(mockOnMyQueueClick).toHaveBeenCalled();
  });

  it("UI-08.5: Hides Admin Statistics card for regular IT Staff", async () => {
    renderComponent(mockStaffUser);

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-view")).toBeInTheDocument();
    });

    // Admin stats card must not be present
    expect(screen.queryByTestId("admin-stats-card")).not.toBeInTheDocument();
  });

  it("UI-08.6: Displays Admin Statistics card with user and role counts when adminStats is present", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue(mockAdminDashboardData);

    renderComponent(mockAdminUser);

    await waitFor(() => {
      expect(screen.getByTestId("admin-stats-card")).toBeInTheDocument();
    });

    const adminStatsCard = screen.getByTestId("admin-stats-card");

    // Check account totals
    expect(within(adminStatsCard).getByText("Total Accounts:")).toBeInTheDocument();
    expect(within(adminStatsCard).getByText("11")).toBeInTheDocument();
    expect(within(adminStatsCard).getByText("9 Active")).toBeInTheDocument();

    // Check role breakdown
    expect(within(adminStatsCard).getByText("Requesters:")).toBeInTheDocument();
    expect(within(adminStatsCard).getByText("6")).toBeInTheDocument();
    expect(within(adminStatsCard).getByText("IT Staff:")).toBeInTheDocument();
    expect(within(adminStatsCard).getByText("4")).toBeInTheDocument();
    expect(within(adminStatsCard).getByText("Administrators:")).toBeInTheDocument();
    expect(within(adminStatsCard).getByText("1")).toBeInTheDocument();
  });

  it("UI-08.7: Displays empty state when no recent queue tickets exist", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue({
      ...mockStaffDashboardData,
      recentTickets: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("empty-recent-queue")).toBeInTheDocument();
    });

    expect(screen.getByText("No recent queue tickets found.")).toBeInTheDocument();
  });

  it("UI-08.8: Refresh button reloads dashboard data", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("refresh-dashboard-btn")).toBeInTheDocument();
    });

    expect(api.fetchStaffDashboard).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("refresh-dashboard-btn"));

    await waitFor(() => {
      expect(api.fetchStaffDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it("UI-08.9: Renders error banner when API call fails", async () => {
    vi.mocked(api.fetchStaffDashboard).mockRejectedValue(
      new Error("Failed to authenticate session")
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-error-banner")).toBeInTheDocument();
    });

    expect(screen.getByText("Failed to authenticate session")).toBeInTheDocument();
  });
});
