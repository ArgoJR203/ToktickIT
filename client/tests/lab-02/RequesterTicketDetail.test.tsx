import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterTicketDetail } from "../../src/components/RequesterTicketDetail.js";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

// Mock API layer
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchTicketDetail: vi.fn(),
  };
});

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  isActive: true,
};

const mockTicketDetail: api.TicketDetail = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  requesterId: 1,
  categoryId: 4,
  relatedSystemId: 3,
  summary: "VPN Client disconnected unexpectedly",
  description: "AnyConnect VPN terminates after 5 minutes of inactivity with error 403.",
  requestedPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  createdAt: "2026-05-14T08:30:00.000Z",
  updatedAt: "2026-05-14T08:30:00.000Z",
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 3, name: "VPN" },
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  attachments: [
    {
      id: 101,
      filename: "vpn_log.txt",
      originalName: "vpn_log.txt",
      mimeType: "text/plain",
      sizeBytes: 15360,
      isRemoved: false,
      createdAt: "2026-05-14T08:31:00.000Z",
    },
    {
      id: 102,
      filename: "old_screenshot.png",
      originalName: "old_screenshot.png",
      mimeType: "image/png",
      sizeBytes: 204800,
      isRemoved: true,
      removalReason: "Uploaded wrong screenshot",
      removedAt: "2026-05-14T09:00:00.000Z",
      createdAt: "2026-05-14T08:32:00.000Z",
    },
  ],
};

describe("RequesterTicketDetail Component Tests (UI-07, AC-03, FR-07)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_requester", JSON.stringify(mockRequester));
    vi.clearAllMocks();
  });

  it("renders ticket header, metadata grid, description, and attachments (UI-07, FR-07)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(mockTicketDetail);
    const onBack = vi.fn();

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={42} onBack={onBack} />
      </RequesterProvider>
    );

    // Wait for ticket detail to load
    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
    });

    // Verify breadcrumb
    expect(screen.getByRole("button", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByText("Ticket Details")).toBeInTheDocument();

    // Verify summary and status badge
    expect(screen.getByRole("heading", { name: "VPN Client disconnected unexpectedly" })).toBeInTheDocument();
    expect(screen.getAllByText("IN PROGRESS").length).toBeGreaterThan(0);

    // Verify metadata grid elements
    expect(screen.getByText("Jennifer Anderson")).toBeInTheDocument();
    expect(screen.getByText("jennifer.anderson@example.com")).toBeInTheDocument();
    expect(screen.getByText("Network")).toBeInTheDocument();
    expect(screen.getByText("VPN")).toBeInTheDocument();
    expect(screen.getAllByText("HIGH").length).toBeGreaterThan(0);

    // Verify full description box
    expect(
      screen.getByText("AnyConnect VPN terminates after 5 minutes of inactivity with error 403.")
    ).toBeInTheDocument();

    // Verify attachments section
    expect(screen.getByText(/Attachments \(1\/5 active\)/i)).toBeInTheDocument();
    expect(screen.getByText("vpn_log.txt")).toBeInTheDocument();
    expect(screen.getByText("old_screenshot.png")).toBeInTheDocument();
    expect(screen.getByText("Removed")).toBeInTheDocument();
    expect(screen.getByText(/Reason: Uploaded wrong screenshot/i)).toBeInTheDocument();
  });

  it("triggers onBack callback when breadcrumb or Back button is clicked (UI-07)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(mockTicketDetail);
    const onBack = vi.fn();

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={42} onBack={onBack} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByText("TKT-2026-000042")).toBeInTheDocument();
    });

    // Click breadcrumb link
    const breadcrumbBtn = screen.getByRole("button", { name: "My Tickets" });
    fireEvent.click(breadcrumbBtn);
    expect(onBack).toHaveBeenCalledTimes(1);

    // Click Back to My Tickets button
    const backBtn = screen.getByRole("button", { name: /← Back to My Tickets/i });
    fireEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(2);
  });

  it("renders Zen Green error banner when ticket fetch fails with 403 / 404 or network error (AC-03, BR-18, AC-10)", async () => {
    vi.mocked(api.fetchTicketDetail).mockRejectedValue(new Error("Access denied: You do not own this ticket"));
    const onBack = vi.fn();

    render(
      <RequesterProvider>
        <RequesterTicketDetail ticketId={999} onBack={onBack} />
      </RequesterProvider>
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
    });

    expect(screen.getByText("Access denied: You do not own this ticket")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /← Back to My Tickets/i })).toBeInTheDocument();

    // Clicking back button navigates back
    fireEvent.click(screen.getByRole("button", { name: /← Back to My Tickets/i }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
