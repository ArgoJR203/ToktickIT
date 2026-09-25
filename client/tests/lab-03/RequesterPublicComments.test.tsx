import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RequesterTicketDetail } from "../../src/components/RequesterTicketDetail.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

// Mock API module
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    getMe: vi.fn().mockResolvedValue({
      user: {
        id: 1,
        name: "Jennifer Anderson",
        email: "jennifer.anderson@example.com",
        role: "REQUESTER",
        mustChangePassword: false,
        isActive: true,
      },
    }),
    fetchTicketDetail: vi.fn(),
    fetchPublicComments: vi.fn(),
    postPublicComment: vi.fn(),
    indicateProblemResolved: vi.fn(),
  };
});

const mockRequesterUser: api.AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER",
  mustChangePassword: false,
  isActive: true,
};

const baseMockTicket: api.TicketDetail = {
  id: 42,
  ticketNumber: "TKT-2026-000042",
  requesterId: 1,
  categoryId: 4,
  relatedSystemId: 3,
  summary: "VPN Client disconnected unexpectedly",
  description: "AnyConnect VPN terminates after 5 minutes of inactivity with error 403.",
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  resolutionIndicated: false,
  resolutionIndicatedAt: null,
  resolutionSummary: null,
  createdAt: "2026-05-14T08:30:00.000Z",
  updatedAt: "2026-05-14T08:30:00.000Z",
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 3, name: "VPN" },
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  attachments: [],
};

const mockComments: api.PublicComment[] = [
  {
    id: 1,
    ticketId: 42,
    content: "I am unable to access internal services via VPN.",
    author: {
      id: 1,
      name: "Jennifer Anderson",
      role: "REQUESTER",
    },
    createdAt: "2026-05-14T08:35:00.000Z",
  },
  {
    id: 2,
    ticketId: 42,
    content: "We have verified the gateway and reset your profile route.",
    author: {
      id: 5,
      name: "Alex Thompson",
      role: "IT_STAFF",
    },
    createdAt: "2026-05-14T08:45:00.000Z",
  },
];

function renderTicketDetail(ticketId = 42, onBack = vi.fn()) {
  return render(
    <AuthProvider initialUser={mockRequesterUser} initialToken="fake-jwt-token">
      <RequesterProvider>
        <RequesterTicketDetail ticketId={ticketId} onBack={onBack} />
      </RequesterProvider>
    </AuthProvider>
  );
}

describe("Requester Ticket Detail — Public Comments & Resolution Signal (Issue #3-5, API-11, API-19)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_token", "fake-jwt-token");
    localStorage.setItem("toktickit_user", JSON.stringify(mockRequesterUser));
    vi.clearAllMocks();
  });

  it("renders public comments feed with author roles and timestamps (API-11, AC-11)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(baseMockTicket);
    vi.mocked(api.fetchPublicComments).mockResolvedValue(mockComments);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("Public Comments")).toBeInTheDocument();
    });

    // Verify comment contents
    expect(screen.getByText("I am unable to access internal services via VPN.")).toBeInTheDocument();
    expect(screen.queryByText("We are actively investigating the logs.")).toBeNull();
    expect(screen.getByText("We have verified the gateway and reset your profile route.")).toBeInTheDocument();

    // Verify author role badges
    expect(screen.getAllByText("Requester").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("IT Staff")).toBeInTheDocument();

    // Ensure internal notes are strictly hidden / not rendered (AC-04, BR-04)
    expect(screen.queryByText(/Internal Notes/i)).toBeNull();
  });

  it("enforces comment submission validation and posts new public comment (API-11, API-12)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(baseMockTicket);
    vi.mocked(api.fetchPublicComments).mockResolvedValue(mockComments);

    const newComment: api.PublicComment = {
      id: 3,
      ticketId: 42,
      content: "VPN is reconnecting properly now, thank you!",
      author: {
        id: 1,
        name: "Jennifer Anderson",
        role: "REQUESTER",
      },
      createdAt: "2026-05-14T09:00:00.000Z",
    };
    vi.mocked(api.postPublicComment).mockResolvedValue(newComment);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("Public Comments")).toBeInTheDocument();
    });

    const postBtn = screen.getByRole("button", { name: /Post Comment/i });
    expect(postBtn).toBeDisabled();

    const textarea = screen.getByLabelText(/Add a Comment/i);
    // Whitespace only should remain disabled
    fireEvent.change(textarea, { target: { value: "    " } });
    expect(postBtn).toBeDisabled();

    // Valid text enables button
    fireEvent.change(textarea, { target: { value: "VPN is reconnecting properly now, thank you!" } });
    expect(postBtn).toBeEnabled();

    // Submit comment
    fireEvent.click(postBtn);

    await waitFor(() => {
      expect(api.postPublicComment).toHaveBeenCalledWith(42, "VPN is reconnecting properly now, thank you!", 1);
      expect(screen.getByText("VPN is reconnecting properly now, thank you!")).toBeInTheDocument();
    });
  });

  it("displays 'Problem Appears Resolved' action card and triggers indication signal (API-19, BR-05, BR-16)", async () => {
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(baseMockTicket);
    vi.mocked(api.fetchPublicComments).mockResolvedValue([]);
    vi.mocked(api.indicateProblemResolved).mockResolvedValue({
      message: "Problem resolution indicated. IT Staff have been notified to review and finalize.",
      ticketId: 42,
      resolutionIndicated: true,
      resolutionIndicatedAt: "2026-05-14T09:30:00.000Z",
    });

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("Is your problem resolved?")).toBeInTheDocument();
    });

    const resolveBtn = screen.getByRole("button", { name: /Problem Appears Resolved/i });
    expect(resolveBtn).toBeInTheDocument();

    fireEvent.click(resolveBtn);

    await waitFor(() => {
      expect(api.indicateProblemResolved).toHaveBeenCalledWith(42, 1);
      expect(screen.getByText("Problem Indicated as Resolved")).toBeInTheDocument();
      expect(screen.getByText(/IT Staff have been notified to review and formally close the ticket/i)).toBeInTheDocument();
    });
  });

  it("renders Resolution Summary when ticket is resolved with summary text (BR-15, Handout §8.4)", async () => {
    const resolvedTicket: api.TicketDetail = {
      ...baseMockTicket,
      currentStatus: "RESOLVED",
      resolutionSummary: "Replaced SSL root cert on client machine and flushed DNS cache.",
    };
    vi.mocked(api.fetchTicketDetail).mockResolvedValue(resolvedTicket);
    vi.mocked(api.fetchPublicComments).mockResolvedValue([]);

    renderTicketDetail();

    await waitFor(() => {
      expect(screen.getByText("Resolution Summary")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Replaced SSL root cert on client machine and flushed DNS cache.")
    ).toBeInTheDocument();
  });
});
