import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { UserManagement } from "../../src/components/UserManagement.js";
import * as api from "../../src/api.js";
import { AuthContext, AuthContextType } from "../../src/context/AuthContext.js";

// Mock API functions
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchAdminUsers: vi.fn(),
    createAdminUser: vi.fn(),
    updateAdminUser: vi.fn(),
    resetAdminUserPassword: vi.fn(),
  };
});

const mockAdminUser: api.AuthUser = {
  id: 1,
  name: "John Smith",
  email: "john.smith@toktickit.com",
  role: "ADMINISTRATOR",
  isActive: true,
  mustChangePassword: false,
};

const mockUsers: api.AdminUser[] = [
  {
    id: 1,
    name: "John Smith",
    email: "john.smith@toktickit.com",
    role: "ADMINISTRATOR",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: 2,
    name: "Alice Requester",
    email: "alice@example.com",
    role: "REQUESTER",
    isActive: true,
    mustChangePassword: false,
    createdAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
  {
    id: 3,
    name: "Bob Staff",
    email: "bob@toktickit.com",
    role: "IT_STAFF",
    isActive: false,
    mustChangePassword: true,
    createdAt: "2026-01-03T00:00:00.000Z",
    updatedAt: "2026-01-03T00:00:00.000Z",
  },
];

function renderWithAuth(
  ui: React.ReactElement,
  currentUser: api.AuthUser | null = mockAdminUser
) {
  const mockAuthContext: AuthContextType = {
    currentUser,
    token: "mock-token",
    loading: false,
    error: null,
    login: vi.fn(),
    logout: vi.fn(),
    changePassword: vi.fn(),
    clearError: vi.fn(),
  };

  return render(
    <AuthContext.Provider value={mockAuthContext}>{ui}</AuthContext.Provider>
  );
}

describe("UserManagement Component Tests (UI-06, AC-13..16, FR-17..20)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchAdminUsers).mockResolvedValue(mockUsers);
  });

  it("renders user table with names, emails, role badges, and statuses", async () => {
    renderWithAuth(<UserManagement />);

    expect(screen.getByTestId("users-loading")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("users-table")).toBeInTheDocument();
    });

    // Check user rows
    expect(screen.getByText("John Smith")).toBeInTheDocument();
    expect(screen.getByText("john.smith@toktickit.com")).toBeInTheDocument();
    expect(screen.getByText("Alice Requester")).toBeInTheDocument();
    expect(screen.getByText("Bob Staff")).toBeInTheDocument();

    // Check role badges
    expect(screen.getAllByTestId("role-badge").length).toBe(3);

    // Check must change password badge on Bob Staff
    expect(screen.getByTestId("badge-must-change-password")).toBeInTheDocument();
  });

  it("handles search and role filtering correctly", async () => {
    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("users-table")).toBeInTheDocument();
    });

    const searchInput = screen.getByTestId("search-users-input");
    fireEvent.change(searchInput, { target: { value: "Alice" } });

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith({
        search: "Alice",
        role: undefined,
      });
    });

    const roleSelect = screen.getByTestId("role-filter-select");
    fireEvent.change(roleSelect, { target: { value: "IT_STAFF" } });

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith({
        search: "Alice",
        role: "IT_STAFF",
      });
    });
  });

  it("opens create user modal and creates a user successfully (AC-13, FR-18)", async () => {
    const newUser: api.AdminUser = {
      id: 4,
      name: "Carol Danvers",
      email: "carol@toktickit.com",
      role: "IT_STAFF",
      isActive: true,
      mustChangePassword: true,
      createdAt: "2026-05-01T00:00:00.000Z",
      updatedAt: "2026-05-01T00:00:00.000Z",
    };
    vi.mocked(api.createAdminUser).mockResolvedValue(newUser);

    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-create-user")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-create-user"));

    expect(screen.getByTestId("create-user-modal")).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByTestId("create-name-input"), {
      target: { value: "Carol Danvers" },
    });
    fireEvent.change(screen.getByTestId("create-email-input"), {
      target: { value: "carol@toktickit.com" },
    });
    fireEvent.change(screen.getByTestId("create-role-select"), {
      target: { value: "IT_STAFF" },
    });
    fireEvent.change(screen.getByTestId("create-password-input"), {
      target: { value: "InitialPassword123!" },
    });

    fireEvent.click(screen.getByTestId("btn-submit-create-user"));

    await waitFor(() => {
      expect(api.createAdminUser).toHaveBeenCalledWith({
        name: "Carol Danvers",
        email: "carol@toktickit.com",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "InitialPassword123!",
      });
    });

    expect(screen.getByTestId("create-success")).toHaveTextContent(
      /User created successfully/i
    );
  });

  it("displays duplicate email error when creation fails with duplicate email (BR-20, API-21)", async () => {
    const err = new Error("A user with this email address already exists.");
    (err as any).code = "DUPLICATE_EMAIL";
    (err as any).status = 409;
    vi.mocked(api.createAdminUser).mockRejectedValue(err);

    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-create-user")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-create-user"));

    fireEvent.change(screen.getByTestId("create-name-input"), {
      target: { value: "Duplicate User" },
    });
    fireEvent.change(screen.getByTestId("create-email-input"), {
      target: { value: "john.smith@toktickit.com" },
    });
    fireEvent.change(screen.getByTestId("create-password-input"), {
      target: { value: "Password123!" },
    });

    fireEvent.click(screen.getByTestId("btn-submit-create-user"));

    await waitFor(() => {
      expect(screen.getByTestId("create-error")).toHaveTextContent(
        /already exists\. Please use a unique email/i
      );
    });
  });

  it("enforces self-deactivation prevention when editing own admin account (AC-14, BR-21)", async () => {
    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-1")).toBeInTheDocument();
    });

    // John Smith is ID 1 (current logged-in user)
    fireEvent.click(screen.getByTestId("btn-edit-user-1"));

    expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();

    // Check that warning is displayed
    expect(screen.getByTestId("self-deactivation-warning")).toBeInTheDocument();

    // Active switch must be disabled
    const activeSwitch = screen.getByTestId("edit-active-checkbox");
    expect(activeSwitch).toBeDisabled();
  });

  it("enforces last active administrator preservation when sole active admin (AC-15, BR-22)", async () => {
    // mockUsers has only 1 active administrator (John Smith)
    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-edit-user-1"));

    // Check last admin warning is displayed
    expect(screen.getByTestId("last-admin-warning")).toBeInTheDocument();

    // Role selector must be disabled to prevent demotion
    const roleSelect = screen.getByTestId("edit-role-select");
    expect(roleSelect).toBeDisabled();

    // Active toggle must be disabled to prevent deactivation
    const activeSwitch = screen.getByTestId("edit-active-checkbox");
    expect(activeSwitch).toBeDisabled();
  });

  it("allows editing details for other users without restrictions", async () => {
    vi.mocked(api.updateAdminUser).mockResolvedValue({
      ...mockUsers[1],
      name: "Alice Requester Updated",
    });

    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-2")).toBeInTheDocument();
    });

    // Edit Alice Requester (ID 2)
    fireEvent.click(screen.getByTestId("btn-edit-user-2"));

    expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();
    expect(screen.queryByTestId("self-deactivation-warning")).not.toBeInTheDocument();
    expect(screen.queryByTestId("last-admin-warning")).not.toBeInTheDocument();

    // Inputs must be enabled
    const activeSwitch = screen.getByTestId("edit-active-checkbox");
    expect(activeSwitch).not.toBeDisabled();

    const roleSelect = screen.getByTestId("edit-role-select");
    expect(roleSelect).not.toBeDisabled();

    // Change name and submit
    fireEvent.change(screen.getByTestId("edit-name-input"), {
      target: { value: "Alice Requester Updated" },
    });
    fireEvent.click(screen.getByTestId("btn-submit-edit-user"));

    await waitFor(() => {
      expect(api.updateAdminUser).toHaveBeenCalledWith(2, {
        name: "Alice Requester Updated",
        email: "alice@example.com",
        role: "REQUESTER",
        isActive: true,
      });
    });

    expect(screen.getByTestId("edit-success")).toHaveTextContent(/updated successfully/i);
  });

  it("allows setting a new initial password with forced change flag (AC-16, FR-20, API-24)", async () => {
    vi.mocked(api.resetAdminUserPassword).mockResolvedValue({
      message: "New initial password set successfully.",
      userId: 2,
      mustChangePassword: true,
    });

    renderWithAuth(<UserManagement />);

    await waitFor(() => {
      expect(screen.getByTestId("btn-edit-user-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("btn-edit-user-2"));

    const resetInput = screen.getByTestId("reset-password-input");
    fireEvent.change(resetInput, { target: { value: "NewTemporary123!" } });

    fireEvent.click(screen.getByTestId("btn-reset-password"));

    await waitFor(() => {
      expect(api.resetAdminUserPassword).toHaveBeenCalledWith(2, "NewTemporary123!");
    });

    expect(screen.getByTestId("reset-password-success")).toHaveTextContent(
      /must change their password upon their next login/i
    );
  });
});
