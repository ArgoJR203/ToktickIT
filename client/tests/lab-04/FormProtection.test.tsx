import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ActionsTaken } from "../../src/components/ActionsTaken.js";
import { CreateTicket } from "../../src/components/CreateTicket.js";
import { AuthContext } from "../../src/context/AuthContext.js";
import { RequesterContext } from "../../src/context/RequesterContext.js";
import * as api from "../../src/api.js";

vi.mock("../../src/api.js", async () => {
  const actual = await vi.importActual("../../src/api.js");
  return {
    ...actual,
    fetchActionsTaken: vi.fn(),
    createActionTaken: vi.fn(),
    updateActionTaken: vi.fn(),
    fetchStaffAssignees: vi.fn(),
    createTicket: vi.fn(),
    fetchCategories: vi.fn(),
    fetchRelatedSystems: vi.fn(),
    uploadAttachment: vi.fn(),
  };
});

describe("Form Protection & Input Preservation Tests (UI-09, AC-13, FR-19, FR-20)", () => {
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
        <RequesterContext.Provider
          value={{
            currentRequester: { id: user.id, name: user.name, email: user.email, isActive: true },
            requesters: [],
            loading: false,
            error: null,
            selectRequester: vi.fn(),
            changeRequester: vi.fn(),
            refetchRequesters: vi.fn(),
          }}
        >
          {ui}
        </RequesterContext.Provider>
      </AuthContext.Provider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchActionsTaken).mockResolvedValue([]);
    vi.mocked(api.fetchStaffAssignees).mockResolvedValue([
      { id: 1, name: "Alex Thompson", email: "alex.thompson@toktickit.com", role: "IT_STAFF" },
    ]);
    vi.mocked(api.fetchCategories).mockResolvedValue([
      { id: 1, name: "Hardware" },
    ]);
    vi.mocked(api.fetchRelatedSystems).mockResolvedValue([
      { id: 1, name: "Laptop", categoryId: 1, isActive: true },
    ]);
  });

  describe("Actions Taken Form Protection (AC-13, FR-19, FR-20)", () => {
    it("debounces rapid double-clicks on submit button and dispatches exactly one request (AC-13, FR-19)", async () => {
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(api.createActionTaken).mockReturnValue(delayedPromise as any);

      renderWithAuth(<ActionsTaken ticketId={10} />);

      // Wait for table to load
      await waitFor(() => {
        expect(screen.getByTestId("log-action-btn")).toBeInTheDocument();
      });

      // Open Modal
      fireEvent.click(screen.getByTestId("log-action-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("action-taken-modal")).toBeInTheDocument();
      });

      // Fill in valid form
      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Replaced faulty wireless access point power supply." },
      });
      fireEvent.change(screen.getByTestId("action-result-input"), {
        target: { value: "AP restarted successfully and beacon broadcast restored." },
      });

      const modal = screen.getByTestId("action-taken-modal");
      const form = modal.querySelector("form")!;
      const saveBtn = screen.getByTestId("save-action-btn");

      // Rapidly click save button and dispatch submit event to test submission guard (AC-13, FR-19)
      fireEvent.click(saveBtn);
      fireEvent.submit(form);

      // Verify button is disabled during submission
      expect(saveBtn).toBeDisabled();

      // Verify createActionTaken was dispatched only once
      expect(api.createActionTaken).toHaveBeenCalledTimes(1);

      // Resolve in-flight request
      resolvePromise!({
        id: 101,
        ticketId: 10,
        performedBy: { id: 1, name: "Alex Thompson", role: "IT_STAFF" },
        status: "COMPLETED",
        version: 1,
        actionDateTime: new Date().toISOString(),
        description: "Replaced faulty wireless access point power supply.",
        result: "AP restarted successfully and beacon broadcast restored.",
        followUpRequired: false,
        followUpDone: false,
      });
    });

    it("preserves unsaved form inputs upon submission failure (FR-20)", async () => {
      vi.mocked(api.createActionTaken).mockRejectedValueOnce({
        message: "Failed to create action due to network glitch.",
      });

      renderWithAuth(<ActionsTaken ticketId={10} />);

      await waitFor(() => {
        expect(screen.getByTestId("log-action-btn")).toBeInTheDocument();
      });

      // Open Modal
      fireEvent.click(screen.getByTestId("log-action-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("action-taken-modal")).toBeInTheDocument();
      });

      const testDesc = "Configured VLAN tagging on switch port GigabitEthernet0/12.";
      const testResult = "VLAN trunking active but awaiting DHCP acknowledgement.";

      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: testDesc },
      });
      fireEvent.change(screen.getByTestId("action-result-input"), {
        target: { value: testResult },
      });

      const saveBtn = screen.getByTestId("save-action-btn");
      fireEvent.click(saveBtn);

      // Modal should remain open and show error message
      await waitFor(() => {
        expect(screen.getByTestId("modal-error-alert")).toBeInTheDocument();
      });

      // Form inputs must remain preserved (not cleared or lost)
      expect(screen.getByTestId("action-description-input")).toHaveValue(testDesc);
      expect(screen.getByTestId("action-result-input")).toHaveValue(testResult);
    });

    it("disables save button and displays spinner while request is pending (AC-13)", async () => {
      let resolvePromise: (val: any) => void;
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });

      vi.mocked(api.createActionTaken).mockReturnValue(delayedPromise as any);

      renderWithAuth(<ActionsTaken ticketId={10} />);

      await waitFor(() => {
        expect(screen.getByTestId("log-action-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("log-action-btn"));

      await waitFor(() => {
        expect(screen.getByTestId("action-taken-modal")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("action-description-input"), {
        target: { value: "Cleaned server heat sink fins and re-applied paste." },
      });
      fireEvent.change(screen.getByTestId("action-result-input"), {
        target: { value: "Idle CPU temps dropped from 78C to 42C." },
      });

      const saveBtn = screen.getByTestId("save-action-btn");
      fireEvent.click(saveBtn);

      // Inspect pending state
      expect(saveBtn).toBeDisabled();
      expect(saveBtn).toHaveTextContent(/Saving Action\.\.\./i);
      expect(saveBtn.querySelector(".spinner-border")).toBeInTheDocument();

      resolvePromise!({
        id: 102,
        ticketId: 10,
        performedBy: { id: 1, name: "Alex Thompson", role: "IT_STAFF" },
        status: "COMPLETED",
        version: 1,
        actionDateTime: new Date().toISOString(),
        description: "Cleaned server heat sink fins and re-applied paste.",
        result: "Idle CPU temps dropped from 78C to 42C.",
        followUpRequired: false,
        followUpDone: false,
      });
    });
  });

  describe("Create Ticket Form Protection (AC-13, FR-19, FR-20)", () => {
    it("debounces double submission on ticket creation form (AC-13, FR-19)", async () => {
      let resolveTicket: (val: any) => void;
      const delayedTicket = new Promise((resolve) => {
        resolveTicket = resolve;
      });

      vi.mocked(api.createTicket).mockReturnValue(delayedTicket as any);

      renderWithAuth(<CreateTicket />, mockRequesterUser);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Submit Ticket/i })).toBeInTheDocument();
      });

      // Fill valid form
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Broken monitor screen" } });
      fireEvent.change(screen.getByLabelText(/Detailed Description/i), {
        target: { value: "The monitor flickers and turns off after 5 minutes of usage." },
      });

      const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
      const form = submitBtn.closest("form")!;

      // Click rapidly and dispatch submit event directly to prove guard handles duplicate submits
      fireEvent.click(submitBtn);
      fireEvent.submit(form);

      // Verify button is disabled
      expect(submitBtn).toBeDisabled();
      expect(api.createTicket).toHaveBeenCalledTimes(1);

      resolveTicket!({
        id: 201,
        ticketNumber: "TKT-2026-000201",
        summary: "Broken monitor screen",
        currentStatus: "NEW",
      });
    });

    it("preserves ticket form inputs when submission fails (FR-20)", async () => {
      vi.mocked(api.createTicket).mockRejectedValueOnce({
        message: "Internal server error occurred.",
      });

      renderWithAuth(<CreateTicket />, mockRequesterUser);

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Submit Ticket/i })).toBeInTheDocument();
      });

      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "VPN connectivity issue" } });
      fireEvent.change(screen.getByLabelText(/Detailed Description/i), {
        target: { value: "Unable to establish secure tunnel from home network." },
      });

      const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
      fireEvent.click(submitBtn);

      // Verify error alert
      await waitFor(() => {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      });

      // Assert inputs were preserved
      expect(screen.getByLabelText(/Summary/i)).toHaveValue("VPN connectivity issue");
      expect(screen.getByLabelText(/Detailed Description/i)).toHaveValue(
        "Unable to establish secure tunnel from home network."
      );
    });
  });
});
