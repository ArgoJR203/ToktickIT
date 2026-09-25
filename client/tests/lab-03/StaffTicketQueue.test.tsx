import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StaffTicketQueue } from "../../src/components/StaffTicketQueue.js";
import * as api from "../../src/api.js";

// Mock API functions
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchCategories: vi.fn(),
    fetchStaffTickets: vi.fn(),
  };
});

const mockCategories: api.Category[] = [
  { id: 1, name: "Account and Access" },
  { id: 2, name: "Hardware" },
  { id: 3, name: "Software" },
  { id: 4, name: "Network" },
];

const mockTickets: api.StaffTicketItem[] = [
  {
    id: 101,
    ticketNumber: "TKT-2026-000101",
    summary: "Cannot access internal wiki portal",
    description: "Wiki returns 502 bad gateway error",
    category: { id: 1, name: "Account and Access" },
    relatedSystem: { id: 1, name: "Wiki" },
    requester: { id: 1, name: "Alice Requester", email: "alice@example.com" },
    requestedPriority: "MEDIUM",
    itPriority: "HIGH",
    currentStatus: "OPEN",
    owner: { id: 2, name: "Bob Staff", email: "bob@toktickit.com" },
    createdAt: "2026-05-10T09:00:00.000Z",
    updatedAt: "2026-05-10T10:00:00.000Z",
  },
  {
    id: 102,
    ticketNumber: "TKT-2026-000102",
    summary: "New monitor display flickering",
    description: "HDMI connection intermittently drops",
    category: { id: 2, name: "Hardware" },
    relatedSystem: { id: 2, name: "Workstation" },
    requester: { id: 3, name: "Charlie Requester", email: "charlie@example.com" },
    requestedPriority: "LOW",
    itPriority: "LOW",
    currentStatus: "NEW",
    owner: null, // Unassigned
    createdAt: "2026-05-11T14:30:00.000Z",
    updatedAt: "2026-05-11T14:30:00.000Z",
  },
];

describe("StaffTicketQueue Component Tests (UI-03, AC-07, FR-11, FR-12)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchCategories).mockResolvedValue(mockCategories);
    vi.mocked(api.fetchStaffTickets).mockImplementation(async () => ({
      data: mockTickets,
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 2,
        totalPages: 1,
      },
    }));
  });

  it("renders queue header, summary count, and ticket table rows", async () => {
    render(<StaffTicketQueue />);

    expect(screen.getByTestId("queue-title")).toHaveTextContent("Ticket Queue");

    // Wait for tickets to load
    await waitFor(() => {
      expect(screen.getByTestId("queue-summary-count")).toHaveTextContent("Showing 1 to 2 of 2 tickets");
    });

    // Check table rows & elements
    const links = screen.getAllByTestId("ticket-number-link");
    expect(links[0]).toHaveTextContent("TKT-2026-000101");
    expect(links[1]).toHaveTextContent("TKT-2026-000102");

    expect(screen.getAllByText("Cannot access internal wiki portal").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Alice Requester").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Bob Staff").length).toBeGreaterThanOrEqual(1);

    expect(screen.getAllByText("New monitor display flickering").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Unassigned").length).toBeGreaterThanOrEqual(1);
  });

  it("renders status and priority badges matching specification", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getAllByTestId("ticket-number-link").length).toBe(2);
    });

    // Status badges (both desktop & mobile render)
    const openBadges = screen.getAllByTestId("status-badge-open");
    expect(openBadges[0]).toHaveTextContent("OPEN");

    const newBadges = screen.getAllByTestId("status-badge-new");
    expect(newBadges[0]).toHaveTextContent("NEW");

    // Priority badges
    const highBadges = screen.getAllByTestId("priority-badge-high");
    expect(highBadges[0]).toHaveTextContent("HIGH");

    const lowBadges = screen.getAllByTestId("priority-badge-low");
    expect(lowBadges[0]).toHaveTextContent("LOW");
  });

  it("triggers search filter when typing into search input", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalled();
    });

    const searchInput = screen.getByTestId("search-input");
    fireEvent.change(searchInput, { target: { value: "wiki" } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "wiki",
          page: 1,
        })
      );
    });

    // Clear search button appears
    const clearBtn = screen.getByTestId("clear-search-btn");
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "",
        })
      );
    });
  });

  it("triggers category filter when selecting a category", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("category-filter")).toBeInTheDocument();
    });

    const categorySelect = screen.getByTestId("category-filter");
    fireEvent.change(categorySelect, { target: { value: "2" } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: "2",
          page: 1,
        })
      );
    });
  });

  it("triggers status filter when selecting a status", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("status-filter")).toBeInTheDocument();
    });

    const statusSelect = screen.getByTestId("status-filter");
    fireEvent.change(statusSelect, { target: { value: "OPEN" } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "OPEN",
          page: 1,
        })
      );
    });
  });

  it("triggers IT priority filter when selecting a priority", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("priority-filter")).toBeInTheDocument();
    });

    const prioritySelect = screen.getByTestId("priority-filter");
    fireEvent.change(prioritySelect, { target: { value: "URGENT" } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          itPriority: "URGENT",
          page: 1,
        })
      );
    });
  });

  it("triggers assignment filter when selecting unassigned or assigned to me", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("assignment-filter")).toBeInTheDocument();
    });

    const assignmentSelect = screen.getByTestId("assignment-filter");
    fireEvent.change(assignmentSelect, { target: { value: "unassigned" } });

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: "unassigned",
          page: 1,
        })
      );
    });
  });

  it("clears all active filters when clicking 'Clear all filters'", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalled();
    });

    // Apply a search
    fireEvent.change(screen.getByTestId("search-input"), { target: { value: "monitor" } });
    await waitFor(() => {
      expect(screen.getByTestId("clear-filters-btn")).toBeInTheDocument();
    });

    // Click clear filters
    fireEvent.click(screen.getByTestId("clear-filters-btn"));

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "",
          categoryId: "",
          status: "",
          itPriority: "",
          ownerId: "",
          sortBy: "createdAt",
          sortOrder: "desc",
          page: 1,
        })
      );
    });
  });

  it("toggles sorting when clicking column headers", async () => {
    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("sort-ticket-number")).toBeInTheDocument();
    });

    // Click Ticket No. column header
    fireEvent.click(screen.getByTestId("sort-ticket-number"));

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "ticketNumber",
          sortOrder: "asc",
        })
      );
    });

    // Click again to toggle desc
    fireEvent.click(screen.getByTestId("sort-ticket-number"));

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: "ticketNumber",
          sortOrder: "desc",
        })
      );
    });
  });

  it("invokes onSelectTicket callback when clicking ticket number or view details button", async () => {
    const onSelectTicketMock = vi.fn();
    render(<StaffTicketQueue onSelectTicket={onSelectTicketMock} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("ticket-number-link").length).toBe(2);
    });

    // Click View Details button on the first ticket
    const viewDetailsButtons = screen.getAllByTestId("view-details-btn");
    fireEvent.click(viewDetailsButtons[0]);
    expect(onSelectTicketMock).toHaveBeenCalledWith(101);

    // Click ticket number link on the second ticket
    const ticketLinks = screen.getAllByTestId("ticket-number-link");
    fireEvent.click(ticketLinks[1]);
    expect(onSelectTicketMock).toHaveBeenCalledWith(102);
  });

  it("renders empty state when no tickets are returned", async () => {
    vi.mocked(api.fetchStaffTickets).mockImplementationOnce(async () => ({
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        totalItems: 0,
        totalPages: 1,
      },
    }));

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-empty-state")).toBeInTheDocument();
    });

    expect(screen.getByRole("heading", { name: "No tickets found" })).toBeInTheDocument();
    expect(screen.getByTestId("queue-summary-count")).toHaveTextContent("No tickets found");
  });

  it("renders mobile cards with responsive touch targets and click action", async () => {
    const onSelectTicketMock = vi.fn();
    render(<StaffTicketQueue onSelectTicket={onSelectTicketMock} />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-card-101")).toBeInTheDocument();
    });

    const mobileCards = screen.getAllByTestId(/^queue-card-/);
    expect(mobileCards.length).toBe(2);

    const mobileButtons = screen.getAllByTestId("mobile-open-detail-btn");
    expect(mobileButtons[0]).toHaveClass("btn-touch-target");

    fireEvent.click(mobileButtons[0]);
    expect(onSelectTicketMock).toHaveBeenCalledWith(101);
  });

  it("handles pagination controls when multiple pages exist", async () => {
    vi.mocked(api.fetchStaffTickets).mockImplementationOnce(async () => ({
      data: mockTickets,
      pagination: {
        page: 1,
        pageSize: 2,
        totalItems: 5,
        totalPages: 3,
      },
    }));

    render(<StaffTicketQueue />);

    await waitFor(() => {
      expect(screen.getByTestId("pagination-controls")).toBeInTheDocument();
    });

    const nextBtn = screen.getByTestId("pagination-next");
    expect(nextBtn).toBeEnabled();

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(api.fetchStaffTickets).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
        })
      );
    });
  });
});
