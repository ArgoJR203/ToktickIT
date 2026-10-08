import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { RequesterDashboard } from "../../src/components/RequesterDashboard.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

// Mock API
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchRequesterDashboard: vi.fn(),
  };
});

const mockRequesterUser: api.AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER",
  mustChangePassword: false,
  isActive: true,
};

const mockDashboardData: api.RequesterDashboardData = {
  metrics: {
    totalOpen: 3,
    waitingForRequester: 1,
    resolvedCount: 2,
    closedCount: 5,
  },
  recentTickets: [
    {
      id: 101,
      ticketNumber: "TICK-101",
      summary: "Laptop battery drain issue",
      currentStatus: "OPEN",
      requestedPriority: "HIGH",
      updatedAt: "2026-05-12T14:30:00.000Z",
      category: { name: "Hardware" },
    },
    {
      id: 102,
      ticketNumber: "TICK-102",
      summary: "VPN connectivity failure",
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "URGENT",
      updatedAt: "2026-05-11T09:00:00.000Z",
      category: { name: "Network" },
    },
  ],
  drillDownUrls: {
    totalOpen: "/api/tickets?statusGroup=open",
    waitingForRequester: "/api/tickets?currentStatus=WAITING_FOR_REQUESTER",
    resolvedCount: "/api/tickets?currentStatus=RESOLVED",
    closedCount: "/api/tickets?currentStatus=CLOSED",
  },
};

describe("RequesterDashboard Component Tests (UI-07 / Issue #4-5)", () => {
  const mockOnCreateClick = vi.fn();
  const mockOnViewMyTickets = vi.fn();
  const mockOnSelectTicket = vi.fn();
  const mockOnDrillDown = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue(mockDashboardData);
  });

  const renderComponent = (user: api.AuthUser = mockRequesterUser) => {
    return render(
      <AuthProvider initialUser={user} initialToken="fake-jwt-token">
        <RequesterDashboard
          onCreateClick={mockOnCreateClick}
          onViewMyTickets={mockOnViewMyTickets}
          onSelectTicket={mockOnSelectTicket}
          onDrillDown={mockOnDrillDown}
        />
      </AuthProvider>
    );
  };

  it("UI-07.1: Renders greeting and 4 metric cards with correct counts", async () => {
    renderComponent();

    // Check greeting
    await waitFor(() => {
      expect(screen.getByText("Welcome, Jennifer!")).toBeInTheDocument();
    });

    // Check 4 metric cards
    expect(screen.getByTestId("metric-total-open")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-waiting-requester")).toHaveTextContent("1");
    expect(screen.getByTestId("metric-resolved")).toHaveTextContent("2");
    expect(screen.getByTestId("metric-closed")).toHaveTextContent("5");
  });

  it("UI-07.2: Clicking drill-down buttons triggers onDrillDown with correct filters", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("metric-total-open")).toBeInTheDocument();
    });

    // Drill down: total open
    fireEvent.click(screen.getByTestId("drilldown-total-open"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ statusGroup: "open" });

    // Drill down: waiting for requester
    fireEvent.click(screen.getByTestId("drilldown-waiting-requester"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ currentStatus: "WAITING_FOR_REQUESTER" });

    // Drill down: resolved
    fireEvent.click(screen.getByTestId("drilldown-resolved"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ currentStatus: "RESOLVED" });

    // Drill down: closed
    fireEvent.click(screen.getByTestId("drilldown-closed"));
    expect(mockOnDrillDown).toHaveBeenCalledWith({ currentStatus: "CLOSED" });
  });

  it("UI-07.3: Renders recent tickets list and clicking ticket number calls onSelectTicket", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("recent-tickets-panel")).toBeInTheDocument();
    });

    // Check ticket numbers and summaries
    expect(screen.getByText("TICK-101")).toBeInTheDocument();
    expect(screen.getByText("Laptop battery drain issue")).toBeInTheDocument();
    expect(screen.getByText("TICK-102")).toBeInTheDocument();
    expect(screen.getByText("VPN connectivity failure")).toBeInTheDocument();

    // Click on ticket link
    fireEvent.click(screen.getByTestId("ticket-link-101"));
    expect(mockOnSelectTicket).toHaveBeenCalledWith(101);

    // Click on view all link
    fireEvent.click(screen.getByTestId("view-all-tickets-link"));
    expect(mockOnViewMyTickets).toHaveBeenCalled();
  });

  it("UI-07.4: Quick action buttons trigger onCreateClick and onViewMyTickets", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("quick-actions-panel")).toBeInTheDocument();
    });

    // Quick create
    fireEvent.click(screen.getByTestId("quick-create-ticket-btn"));
    expect(mockOnCreateClick).toHaveBeenCalled();

    // Quick view tickets
    fireEvent.click(screen.getByTestId("quick-view-tickets-btn"));
    expect(mockOnViewMyTickets).toHaveBeenCalled();
  });

  it("UI-07.5: Displays empty state when no recent tickets exist", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockResolvedValue({
      ...mockDashboardData,
      recentTickets: [],
    });

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("empty-recent-tickets")).toBeInTheDocument();
    });

    expect(screen.getByText("No recent requests found.")).toBeInTheDocument();

    // Click create first ticket button in empty state
    fireEvent.click(screen.getByText("Create your first ticket"));
    expect(mockOnCreateClick).toHaveBeenCalled();
  });

  it("UI-07.6: Refresh button reloads dashboard data", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("refresh-dashboard-btn")).toBeInTheDocument();
    });

    expect(api.fetchRequesterDashboard).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId("refresh-dashboard-btn"));

    await waitFor(() => {
      expect(api.fetchRequesterDashboard).toHaveBeenCalledTimes(2);
    });
  });

  it("UI-07.7: Renders error banner when API call fails", async () => {
    vi.mocked(api.fetchRequesterDashboard).mockRejectedValue(
      new Error("Network connection error")
    );

    renderComponent();

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-error-banner")).toBeInTheDocument();
    });

    expect(screen.getByText("Network connection error")).toBeInTheDocument();
  });
});
