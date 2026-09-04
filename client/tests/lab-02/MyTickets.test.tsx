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

  it("simulates mobile device viewport (<768px), renders tickets as cards with >=44px touch targets, and prevents horizontal overflow (RESP-01, AC-09)", async () => {
    // Simulate mobile device screen (<768px, e.g. iPhone SE 375x667)
    window.innerWidth = 375;
    window.innerHeight = 667;
    window.dispatchEvent(new Event("resize"));

    await setupMyTicketsScreen();

    // Verify desktop table view is configured with d-none d-md-block (hidden on mobile)
    const desktopTableView = screen.getByTestId("desktop-table-view");
    expect(desktopTableView).toHaveClass("d-none", "d-md-block");

    // Verify mobile card list is rendered with d-md-none (visible on mobile) and overflow prevention
    const mobileCardList = screen.getByTestId("mobile-card-list");
    expect(mobileCardList).toHaveClass("d-md-none", "mobile-card-container");

    // Verify all tickets render as stacked cards inside the mobile card container
    const mobileCards = mobileCardList.querySelectorAll(".mobile-ticket-card");
    expect(mobileCards.length).toBe(mockTicketsResponse.data.length);

    // Verify each ticket card satisfies touch target height (>= 44px) and contains required fields
    mobileCards.forEach((card, idx) => {
      const ticket = mockTicketsResponse.data[idx];
      const cardEl = card as HTMLElement;

      // Touch target verification: card minHeight is explicitly >= 44px
      expect(cardEl.style.minHeight).toBe("44px");

      // Card content verification: ticketNumber, status, summary, category, and priority
      expect(cardEl).toHaveTextContent(ticket.ticketNumber);
      expect(cardEl).toHaveTextContent(ticket.summary);
      expect(cardEl).toHaveTextContent(ticket.category.name);
      expect(cardEl).toHaveTextContent(ticket.requestedPriority);
      expect(cardEl).toHaveTextContent(ticket.currentStatus.replace("_", " "));
    });
  });

  it("renders Zen Green error banner when ticket fetch fails and allows user dismissal (UI-06, AC-10)", async () => {
    // Simulate API network failure
    vi.mocked(api.fetchTickets).mockRejectedValueOnce(new Error("Failed to connect to IT service desk server"));

    render(<App />);

    // Select active requester
    await waitFor(() => {
      expect(screen.getByRole("option", { name: /Jennifer Anderson/i })).toBeInTheDocument();
    });
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "1" } });
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

    // Verify error alert banner is rendered with the error message
    const alertBanner = await screen.findByRole("alert");
    expect(alertBanner).toBeInTheDocument();
    expect(alertBanner).toHaveClass("zen-alert-danger");
    expect(alertBanner).toHaveTextContent("Failed to connect to IT service desk server");

    // Verify dismiss button closes the alert banner
    const closeButton = alertBanner.querySelector(".btn-close");
    expect(closeButton).toBeInTheDocument();
    fireEvent.click(closeButton!);

    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
