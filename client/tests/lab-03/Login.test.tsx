import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Login } from "../../src/components/Login.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
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
    changePassword: vi.fn(),
    fetchRequesters: vi.fn().mockResolvedValue([]),
    fetchCategories: vi.fn().mockResolvedValue([]),
    fetchTickets: vi.fn().mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    }),
  };
});

const renderLogin = (props: { onSuccess?: () => void; onSwitchToDevSelector?: () => void } = {}) => {
  return render(
    <AuthProvider initialUser={null} initialToken={null}>
      <Login {...props} />
    </AuthProvider>
  );
};

describe("Login Component — UI-01 (AC-01, FR-01, FR-02)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders email, password inputs, submit button, and brand header", () => {
    renderLogin();

    expect(screen.getByRole("heading", { name: "TokTickIT", level: 1 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Sign in to your account", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Enter your credentials to continue")).toBeInTheDocument();

    expect(screen.getByLabelText(/Email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument();
  });

  it("validates required inputs and displays error when submitting empty fields", async () => {
    renderLogin();

    const submitBtn = screen.getByRole("button", { name: "Sign In" });
    fireEvent.click(submitBtn);

    expect(screen.getByRole("alert")).toHaveTextContent("Please enter both email and password.");
    expect(api.login).not.toHaveBeenCalled();
  });

  it("toggles password visibility between masked and plain text on eye button click", async () => {
    const user = userEvent.setup();
    renderLogin();

    const passwordInput = screen.getByLabelText(/^Password/i) as HTMLInputElement;
    expect(passwordInput.type).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: /Show password/i });
    await user.click(toggleBtn);

    expect(passwordInput.type).toBe("text");
    expect(screen.getByRole("button", { name: /Hide password/i })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Hide password/i }));
    expect(passwordInput.type).toBe("password");
  });

  it("displays loading spinner and disables submit button during request", async () => {
    const user = userEvent.setup();
    // Simulate delayed response
    let resolveLogin: (val: any) => void;
    vi.mocked(api.login).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveLogin = resolve;
        })
    );

    renderLogin();

    await user.type(screen.getByLabelText(/Email address/i), "user@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "Password123!");

    const submitBtn = screen.getByRole("button", { name: "Sign In" });
    await user.click(submitBtn);

    expect(screen.getByText("Signing in...")).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();

    resolveLogin!({
      token: "mock_jwt_token",
      user: {
        id: 1,
        name: "Test User",
        email: "user@example.com",
        role: "REQUESTER",
        mustChangePassword: false,
        isActive: true,
      },
    });

    await waitFor(() => {
      expect(screen.queryByText("Signing in...")).not.toBeInTheDocument();
    });
  });

  it("displays error banner on invalid credentials or inactive account rejection (AC-05, BR-01)", async () => {
    const user = userEvent.setup();
    vi.mocked(api.login).mockRejectedValueOnce(
      new Error("Invalid email or password. Please try again.")
    );

    renderLogin();

    await user.type(screen.getByLabelText(/Email address/i), "wrong@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "WrongPass123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      const alert = screen.getByRole("alert");
      expect(alert).toHaveTextContent("Invalid email or password. Please try again.");
    });
  });

  it("invokes onSuccess callback upon successful authentication (AC-01)", async () => {
    const user = userEvent.setup();
    const onSuccessMock = vi.fn();

    vi.mocked(api.login).mockResolvedValueOnce({
      token: "mock_token_123",
      user: {
        id: 10,
        name: "Alice Smith",
        email: "alice.smith@toktickit.com",
        role: "REQUESTER",
        mustChangePassword: false,
        isActive: true,
      },
    });

    renderLogin({ onSuccess: onSuccessMock });

    await user.type(screen.getByLabelText(/Email address/i), "alice.smith@toktickit.com");
    await user.type(screen.getByLabelText(/^Password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    await waitFor(() => {
      expect(api.login).toHaveBeenCalledWith({
        email: "alice.smith@toktickit.com",
        password: "Password123!",
      });
      expect(onSuccessMock).toHaveBeenCalledTimes(1);
    });
  });

  it("transitions seamlessly to My Tickets dashboard upon login as REQUESTER", async () => {
    const user = userEvent.setup();

    vi.mocked(api.login).mockResolvedValueOnce({
      token: "mock_jwt_token_456",
      user: {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@example.com",
        role: "REQUESTER",
        mustChangePassword: false,
        isActive: true,
      },
    });

    vi.mocked(api.fetchTickets).mockResolvedValueOnce({
      data: [
        {
          id: 101,
          ticketNumber: "TKT-2026-000001",
          requesterId: 1,
          categoryId: 1,
          relatedSystemId: 1,
          summary: "Cannot access campus email",
          description: "Outlook login fails repeatedly.",
          requestedPriority: "HIGH",
          currentStatus: "NEW",
          createdAt: "2026-05-12T09:14:00.000Z",
          updatedAt: "2026-05-12T09:14:00.000Z",
          category: { id: 1, name: "Account and Access" },
          relatedSystem: { id: 1, name: "Email" },
          _count: { attachments: 0 },
        },
      ],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
    });

    render(<App initialView="login" />);

    await user.type(screen.getByLabelText(/Email address/i), "jennifer.anderson@example.com");
    await user.type(screen.getByLabelText(/^Password/i), "Password123!");
    await user.click(screen.getByRole("button", { name: "Sign In" }));

    // Verify tickets dashboard renders with ticket data
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
      expect(screen.getAllByText(/TKT-2026-000001/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Cannot access campus email/i).length).toBeGreaterThan(0);
    });
  });
});

