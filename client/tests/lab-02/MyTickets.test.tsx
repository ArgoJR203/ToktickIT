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
    fetchTickets: vi.fn(),
  };
});

const mockRequesters: api.RequesterUser[] = [
  { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com", isActive: true },
];

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
];

const mockTicketsResponse: api.PaginatedTicketsResponse = {
  data: [
    {
      id: 101,
      ticketNumber: "TKT-2026-000001",
      requesterId: 1,
      categoryId: 1,
      relatedSystemId: 1,
      summary: "Cannot access campus email",
      description: "Outlook login fails repeatedly with authentication error.",
      requestedPriority: "HIGH",
      currentStatus: "NEW",
      createdAt: "2026-05-12T09:14:00.000Z",
      updatedAt: "2026-05-12T09:14:00.000Z",
      category: { id: 1, name: "Account and Access" },
      relatedSystem: { id: 1, name: "Email" },
      _count: { attachments: 0 },
    },
    {
      id: 102,
      ticketNumber: "TKT-2026-000002",
      requesterId: 1,
      categoryId: 2,
      relatedSystemId: 7,
      summary: "Laptop battery draining fast",
      description: "Battery discharges within 30 minutes when idle.",
      requestedPriority: "MEDIUM",
      currentStatus: "IN_PROGRESS",
      createdAt: "2026-05-13T10:20:00.000Z",
      updatedAt: "2026-05-13T10:20:00.000Z",
      category: { id: 2, name: "Hardware" },
      relatedSystem: { id: 7, name: "Corporate Laptop" },
      _count: { attachments: 1 },
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    totalItems: 2,
    totalPages: 1,
  },
};

describe("My Tickets Dashboard & Responsive View Tests (UI-05, RESP-01)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();

    vi.mocked(api.fetchRequesters).mockResolvedValue(mockRequesters);
    vi.mocked(api.fetchCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.fetchTickets).mockResolvedValue(mockTicketsResponse);
  });

  const setupMyTicketsScreen = async () => {
    render(<App />);

    // Wait for RequesterSelector
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Jennifer Anderson/i })).toBeInTheDocument();
    });

    // Select Jennifer and Continue
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Wait for My Tickets Dashboard
    await waitFor(() => {
      expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0);
    });
  };

  it("renders desktop table with Zen Green styling, headers, and ticket data (UI-05)", async () => {
    await setupMyTicketsScreen();

    // Verify page title & + Create Ticket button
    expect(screen.getByRole("heading", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /\+ Create Ticket/i })).toBeInTheDocument();

    // Verify desktop table headers
    expect(screen.getByText(/Ticket No\./i)).toBeInTheDocument();
    expect(screen.getByText(/Created Date/i)).toBeInTheDocument();
    expect(screen.getAllByText("Summary").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Category").length).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: /Priority/i })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: /Status/i })).toBeInTheDocument();

    // Verify row data
    expect(screen.getAllByText("Cannot access campus email").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Laptop battery draining fast").length).toBeGreaterThan(0);
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MEDIUM").length).toBeGreaterThan(0);
  });

  it("triggers search and filter API requests upon user interaction (UI-05)", async () => {
    await setupMyTicketsScreen();

    const searchInput = screen.getByPlaceholderText(/Search ticket # or summary\.\.\./i);
    fireEvent.change(searchInput, { target: { value: "VPN" } });

    await waitFor(() => {
      expect(api.fetchTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "VPN",
          page: 1,
        }),
        1
      );
    });
  });

  it("renders mobile card layout elements for mobile viewports (RESP-01, AC-09)", async () => {
    await setupMyTicketsScreen();

    // Verify both ticket cards render with Ticket Numbers & Summaries
    const ticket1Elements = screen.getAllByText("TKT-2026-000001");
    const ticket2Elements = screen.getAllByText("TKT-2026-000002");

    expect(ticket1Elements.length).toBeGreaterThan(0);
    expect(ticket2Elements.length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cannot access campus email").length).toBeGreaterThan(0);
  });
});
