import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// Mock API layer
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn().mockRejectedValue(new Error("No session")),
    fetchRequesters: vi.fn().mockResolvedValue([]),
    fetchCategories: vi.fn().mockResolvedValue([]),
    fetchRelatedSystems: vi.fn().mockResolvedValue([]),
    fetchTickets: vi.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    }),
    fetchStaffTickets: vi.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    }),
    fetchStaffAssignees: vi.fn().mockResolvedValue([]),
    fetchRequesterDashboard: vi.fn().mockResolvedValue({
      metrics: { totalOpen: 4, waitingForRequester: 1, resolvedCount: 2, closedCount: 5 },
      recentTickets: [
        {
          id: 101,
          ticketNumber: "TKT-001",
          summary: "Network issues",
          currentStatus: "OPEN",
          requestedPriority: "HIGH",
          updatedAt: "2026-05-12T10:00:00.000Z",
          category: { name: "Network" },
        },
      ],
      drillDownUrls: {
        totalOpen: "/tickets?statusGroup=open",
        waitingForRequester: "/tickets?currentStatus=WAITING_FOR_REQUESTER",
        resolvedCount: "/tickets?currentStatus=RESOLVED",
        closedCount: "/tickets?currentStatus=CLOSED",
      },
    }),
    fetchStaffDashboard: vi.fn().mockResolvedValue({
      metrics: {
        unassignedCount: 3,
        assignedToMeCount: 2,
        countsByStatus: {
          NEW: 1,
          OPEN: 2,
          IN_PROGRESS: 1,
          WAITING_FOR_REQUESTER: 1,
          RESOLVED: 3,
          CLOSED: 5,
          REOPENED: 0,
          CANCELLED: 0,
        },
        countsByPriority: { LOW: 1, MEDIUM: 2, HIGH: 1, URGENT: 0 },
      },
      recentTickets: [
        {
          id: 201,
          ticketNumber: "TKT-201",
          summary: "Database latency",
          currentStatus: "OPEN",
          itPriority: "HIGH",
          updatedAt: "2026-05-12T11:00:00.000Z",
          owner: null,
          requester: { name: "Jennifer Anderson" },
        },
      ],
      drillDownUrls: {
        unassigned: "/staff/tickets?ownerId=unassigned",
        assignedToMe: "/staff/tickets?ownerId=me",
        open: "/staff/tickets?currentStatus=OPEN",
        inProgress: "/staff/tickets?currentStatus=IN_PROGRESS",
        waitingForRequester: "/staff/tickets?currentStatus=WAITING_FOR_REQUESTER",
      },
    }),
  };
});

describe("Dashboard Routing & Filter Reset Integration Tests (Issue #4-5, AC-02, AC-10, AC-12)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  const mockRequesterUser: api.AuthUser = {
    id: 1,
    name: "Jennifer Anderson",
    email: "jennifer.anderson@example.com",
    role: "REQUESTER",
    mustChangePassword: false,
    isActive: true,
  };

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

  it("1. Default landing tab is Dashboard for REQUESTER, IT_STAFF, and ADMINISTRATOR", async () => {
    // 1.1 Requester landing
    const { unmount: unmountReq } = render(
      <App initialUser={mockRequesterUser} initialToken="fake-token-req" />
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-view")).toBeInTheDocument();
      expect(screen.getByText("Welcome, Jennifer!")).toBeInTheDocument();
      expect(screen.getByTestId("nav-dashboard-tab")).toHaveAttribute("aria-current", "page");
    });
    unmountReq();

    // 1.2 Staff landing
    const { unmount: unmountStaff } = render(
      <App initialUser={mockStaffUser} initialToken="fake-token-staff" />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-view")).toBeInTheDocument();
      expect(screen.getByText("Welcome back, Alex!")).toBeInTheDocument();
      expect(screen.getByTestId("nav-dashboard-tab")).toHaveAttribute("aria-current", "page");
    });
    unmountStaff();

    // 1.3 Admin landing
    const { unmount: unmountAdmin } = render(
      <App initialUser={mockAdminUser} initialToken="fake-token-admin" />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-view")).toBeInTheDocument();
      expect(screen.getByText("Welcome back, John!")).toBeInTheDocument();
      expect(screen.getByTestId("nav-dashboard-tab")).toHaveAttribute("aria-current", "page");
    });
    unmountAdmin();
  });

  it("2. Requester drill-down applies filter and header tab click resets stale filter", async () => {
    const user = userEvent.setup();
    render(<App initialUser={mockRequesterUser} initialToken="fake-token-req" />);

    // Starts on Dashboard
    await waitFor(() => {
      expect(screen.getByTestId("drilldown-total-open")).toBeInTheDocument();
    });

    // Click drill-down "View active requests ->" (totalOpen)
    await user.click(screen.getByTestId("drilldown-total-open"));

    // Navigates to My Tickets with filter applied
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
      expect(screen.getByTestId("status-group-active-filter")).toBeInTheDocument();
      expect(screen.getByText("Showing: Open tickets")).toBeInTheDocument();
    });

    // Click "My Tickets" tab in Header
    await user.click(screen.getByTestId("nav-my-tickets-tab"));

    // Stale drill-down filter is now cleared
    await waitFor(() => {
      expect(screen.queryByTestId("status-group-active-filter")).not.toBeInTheDocument();
    });
  });

  it("3. Staff drill-down applies filter and header tab click resets stale filter", async () => {
    const user = userEvent.setup();
    render(<App initialUser={mockStaffUser} initialToken="fake-token-staff" />);

    // Starts on Dashboard
    await waitFor(() => {
      expect(screen.getByTestId("drilldown-unassigned")).toBeInTheDocument();
    });

    // Click drill-down "View queue ->" (unassigned)
    await user.click(screen.getByTestId("drilldown-unassigned"));

    // Navigates to Ticket Queue with unassigned filter applied
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Ticket Queue" })).toBeInTheDocument();
    });

    // Check that api.fetchStaffTickets was called with ownerId="unassigned"
    expect(api.fetchStaffTickets).toHaveBeenCalledWith(
      expect.objectContaining({ ownerId: "unassigned" })
    );

    // Click "Ticket Queue" in Header
    await user.click(screen.getByTestId("nav-ticket-queue-tab"));

    // Filter is reset on direct tab click
    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenLastCalledWith(
        expect.objectContaining({ ownerId: "" })
      );
    });
  });

  it("4. Brand logo click navigates back to Dashboard tab", async () => {
    const user = userEvent.setup();
    render(<App initialUser={mockRequesterUser} initialToken="fake-token-req" />);

    // Navigate to Create Ticket tab
    await waitFor(() => {
      expect(screen.getByTestId("nav-create-ticket-tab")).toBeInTheDocument();
    });
    await user.click(screen.getByTestId("nav-create-ticket-tab"));

    expect(screen.getByRole("heading", { name: "Create IT Support Ticket" })).toBeInTheDocument();

    // Click Brand Logo
    const brand = screen.getByText("TokTickIT");
    await user.click(brand);

    // Returns to Dashboard
    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-view")).toBeInTheDocument();
    });
  });
});
