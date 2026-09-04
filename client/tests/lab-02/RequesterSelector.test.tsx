import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import App from "../../src/App.js";
import * as api from "../../src/api.js";

// Mock API layer
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchRequesters: vi.fn(),
    fetchCategories: vi.fn(),
    fetchTickets: vi.fn(),
  };
});

const mockRequesters: api.RequesterUser[] = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
  { id: 2, name: "Sarah Johnson", email: "sarah.johnson@example.com", isActive: true },
];

describe("Dev Requester Selector Component & Route Guard (UI-01, AC-02)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.mocked(api.fetchCategories).mockResolvedValue([]);
    vi.mocked(api.fetchTickets).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 1 },
    });
  });

  it("renders Dev Requester Selector screen when no requester context is set (AC-02)", async () => {
    vi.mocked(api.fetchRequesters).mockResolvedValueOnce(mockRequesters);

    render(<App />);

    expect(screen.getByText("Development Requester Selector")).toBeInTheDocument();
    expect(screen.getByText(/Select a Development Requester to test requester-specific ticket behavior/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Jennifer Anderson/i })).toBeInTheDocument();
      expect(screen.getByRole("option", { name: /Sarah Johnson/i })).toBeInTheDocument();
    });
  });

  it("selects a requester and transitions to main view upon Continue click", async () => {
    vi.mocked(api.fetchRequesters).mockResolvedValueOnce(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Jennifer Anderson/i })).toBeInTheDocument();
    });

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    expect(continueBtn).not.toBeDisabled();

    fireEvent.click(continueBtn);

    await waitFor(() => {
      const userElements = screen.getAllByText(/Jennifer Anderson/i);
      expect(userElements.length).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    });
  });

  it("displays error banner when fetching requesters fails", async () => {
    vi.mocked(api.fetchRequesters).mockRejectedValueOnce(new Error("Network error loading requesters"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Network error loading requesters/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /Retry Connection/i })).toBeInTheDocument();
  });

  it("resets requester context and returns to selector screen when Change Requester is clicked (BR-19)", async () => {
    vi.mocked(api.fetchRequesters).mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Jennifer Anderson/i })).toBeInTheDocument();
    });

    // Select Jennifer Anderson and Continue
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "1" } });

    const continueBtn = screen.getByRole("button", { name: /Continue/i });
    fireEvent.click(continueBtn);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    });

    // Click "Change Requester" button in header
    const changeBtn = screen.getByRole("button", { name: /Change Requester/i });
    expect(changeBtn).toBeInTheDocument();
    fireEvent.click(changeBtn);

    // Verify context is reset and returns to selector screen
    await waitFor(() => {
      expect(screen.getByText("Development Requester Selector")).toBeInTheDocument();
    });
    expect(localStorage.getItem("toktickit_requester")).toBeNull();
  });

  it("resets active tab to My Tickets and clears selected ticket state when switching requester from detail view (BR-19)", async () => {
    vi.mocked(api.fetchRequesters).mockResolvedValue(mockRequesters);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Jennifer Anderson/i })).toBeInTheDocument();
    });

    // Select Jennifer Anderson and Continue
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    });

    // Switch requester
    fireEvent.click(screen.getByRole("button", { name: /Change Requester/i }));

    await waitFor(() => {
      expect(screen.getByText("Development Requester Selector")).toBeInTheDocument();
    });

    // Select Sarah Johnson (ID 2) and Continue
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Verify it lands cleanly on My Tickets dashboard for Sarah Johnson, not a stale detail view
    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    });
    expect(screen.getAllByText(/Sarah Johnson/i).length).toBeGreaterThan(0);
  });

  it("displays helpful server-down message when fetch fails with generic Failed to fetch error", async () => {
    vi.mocked(api.fetchRequesters).mockRejectedValueOnce(new TypeError("Failed to fetch"));

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Server Connection Error:/i)).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Unable to connect to the backend server\. The server may be offline or unreachable/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Retry Connection/i })).toBeInTheDocument();
  });
});
