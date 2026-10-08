import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";
import { RequesterTicketDetail } from "../../src/components/RequesterTicketDetail.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

// Mock API module
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchStaffTicketDetail: vi.fn(),
    fetchStaffAssignees: vi.fn(),
    updateTicketOwner: vi.fn(),
    updateTicketPriority: vi.fn(),
    updateTicketStatus: vi.fn(),
    fetchPublicComments: vi.fn(),
    postPublicComment: vi.fn(),
    fetchInternalNotes: vi.fn(),
    postInternalNote: vi.fn(),
    fetchTicketDetail: vi.fn(),
    indicateProblemResolved: vi.fn(),
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

const mockRequesterUser: api.AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER",
  mustChangePassword: false,
  isActive: true,
};

const mockTicketDetailBase: api.StaffTicketDetailData = {
  id: 1,
  ticketNumber: "TKT-2026-000001",
  summary: "Email sync failing on mobile",
  description: "Exchange account fails to synchronize on iOS Mail app.",
  category: { id: 1, name: "Email" },
  relatedSystem: { id: 1, name: "Microsoft Exchange" },
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  owner: { id: 7, name: "Alex Thompson", email: "alex.thompson@toktickit.com" },
  resolutionIndicated: false,
  resolutionIndicatedAt: null,
  resolutionSummary: null,
  version: 1,
  permittedNextStatuses: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  attachments: [],
  createdAt: "2026-05-12T09:00:00.000Z",
  updatedAt: "2026-05-12T09:30:00.000Z",
};

describe("Lab 4 Ticket Workflow & Concurrency UI Component Tests (UI-04..06)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem("toktickit_auth_token", "fake-jwt-token");
    localStorage.setItem("toktickit_auth_user", JSON.stringify(mockStaffUser));

    vi.mocked(api.fetchStaffAssignees).mockResolvedValue([
      { id: 7, name: "Alex Thompson", email: "alex.thompson@toktickit.com", role: "IT_STAFF" },
    ]);
    vi.mocked(api.fetchPublicComments).mockResolvedValue([]);
    vi.mocked(api.fetchInternalNotes).mockResolvedValue([]);
  });

  const renderStaffDetail = (ticketData = mockTicketDetailBase) => {
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue(ticketData);
    return render(
      <AuthProvider initialUser={mockStaffUser} initialToken="fake-jwt-token">
        <RequesterProvider>
          <StaffTicketDetail ticketId={ticketData.id} onBack={vi.fn()} />
        </RequesterProvider>
      </AuthProvider>
    );
  };

  describe("UI-04: Dynamic Status Transition Dropdown (BR-11)", () => {
    it("displays strictly permitted next statuses in the dropdown", async () => {
      renderStaffDetail({
        ...mockTicketDetailBase,
        currentStatus: "OPEN",
        permittedNextStatuses: ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
      });

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      const select = screen.getByTestId("status-select") as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.value);

      expect(options).toEqual(["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"]);
      expect(screen.getByTestId("update-status-btn")).toBeEnabled();
    });

    it("displays terminal status indicator when no next transitions are permitted", async () => {
      renderStaffDetail({
        ...mockTicketDetailBase,
        currentStatus: "CANCELLED",
        permittedNextStatuses: [],
      });

      await waitFor(() => {
        expect(screen.getByTestId("status-terminal")).toBeInTheDocument();
      });

      expect(screen.getByTestId("status-terminal")).toHaveTextContent("No further transitions (Terminal Status)");
      expect(screen.queryByTestId("status-select")).not.toBeInTheDocument();
      expect(screen.getByTestId("update-status-btn")).toBeDisabled();
    });
  });

  describe("UI-05: Stale-Update 409 Conflict Alert Banner & Recovery (AC-08, BR-14)", () => {
    it("displays 409 conflict alert banner on STALE_UPDATE and recovers upon clicking reload", async () => {
      renderStaffDetail({
        ...mockTicketDetailBase,
        version: 1,
      });

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      // Mock updateTicketStatus to reject with 409 STALE_UPDATE
      const conflictError: any = new Error("Ticket has been modified by another user. Please reload the latest ticket data.");
      conflictError.code = "STALE_UPDATE";
      conflictError.status = 409;
      conflictError.currentTicket = {
        ...mockTicketDetailBase,
        currentStatus: "WAITING_FOR_REQUESTER",
        version: 2,
      };
      vi.mocked(api.updateTicketStatus).mockRejectedValueOnce(conflictError);

      // Submit status update
      const updateBtn = screen.getByTestId("update-status-btn");
      fireEvent.click(updateBtn);

      // Verify conflict banner appears and generic action-error-banner is suppressed
      await waitFor(() => {
        expect(screen.getByTestId("ticket-conflict-banner")).toBeInTheDocument();
      });
      expect(screen.getByTestId("ticket-conflict-banner")).toHaveTextContent("Update Conflict:");
      expect(screen.queryByTestId("action-error-banner")).not.toBeInTheDocument();
      expect(screen.getByTestId("reload-conflict-ticket-btn")).toBeInTheDocument();

      // Now mock fresh ticket fetch on reload
      const refreshedTicket: api.StaffTicketDetailData = {
        ...mockTicketDetailBase,
        currentStatus: "WAITING_FOR_REQUESTER",
        version: 2,
        permittedNextStatuses: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
      };
      vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce(refreshedTicket);

      // Click "Reload Latest Ticket Data"
      fireEvent.click(screen.getByTestId("reload-conflict-ticket-btn"));

      // Verify conflict banner is dismissed and latest data is loaded
      await waitFor(() => {
        expect(screen.queryByTestId("ticket-conflict-banner")).not.toBeInTheDocument();
      });
      expect(api.fetchStaffTicketDetail).toHaveBeenCalledTimes(2);
    });

    it("preserves drafted resolution summary text across conflict reload", async () => {
      renderStaffDetail({
        ...mockTicketDetailBase,
        currentStatus: "IN_PROGRESS",
        version: 1,
      });

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      // Select RESOLVED so resolution-summary-input appears
      fireEvent.change(screen.getByTestId("status-select"), { target: { value: "RESOLVED" } });

      await waitFor(() => {
        expect(screen.getByTestId("resolution-summary-input")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("resolution-summary-input"), {
        target: { value: "My drafted resolution explanation" },
      });

      // Mock update rejection with STALE_UPDATE
      const conflictError: any = new Error("Ticket has been modified");
      conflictError.code = "STALE_UPDATE";
      conflictError.status = 409;
      vi.mocked(api.updateTicketStatus).mockRejectedValueOnce(conflictError);

      fireEvent.click(screen.getByTestId("update-status-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("ticket-conflict-banner")).toBeInTheDocument();
      });
      expect(screen.queryByTestId("action-error-banner")).not.toBeInTheDocument();

      // Mock fetch on reload
      const refreshedTicket: api.StaffTicketDetailData = {
        ...mockTicketDetailBase,
        currentStatus: "IN_PROGRESS",
        version: 2,
        resolutionSummary: null,
      };
      vi.mocked(api.fetchStaffTicketDetail).mockResolvedValueOnce(refreshedTicket);

      fireEvent.click(screen.getByTestId("reload-conflict-ticket-btn"));

      await waitFor(() => {
        expect(screen.queryByTestId("ticket-conflict-banner")).not.toBeInTheDocument();
      });

      // Switch to RESOLVED again and verify draft is preserved
      fireEvent.change(screen.getByTestId("status-select"), { target: { value: "RESOLVED" } });
      const summaryInput = screen.getByTestId("resolution-summary-input") as HTMLTextAreaElement;
      expect(summaryInput.value).toBe("My drafted resolution explanation");
    });
  });

  describe("UI-06: Advisory Resolution Notice Banner (BR-12, AC-03)", () => {
    it("renders advisory resolution indication banner in StaffTicketDetail when resolutionIndicated is true", async () => {
      renderStaffDetail({
        ...mockTicketDetailBase,
        resolutionIndicated: true,
        resolutionIndicatedAt: "2026-05-12T10:00:00.000Z",
      });

      await waitFor(() => {
        expect(screen.getByTestId("resolution-indicated-banner")).toBeInTheDocument();
      });

      expect(screen.getByTestId("resolution-indicated-banner")).toHaveTextContent("The requester indicated this problem appears resolved");
    });

    it("hides advisory resolution banner when resolutionIndicated is false", async () => {
      renderStaffDetail({
        ...mockTicketDetailBase,
        resolutionIndicated: false,
      });

      await waitFor(() => {
        expect(screen.getByTestId("ticket-number")).toBeInTheDocument();
      });

      expect(screen.queryByTestId("resolution-indicated-banner")).not.toBeInTheDocument();
    });

    it("renders Problem Appears Resolved button in RequesterTicketDetail and updates banner upon clicking", async () => {
      localStorage.setItem("toktickit_auth_user", JSON.stringify(mockRequesterUser));

      const mockRequesterTicket: api.TicketDetail = {
        id: 1,
        ticketNumber: "TKT-2026-000001",
        summary: "Email sync failing on mobile",
        description: "Exchange account fails to synchronize.",
        requesterId: 1,
        categoryId: 1,
        relatedSystemId: 1,
        category: { id: 1, name: "Email" },
        relatedSystem: { id: 1, name: "Exchange" },
        requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
        requestedPriority: "HIGH",
        currentStatus: "IN_PROGRESS",
        resolutionIndicated: false,
        resolutionIndicatedAt: null,
        attachments: [],
        createdAt: "2026-05-12T09:00:00.000Z",
        updatedAt: "2026-05-12T09:30:00.000Z",
      };

      vi.mocked(api.fetchTicketDetail).mockResolvedValue(mockRequesterTicket);
      vi.mocked(api.indicateProblemResolved).mockResolvedValue({
        ticketId: 1,
        resolutionIndicated: true,
        resolutionIndicatedAt: "2026-05-12T10:00:00.000Z",
        message: "Problem resolution indicated.",
      });

      render(
        <AuthProvider initialUser={mockRequesterUser} initialToken="fake-jwt-token">
          <RequesterProvider>
            <RequesterTicketDetail ticketId={1} onBack={vi.fn()} />
          </RequesterProvider>
        </AuthProvider>
      );

      await waitFor(() => {
        expect(screen.getByTestId("indicate-resolved-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("indicate-resolved-btn"));

      await waitFor(() => {
        expect(api.indicateProblemResolved).toHaveBeenCalledWith(1, 1);
        expect(screen.getByTestId("requester-resolution-indicated-banner")).toBeInTheDocument();
      });
      expect(screen.getByTestId("requester-resolution-indicated-banner")).toHaveTextContent("Problem Indicated as Resolved");
    });
  });
});
