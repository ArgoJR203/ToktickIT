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
    fetchRelatedSystems: vi.fn(),
    createTicket: vi.fn(),
  };
});

const mockRequesters: api.RequesterUser[] = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
];

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockRelatedSystems: api.RelatedSystem[] = [
  { id: 1, name: "Email", categoryId: 1, isActive: true },
  { id: 2, name: "Corporate Laptop", categoryId: 2, isActive: true },
];

describe("Create Ticket Component & Validation Tests (UI-02, UI-03, UI-06)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    // Default mock resolves
    vi.mocked(api.fetchRequesters).mockResolvedValue(mockRequesters);
    vi.mocked(api.fetchCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.fetchRelatedSystems).mockResolvedValue(mockRelatedSystems);
  });

  // Helper to establish requester context and navigate to Create Ticket tab
  const setupCreateTicketScreen = async () => {
    render(<App />);

    // Wait for RequesterSelector
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Jennifer Anderson/i })).toBeInTheDocument();
    });

    // Select Jennifer and Continue
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Wait for Header & My Tickets
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /\+ Create Ticket/i })).toBeInTheDocument();
    });

    // Click + Create Ticket button
    fireEvent.click(screen.getByRole("button", { name: /\+ Create Ticket/i }));

    // Wait for Create Ticket form
    await waitFor(() => {
      expect(screen.getByText("Create IT Support Ticket")).toBeInTheDocument();
    });
  };

  it("displays field-level validation errors when submitting an empty form (UI-02, AC-05)", async () => {
    await setupCreateTicketScreen();

    // Submit empty form
    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Verify inline field validation errors
    await waitFor(() => {
      expect(screen.getByText("Category selection is required.")).toBeInTheDocument();
      expect(screen.getByText("Related system selection is required.")).toBeInTheDocument();
      expect(screen.getByText("Ticket summary is required.")).toBeInTheDocument();
      expect(screen.getByText("Ticket description is required.")).toBeInTheDocument();
    });

    // Verify API createTicket was NOT called
    expect(api.createTicket).not.toHaveBeenCalled();
  });

  it("shows busy spinner and disabled state during ticket submission (UI-03, FR-12)", async () => {
    await setupCreateTicketScreen();

    // Mock createTicket with delayed promise
    let resolveCreate: (val: api.Ticket) => void = () => {};
    vi.mocked(api.createTicket).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveCreate = resolve;
        })
    );

    // Select Category, System, Fill Summary & Description
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Email/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    fireEvent.change(screen.getByLabelText(/Ticket Summary/i), {
      target: { value: "Cannot access corporate email account" },
    });
    fireEvent.change(screen.getByLabelText(/Detailed Description/i), {
      target: { value: "My email login credentials fail repeatedly when logging into Outlook web interface." },
    });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Verify busy state
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Submitting Ticket\.\.\./i })).toBeDisabled();
    });

    // Resolve createTicket call
    resolveCreate({
      id: 101,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Cannot access corporate email account",
      description: "My email login credentials fail repeatedly when logging into Outlook web interface.",
      requestedPriority: "MEDIUM",
      currentStatus: "NEW",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Verify success banner & redirection to My Tickets
    await waitFor(() => {
      expect(screen.getByText(/Ticket TKT-2026-000001 created successfully/i)).toBeInTheDocument();
    });
  });

  it("displays Zen Green error banner and preserves form inputs on network failure (UI-06, AC-10)", async () => {
    await setupCreateTicketScreen();

    // Mock API failure
    vi.mocked(api.createTicket).mockRejectedValueOnce(
      new Error("Unable to reach the server. Please check your connection.")
    );

    // Fill form
    fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "1" } });

    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Email/i })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "1" } });
    
    const summaryInput = screen.getByLabelText(/Ticket Summary/i);
    const descriptionInput = screen.getByLabelText(/Detailed Description/i);

    fireEvent.change(summaryInput, { target: { value: "Network failure test summary" } });
    fireEvent.change(descriptionInput, { target: { value: "Network failure test detailed description text." } });

    const submitBtn = screen.getByRole("button", { name: /Submit Ticket/i });
    fireEvent.click(submitBtn);

    // Verify error banner displays
    await waitFor(() => {
      expect(screen.getByText(/Unable to reach the server\. Please check your connection\./i)).toBeInTheDocument();
    });

    // CRITICAL (AC-10): Verify form inputs ARE PRESERVED
    expect(summaryInput).toHaveValue("Network failure test summary");
    expect(descriptionInput).toHaveValue("Network failure test detailed description text.");
  });
});
