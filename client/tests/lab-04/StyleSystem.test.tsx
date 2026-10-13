import React from "react";
// @ts-ignore
import fs from "node:fs";
// @ts-ignore
import path from "node:path";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaffDashboard } from "../../src/components/StaffDashboard.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchStaffDashboard: vi.fn(),
  };
});

describe("Zen Green Design Token Verification (STYLE-01)", () => {
  const mockStaff: api.AuthUser = {
    id: 2,
    name: "Alex Thompson",
    email: "alex.thompson@toktickit.com",
    role: "IT_STAFF",
    mustChangePassword: false,
    isActive: true,
  };

  const renderWithAuth = (ui: React.ReactElement, user: api.AuthUser = mockStaff) => {
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

  it("verifies global Zen Green design tokens in index.css", () => {
    const cssPath = path.resolve((globalThis as any).process.cwd(), "src/index.css");
    const indexCss = fs.readFileSync(cssPath, "utf-8");

    // Palette tokens defined in index.css
    expect(indexCss).toMatch(/--color-primary-green:\s*#006B3C/i);
    expect(indexCss).toMatch(/--color-secondary-green:\s*#0B7A46/i);
    expect(indexCss).toMatch(/--color-pale-green:\s*#EAF6EF/i);
    expect(indexCss).toMatch(/--color-focus-ring:\s*#0B7A46/i);

    // Button and Card component classes
    expect(indexCss).toContain(".btn-zen-primary");
    expect(indexCss).toContain(".zen-card");
  });

  it("applies Zen Green tokens and styling classes to Staff Dashboard components", async () => {
    vi.mocked(api.fetchStaffDashboard).mockResolvedValue({
      metrics: {
        unassignedCount: 5,
        assignedToMeCount: 2,
        countsByStatus: {
          NEW: 2,
          OPEN: 1,
          IN_PROGRESS: 2,
          WAITING_FOR_REQUESTER: 0,
          RESOLVED: 4,
          CLOSED: 6,
          REOPENED: 0,
          CANCELLED: 0,
        },
        countsByPriority: {
          LOW: 1,
          MEDIUM: 2,
          HIGH: 2,
          URGENT: 0,
        },
      },
      recentTickets: [],
      drillDownUrls: {
        unassigned: "/staff/tickets?ownerId=unassigned",
        assignedToMe: "/staff/tickets?ownerId=me",
        open: "/staff/tickets?currentStatus=OPEN",
        inProgress: "/staff/tickets?currentStatus=IN_PROGRESS",
        waitingForRequester: "/staff/tickets?currentStatus=WAITING_FOR_REQUESTER",
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
      mockStaff
    );

    const staffView = await screen.findByTestId("staff-dashboard-view");
    expect(staffView).toBeInTheDocument();

    // Heading has primary green color
    const greeting = screen.getByRole("heading", { name: /Welcome back, Alex!/i });
    expect(greeting).toHaveStyle("color: var(--color-primary-green, #006B3C)");

    // Metric cards have zen-card class
    const unassignedCard = screen.getByTestId("metric-unassigned");
    expect(unassignedCard).toHaveClass("zen-card");

    // Quick action buttons adhere to zen green styling
    const quickCreateBtn = screen.getByTestId("quick-create-ticket-btn");
    expect(quickCreateBtn).toHaveClass("btn", "btn-zen-primary");
  });
});
