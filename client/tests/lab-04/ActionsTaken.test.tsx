import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { ActionsTaken } from "../../src/components/ActionsTaken.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";

// Mock API functions
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchActionsTaken: vi.fn(),
    createActionTaken: vi.fn(),
    updateActionTaken: vi.fn(),
    fetchStaffAssignees: vi.fn(),
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

const mockAssignees: api.StaffAssignee[] = [
  { id: 7, name: "Alex Thompson", email: "alex.thompson@toktickit.com", role: "IT_STAFF" },
  { id: 8, name: "Lisa Martinez", email: "lisa.martinez@toktickit.com", role: "IT_STAFF" },
  { id: 11, name: "John Smith", email: "john.smith@toktickit.com", role: "ADMINISTRATOR" },
];

const mockActions: api.ActionTakenItem[] = [
  {
    id: 101,
    ticketId: 1,
    performedById: 7,
    performedBy: { id: 7, name: "Alex Thompson", email: "alex.thompson@toktickit.com", role: "IT_STAFF" },
    assigneeId: 8,
    assignee: { id: 8, name: "Lisa Martinez", email: "lisa.martinez@toktickit.com", role: "IT_STAFF" },
    updatedById: null,
    status: "COMPLETED",
    version: 1,
    actionDateTime: "2026-05-12T10:15:00.000Z",
    description: "Replaced degraded battery unit with genuine spare part.",
    result: "Passed all hardware diagnostics tests; battery health 100%.",
    followUpRequired: false,
    followUpNote: null,
    followUpDone: false,
    attachmentNotes: "battery_diagnostic_report.pdf",
    createdAt: "2026-05-12T10:16:00.000Z",
    updatedAt: "2026-05-12T10:16:00.000Z",
  },
  {
    id: 102,
    ticketId: 1,
    performedById: 8,
    performedBy: { id: 8, name: "Lisa Martinez", email: "lisa.martinez@toktickit.com", role: "IT_STAFF" },
    assigneeId: 7,
    assignee: { id: 7, name: "Alex Thompson", email: "alex.thompson@toktickit.com", role: "IT_STAFF" },
    updatedById: null,
    status: "PENDING",
    version: 1,
    actionDateTime: "2026-05-14T09:00:00.000Z",
    description: "Perform 48-hour follow-up battery telemetry benchmark.",
    result: "Pending execution.",
    followUpRequired: true,
    followUpNote: "Verify charge cycles and heat dissipation curve.",
    followUpDone: false,
    attachmentNotes: null,
    createdAt: "2026-05-12T10:20:00.000Z",
    updatedAt: "2026-05-12T10:20:00.000Z",
  },
];

describe("ActionsTaken Component Tests (UI-01, UI-02, UI-03 / Issue #4-3)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.mocked(api.fetchActionsTaken).mockResolvedValue(mockActions);
    vi.mocked(api.fetchStaffAssignees).mockResolvedValue(mockAssignees);
  });

  const renderComponent = (user: api.AuthUser = mockStaffUser, isReadOnly = false) => {
    localStorage.setItem("toktickit_token", "fake-jwt-token");
    localStorage.setItem("toktickit_user", JSON.stringify(user));

    return render(
      <AuthProvider>
        <ActionsTaken
          ticketId={1}
          isReadOnly={isReadOnly}
          assignees={mockAssignees}
        />
      </AuthProvider>
    );
  };

  // ---------------------------------------------------------------------------
  // UI-01: Renders Actions Taken table with timestamps, performers, assignees, results
  // ---------------------------------------------------------------------------
  it("UI-01: renders Actions Taken table with timestamps, performers, assignees, and results (AC-01)", async () => {
    renderComponent(mockStaffUser);

    // Verify title and counter badge
    expect(await screen.findByTestId("actions-taken-title")).toBeInTheDocument();
    expect(screen.getByTestId("actions-count-badge")).toHaveTextContent("2");

    // Verify table structure
    expect(screen.getByTestId("actions-taken-table")).toBeInTheDocument();

    // Verify row 1
    const row1 = screen.getByTestId("action-row-101");
    expect(row1).toHaveTextContent("Replaced degraded battery unit with genuine spare part.");
    expect(row1).toHaveTextContent("Passed all hardware diagnostics tests; battery health 100%.");
    expect(row1).toHaveTextContent("Completed");
    expect(row1).toHaveTextContent("Alex Thompson");
    expect(row1).toHaveTextContent("Lisa Martinez");
    expect(row1).toHaveTextContent("battery_diagnostic_report.pdf");

    // Verify row 2 (with conditional follow-up)
    const row2 = screen.getByTestId("action-row-102");
    expect(row2).toHaveTextContent("Perform 48-hour follow-up battery telemetry benchmark.");
    expect(row2).toHaveTextContent("Pending");
    expect(row2).toHaveTextContent("Verify charge cycles and heat dissipation curve.");
    expect(screen.getByTestId("followup-pending-102")).toBeInTheDocument();

    // Edit button present for Staff
    expect(screen.getByTestId("edit-action-btn-101")).toBeInTheDocument();
    expect(screen.getByTestId("edit-action-btn-102")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // UI-02: Modal validation: follow-up note input appears conditionally and validates
  // ---------------------------------------------------------------------------
  it("UI-02: dynamically displays follow-up note input when toggle is checked and enforces validation (AC-05, BR-05)", async () => {
    renderComponent(mockStaffUser);

    // Open Create Modal
    const logBtn = await screen.findByTestId("log-action-btn");
    fireEvent.click(logBtn);

    // Modal is opened
    expect(screen.getByTestId("action-taken-modal")).toBeInTheDocument();

    // Initially, follow-up note is hidden
    expect(screen.queryByTestId("follow-up-note-input")).not.toBeInTheDocument();
    expect(screen.queryByTestId("follow-up-done-checkbox")).not.toBeInTheDocument();

    // Toggle follow-up required checkbox
    const followUpCheckbox = screen.getByTestId("follow-up-required-checkbox");
    fireEvent.click(followUpCheckbox);

    // Follow-up note and done checkbox now appear conditionally
    expect(screen.getByTestId("follow-up-note-input")).toBeInTheDocument();
    expect(screen.getByTestId("follow-up-done-checkbox")).toBeInTheDocument();

    // Fill other required fields
    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Inspected network switch" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Link active" },
    });

    // Attempt save with empty follow-up note -> validation error displayed
    fireEvent.click(screen.getByTestId("save-action-btn"));

    expect(await screen.findByText(/Follow-up note is required when follow-up is requested/i)).toBeInTheDocument();
    expect(api.createActionTaken).not.toHaveBeenCalled();

    // Enter valid follow-up note
    fireEvent.change(screen.getByTestId("follow-up-note-input"), {
      target: { value: "Verify packet loss next morning" },
    });

    vi.mocked(api.createActionTaken).mockResolvedValueOnce({
      ...mockActions[0],
      id: 103,
      description: "Inspected network switch",
      result: "Link active",
      followUpRequired: true,
      followUpNote: "Verify packet loss next morning",
    });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(api.createActionTaken).toHaveBeenCalledWith(
        1,
        expect.objectContaining({
          description: "Inspected network switch",
          result: "Link active",
          followUpRequired: true,
          followUpNote: "Verify packet loss next morning",
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // UI-03: Requester view hides "+ Log Action Taken" and edit buttons (read-only mode)
  // ---------------------------------------------------------------------------
  it("UI-03: hides '+ Log Action Taken' and edit buttons when viewed in read-only mode by Requester (AC-06, BR-09)", async () => {
    // Render as REQUESTER role
    renderComponent(mockRequesterUser, true);

    expect(await screen.findByTestId("actions-taken-title")).toBeInTheDocument();

    // Verify "+ Log Action Taken" button is hidden
    expect(screen.queryByTestId("log-action-btn")).not.toBeInTheDocument();

    // Verify edit buttons are hidden
    expect(screen.queryByTestId("edit-action-btn-101")).not.toBeInTheDocument();
    expect(screen.queryByTestId("edit-action-btn-102")).not.toBeInTheDocument();
    expect(screen.queryByTestId("mobile-edit-action-btn-101")).not.toBeInTheDocument();

    // But data is still rendered
    expect(screen.getAllByText("Replaced degraded battery unit with genuine spare part.")[0]).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Additional Edge-Case: Edit Action Taken pre-fills modal and submits version
  // ---------------------------------------------------------------------------
  it("opens edit modal with existing action data and submits update with version", async () => {
    renderComponent(mockStaffUser);

    const editBtn = await screen.findByTestId("edit-action-btn-101");
    fireEvent.click(editBtn);

    // Modal title indicates Edit mode
    expect(screen.getByTestId("action-modal-title")).toHaveTextContent("Edit Action Taken");

    // Pre-filled values
    const descInput = screen.getByTestId("action-description-input") as HTMLTextAreaElement;
    expect(descInput.value).toBe("Replaced degraded battery unit with genuine spare part.");

    // Update result
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Updated result after 24h burn-in" },
    });

    vi.mocked(api.updateActionTaken).mockResolvedValueOnce({
      ...mockActions[0],
      result: "Updated result after 24h burn-in",
      version: 2,
    });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(api.updateActionTaken).toHaveBeenCalledWith(
        1,
        101,
        expect.objectContaining({
          result: "Updated result after 24h burn-in",
          version: 1,
        })
      );
    });
  });

  // ---------------------------------------------------------------------------
  // Additional Edge-Case: 409 Conflict Banner and recovery
  // ---------------------------------------------------------------------------
  it("displays 409 conflict alert banner when concurrent update occurs (AC-08)", async () => {
    renderComponent(mockStaffUser);

    const editBtn = await screen.findByTestId("edit-action-btn-101");
    fireEvent.click(editBtn);

    const conflictErr = new Error("Stale update");
    (conflictErr as any).code = "STALE_UPDATE";
    (conflictErr as any).status = 409;
    (conflictErr as any).currentAction = {
      ...mockActions[0],
      version: 2,
      result: "Concurrently updated by Lisa",
    };

    vi.mocked(api.updateActionTaken).mockRejectedValueOnce(conflictErr);

    fireEvent.click(screen.getByTestId("save-action-btn"));

    // Stale update banner appears
    expect(await screen.findByTestId("action-conflict-banner")).toBeInTheDocument();
    expect(screen.getByTestId("reload-conflict-action-btn")).toBeInTheDocument();

    // Clicking reload fetches fresh actions
    fireEvent.click(screen.getByTestId("reload-conflict-action-btn"));
    await waitFor(() => {
      expect(api.fetchActionsTaken).toHaveBeenCalledTimes(2);
    });
  });

  // ---------------------------------------------------------------------------
  // Additional: Empty state rendering
  // ---------------------------------------------------------------------------
  it("renders friendly empty state when no actions have been logged yet", async () => {
    vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce([]);

    renderComponent(mockStaffUser);

    expect(await screen.findByTestId("no-actions-message")).toBeInTheDocument();
    expect(screen.getByText("No actions taken logged yet.")).toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // RESP-01: Mobile card layout and touch targets (AC-01, RESP-01)
  // ---------------------------------------------------------------------------
  it("RESP-01: renders mobile card layout with performer fallback and touch targets >= 44px", async () => {
    // Include an action with missing performedBy to verify null fallback
    const actionsWithNullPerformer: api.ActionTakenItem[] = [
      {
        ...mockActions[0],
        id: 104,
        performedBy: undefined as any,
      },
    ];
    vi.mocked(api.fetchActionsTaken).mockResolvedValueOnce(actionsWithNullPerformer);

    renderComponent(mockStaffUser);

    // Mobile list container is rendered
    expect(await screen.findByTestId("actions-mobile-cards")).toBeInTheDocument();

    // Mobile card for action 104
    const mobileCard = screen.getByTestId("action-card-104");
    expect(mobileCard).toBeInTheDocument();
    expect(mobileCard).toHaveTextContent("By System");

    // Verify touch target for mobile edit button
    const mobileEditBtn = screen.getByTestId("mobile-edit-action-btn-104");
    expect(mobileEditBtn).toBeInTheDocument();
    expect(mobileEditBtn).toHaveStyle({ minHeight: "44px" });
  });

  // ---------------------------------------------------------------------------
  // Accessibility: Escape key modal dismissal (WCAG AA)
  // ---------------------------------------------------------------------------
  it("dismisses modal when Escape key is pressed (WCAG AA accessibility)", async () => {
    renderComponent(mockStaffUser);

    const logBtn = await screen.findByTestId("log-action-btn");
    fireEvent.click(logBtn);
    expect(screen.getByTestId("action-taken-modal")).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    // Modal should be dismissed
    expect(screen.queryByTestId("action-taken-modal")).not.toBeInTheDocument();
  });

  // ---------------------------------------------------------------------------
  // Validation: Missing datetime rejection
  // ---------------------------------------------------------------------------
  it("rejects missing datetime during form validation", async () => {
    renderComponent(mockStaffUser);

    const logBtn = await screen.findByTestId("log-action-btn");
    fireEvent.click(logBtn);

    // Fill valid description & result
    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Checked optical fiber splice" },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Optical loss within tolerance" },
    });

    // Clear datetime input
    fireEvent.change(screen.getByTestId("action-datetime-input"), {
      target: { value: "" },
    });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    expect(await screen.findByText(/Action date\/time is required/i)).toBeInTheDocument();
    expect(api.createActionTaken).not.toHaveBeenCalled();
  });
});

