import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChangePassword } from "../../src/components/ChangePassword.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import * as api from "../../src/api.js";

// Mock API layer
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    login: vi.fn(),
    logout: vi.fn(),
    getMe: vi.fn(),
    changePassword: vi.fn(),
  };
});

const mockMustChangeUser: api.AuthUser = {
  id: 11,
  name: "Must Change User",
  email: "must_change@toktickit.com",
  role: "REQUESTER",
  mustChangePassword: true,
  isActive: true,
};

const renderChangePassword = (props: { onSuccess?: () => void } = {}) => {
  return render(
    <AuthProvider initialUser={mockMustChangeUser} initialToken="mock_token_11">
      <ChangePassword {...props} />
    </AuthProvider>
  );
};

describe("ChangePassword Component — UI-02 (AC-02, FR-03, BR-07)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders current, new, and confirm password inputs, and password checklist", () => {
    renderChangePassword();

    expect(screen.getByRole("heading", { name: "Change Your Password", level: 1 })).toBeInTheDocument();
    expect(
      screen.getByText("You must change your initial password before continuing.")
    ).toBeInTheDocument();

    expect(screen.getByLabelText(/Current \(initial\) password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Confirm new password/i)).toBeInTheDocument();

    expect(screen.getByTestId("rule-length")).toHaveTextContent("At least 8 characters");
    expect(screen.getByTestId("rule-case")).toHaveTextContent("Includes uppercase and lowercase letters");
    expect(screen.getByTestId("rule-special")).toHaveTextContent("Includes a number or special character");
    expect(screen.getByTestId("rule-match")).toHaveTextContent("Passwords match");

    const submitBtn = screen.getByRole("button", { name: "Continue" });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });

  it("dynamically updates live checklist as user types each requirement (BR-07)", async () => {
    const user = userEvent.setup();
    renderChangePassword();

    const newPassInput = screen.getByLabelText(/^New password/i);
    const confirmPassInput = screen.getByLabelText(/Confirm new password/i);

    // Initial state: all rules invalid
    expect(screen.getByTestId("rule-length")).not.toHaveClass("valid");
    expect(screen.getByTestId("rule-case")).not.toHaveClass("valid");
    expect(screen.getByTestId("rule-special")).not.toHaveClass("valid");
    expect(screen.getByTestId("rule-match")).not.toHaveClass("valid");

    // 1. Type "short" (< 8 chars, lowercase only)
    await user.type(newPassInput, "short");
    expect(screen.getByTestId("rule-length")).not.toHaveClass("valid");
    expect(screen.getByTestId("rule-case")).not.toHaveClass("valid");
    expect(screen.getByTestId("rule-special")).not.toHaveClass("valid");

    // 2. Type "ShortPassword" (>= 8 chars, upper and lowercase, no number/special)
    await user.clear(newPassInput);
    await user.type(newPassInput, "ShortPassword");
    expect(screen.getByTestId("rule-length")).toHaveClass("valid");
    expect(screen.getByTestId("rule-case")).toHaveClass("valid");
    expect(screen.getByTestId("rule-special")).not.toHaveClass("valid");

    // 3. Add a number/special char: "ShortPassword1!"
    await user.type(newPassInput, "1!");
    expect(screen.getByTestId("rule-length")).toHaveClass("valid");
    expect(screen.getByTestId("rule-case")).toHaveClass("valid");
    expect(screen.getByTestId("rule-special")).toHaveClass("valid");
    // Match still not satisfied because confirm is empty
    expect(screen.getByTestId("rule-match")).not.toHaveClass("valid");

    // 4. Type non-matching confirm
    await user.type(confirmPassInput, "Mismatch1!");
    expect(screen.getByTestId("rule-match")).not.toHaveClass("valid");

    // 5. Type matching confirm
    await user.clear(confirmPassInput);
    await user.type(confirmPassInput, "ShortPassword1!");
    expect(screen.getByTestId("rule-match")).toHaveClass("valid");
  });

  it("enforces submit button disablement until all criteria and current password are provided", async () => {
    const user = userEvent.setup();
    renderChangePassword();

    const currentPassInput = screen.getByLabelText(/Current \(initial\) password/i);
    const newPassInput = screen.getByLabelText(/^New password/i);
    const confirmPassInput = screen.getByLabelText(/Confirm new password/i);
    const submitBtn = screen.getByRole("button", { name: "Continue" });

    expect(submitBtn).toBeDisabled();

    // Fill valid new password and confirm, but leave current password empty
    await user.type(newPassInput, "ValidPass123!");
    await user.type(confirmPassInput, "ValidPass123!");
    expect(submitBtn).toBeDisabled();

    // Now fill current password
    await user.type(currentPassInput, "Initial123!");
    expect(submitBtn).not.toBeDisabled();

    // If new password loses complexity, button disables again
    await user.clear(newPassInput);
    await user.type(newPassInput, "short");
    expect(submitBtn).toBeDisabled();
  });

  it("submits valid password change and calls onSuccess callback", async () => {
    const user = userEvent.setup();
    const onSuccessMock = vi.fn();

    vi.mocked(api.changePassword).mockResolvedValueOnce({
      message: "Password changed successfully.",
      user: {
        ...mockMustChangeUser,
        mustChangePassword: false,
      },
    });

    renderChangePassword({ onSuccess: onSuccessMock });

    await user.type(screen.getByLabelText(/Current \(initial\) password/i), "Initial123!");
    await user.type(screen.getByLabelText(/^New password/i), "BrandNewPass99#");
    await user.type(screen.getByLabelText(/Confirm new password/i), "BrandNewPass99#");

    const submitBtn = screen.getByRole("button", { name: "Continue" });
    expect(submitBtn).not.toBeDisabled();
    await user.click(submitBtn);

    await waitFor(() => {
      expect(api.changePassword).toHaveBeenCalledWith(
        {
          currentPassword: "Initial123!",
          newPassword: "BrandNewPass99#",
          confirmPassword: "BrandNewPass99#",
        },
        "mock_token_11"
      );
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });
  });

  it("displays error banner if current password verification fails (API-04, API-05)", async () => {
    const user = userEvent.setup();

    vi.mocked(api.changePassword).mockRejectedValueOnce(
      new Error("Current password is incorrect.")
    );

    renderChangePassword();

    await user.type(screen.getByLabelText(/Current \(initial\) password/i), "WrongInitial!");
    await user.type(screen.getByLabelText(/^New password/i), "BrandNewPass99#");
    await user.type(screen.getByLabelText(/Confirm new password/i), "BrandNewPass99#");

    await user.click(screen.getByRole("button", { name: "Continue" }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Current password is incorrect.");
    });
  });

  it("allows user to cancel and sign out safely", async () => {
    const user = userEvent.setup();
    renderChangePassword();

    const cancelBtn = screen.getByRole("button", { name: "Cancel and sign out" });
    await user.click(cancelBtn);

    await waitFor(() => {
      expect(api.logout).toHaveBeenCalledWith("mock_token_11");
    });
  });
});
