import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail.js";
import * as api from "../../src/api.js";
import { AuthProvider } from "../../src/context/AuthContext.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

// Mock API module
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    fetchStaffTicketDetail: vi.fn(),
    fetchStaffAssignees: vi.fn(),
    updateTicketOwner: vi.fn(),
    updateTicketPriority: vi.fn(),
    updateTicketStatus: vi.fn(),
    fetchPublicComments: vi.fn(),
    postPublicComment: vi.fn(),
    fetchInternalNotes: vi.fn(),
    postInternalNote: vi.fn(),
  };
});

const mockStaffUser: api.AuthUser = {
  id: 10,
  name: "Alex Staff",
  email: "alex.staff@toktickit.com",
  role: "IT_STAFF",
  mustChangePassword: false,
  isActive: true,
};

const mockRequesterUser: api.AuthUser = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  role: "REQUESTER",
  mustChangePassword: false,
  isActive: true,
};

const mockAssignees: api.StaffAssignee[] = [
  { id: 10, name: "Alex Staff", email: "alex.staff@toktickit.com", role: "IT_STAFF" },
  { id: 11, name: "Sam Staff", email: "sam.staff@toktickit.com", role: "IT_STAFF" },
  { id: 20, name: "Dana Admin", email: "dana.admin@toktickit.com", role: "ADMINISTRATOR" },
];

const mockTicketDetail: api.StaffTicketDetailData = {
  id: 101,
  ticketNumber: "TKT-2026-000101",
  summary: "Cannot connect to VPN from home",
  description: "Cisco AnyConnect gives timeout error 809 when connecting to campus VPN server.",
  category: { id: 4, name: "Network" },
  relatedSystem: { id: 3, name: "VPN" },
  requester: { id: 1, name: "Jennifer Anderson", email: "jennifer.anderson@example.com" },
  requestedPriority: "HIGH",
  itPriority: "HIGH",
  currentStatus: "IN_PROGRESS",
  owner: { id: 11, name: "Sam Staff", email: "sam.staff@toktickit.com" },
  resolutionIndicated: true,
  resolutionIndicatedAt: "2026-05-12T10:00:00.000Z",
  resolutionSummary: null,
  permittedNextStatuses: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  attachments: [],
  createdAt: "2026-05-12T08:00:00.000Z",
  updatedAt: "2026-05-12T09:00:00.000Z",
};

const mockComments: api.PublicComment[] = [
  {
    id: 1,
    ticketId: 101,
    content: "We checked the gateway and found high packet loss.",
    author: { id: 11, name: "Sam Staff", role: "IT_STAFF" },
    createdAt: "2026-05-12T08:30:00.000Z",
  },
];

const mockNotes: api.InternalNote[] = [
  {
    id: 1,
    ticketId: 101,
    content: "Customer subnet routing configuration needs manual flush on radius daemon.",
    author: { id: 11, name: "Sam Staff", role: "IT_STAFF" },
    createdAt: "2026-05-12T08:35:00.000Z",
  },
];

describe("StaffTicketDetail Component Tests (UI-04, UI-05)", () => {
  const onBackMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchStaffTicketDetail).mockResolvedValue(mockTicketDetail);
    vi.mocked(api.fetchStaffAssignees).mockResolvedValue(mockAssignees);
    vi.mocked(api.fetchPublicComments).mockResolvedValue(mockComments);
    vi.mocked(api.fetchInternalNotes).mockResolvedValue(mockNotes);
  });

  const renderComponent = (user: api.AuthUser = mockStaffUser) => {
    return render(
      <AuthProvider initialUser={user} initialToken="mock-staff-jwt">
        <RequesterProvider>
          <StaffTicketDetail ticketId={101} onBack={onBackMock} />
        </RequesterProvider>
      </AuthProvider>
    );
  };

  describe("UI-04: Staff Ticket Detail Actions & Operational Controls (AC-08, AC-09, AC-10)", () => {
    it("renders ticket header, ticket number, status badge, and read-only metadata", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("ticket-number")).toHaveTextContent("TKT-2026-000101");
      });

      expect(screen.getByText("Cannot connect to VPN from home")).toBeInTheDocument();
      expect(screen.getByTestId("status-badge-in-progress")).toHaveTextContent("IN PROGRESS");
      expect(screen.getByTestId("detail-category")).toHaveTextContent("Network");
      expect(screen.getByTestId("detail-related-system")).toHaveTextContent("VPN");
      expect(screen.getByTestId("detail-requester")).toHaveTextContent("Jennifer Anderson");
      expect(screen.getByTestId("detail-requested-priority")).toHaveTextContent("HIGH");
      expect(screen.getByTestId("ticket-description")).toHaveTextContent(
        "Cisco AnyConnect gives timeout error 809"
      );
    });

    it("renders Requester Resolution Indication banner when resolutionIndicated = true (AC-12)", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("resolution-indicated-banner")).toBeInTheDocument();
      });

      expect(screen.getByTestId("resolution-indicated-banner")).toHaveTextContent(
        "The requester has marked this problem as resolved"
      );
    });

    it("displays owner select and allows quick 'Assign to Me' claiming (AC-08)", async () => {
      vi.mocked(api.updateTicketOwner).mockResolvedValue({
        id: 101,
        owner: { id: 10, name: "Alex Staff", email: "alex.staff@toktickit.com" },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("owner-select")).toBeInTheDocument();
      });

      const assignToMeBtn = screen.getByTestId("assign-to-me-btn");
      expect(assignToMeBtn).toBeInTheDocument();

      fireEvent.click(assignToMeBtn);

      await waitFor(() => {
        expect(api.updateTicketOwner).toHaveBeenCalledWith(101, 10);
      });

      expect(await screen.findByTestId("success-banner")).toHaveTextContent(
        "Ticket claimed and assigned to Alex Staff"
      );
    });

    it("allows reassigning owner via dropdown (AC-08)", async () => {
      vi.mocked(api.updateTicketOwner).mockResolvedValue({
        id: 101,
        owner: { id: 20, name: "Dana Admin", email: "dana.admin@toktickit.com" },
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("owner-select")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("owner-select"), { target: { value: "20" } });

      await waitFor(() => {
        expect(api.updateTicketOwner).toHaveBeenCalledWith(101, 20);
      });
    });

    it("allows independent IT Priority update (AC-09, API-15)", async () => {
      vi.mocked(api.updateTicketPriority).mockResolvedValue({
        id: 101,
        itPriority: "URGENT",
        updatedAt: "2026-05-12T10:15:00.000Z",
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("it-priority-select")).toBeInTheDocument();
      });

      fireEvent.change(screen.getByTestId("it-priority-select"), {
        target: { value: "URGENT" },
      });

      await waitFor(() => {
        expect(api.updateTicketPriority).toHaveBeenCalledWith(101, "URGENT");
      });

      expect(await screen.findByTestId("success-banner")).toHaveTextContent(
        "IT Priority updated to URGENT"
      );
    });

    it("limits status transition dropdown strictly to permittedNextStatuses (AC-10)", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      const select = screen.getByTestId("status-select") as HTMLSelectElement;
      const options = Array.from(select.options).map((opt) => opt.value);

      // Current status is IN_PROGRESS -> permitted: WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
      expect(options).toEqual(["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"]);
      expect(options).not.toContain("OPEN");
      expect(options).not.toContain("NEW");
      expect(options).not.toContain("CLOSED");
    });

    it("displays resolution summary input when transitioning to RESOLVED and updates status (AC-10)", async () => {
      vi.mocked(api.updateTicketStatus).mockResolvedValue({
        id: 101,
        currentStatus: "RESOLVED",
        resolutionSummary: "Restarted authentication proxy daemon.",
        permittedNextStatuses: ["CLOSED", "REOPENED"],
        updatedAt: "2026-05-12T10:30:00.000Z",
      });

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("status-select")).toBeInTheDocument();
      });

      // Select RESOLVED
      fireEvent.change(screen.getByTestId("status-select"), {
        target: { value: "RESOLVED" },
      });

      // Resolution summary textarea should now be visible
      const summaryInput = await screen.findByTestId("resolution-summary-input");
      expect(summaryInput).toBeInTheDocument();

      fireEvent.change(summaryInput, {
        target: { value: "Restarted authentication proxy daemon." },
      });

      // Click Update Status
      fireEvent.click(screen.getByTestId("update-status-btn"));

      await waitFor(() => {
        expect(api.updateTicketStatus).toHaveBeenCalledWith(
          101,
          "RESOLVED",
          "Restarted authentication proxy daemon."
        );
      });

      expect(await screen.findByTestId("success-banner")).toHaveTextContent(
        "Status successfully updated to RESOLVED"
      );
    });

    it("calls onBack when clicking back button", async () => {
      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("back-to-queue-btn")).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId("back-to-queue-btn"));
      expect(onBackMock).toHaveBeenCalled();
    });
  });

  describe("UI-05: Tabbed Activity Container & Confidential Internal Notes (AC-04, AC-11)", () => {
    it("renders Public Comments tab by default and posts public comment (AC-11)", async () => {
      const newComment: api.PublicComment = {
        id: 2,
        ticketId: 101,
        content: "Testing connection from campus LAN.",
        author: { id: 10, name: "Alex Staff", role: "IT_STAFF" },
        createdAt: "2026-05-12T10:00:00.000Z",
      };
      vi.mocked(api.postPublicComment).mockResolvedValue(newComment);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("public-comments-feed")).toBeInTheDocument();
      });

      expect(screen.getByText("We checked the gateway and found high packet loss.")).toBeInTheDocument();

      const input = screen.getByTestId("public-comment-input");
      fireEvent.change(input, { target: { value: "Testing connection from campus LAN." } });

      fireEvent.click(screen.getByTestId("post-comment-btn"));

      await waitFor(() => {
        expect(api.postPublicComment).toHaveBeenCalledWith(
          101,
          "Testing connection from campus LAN."
        );
      });

      expect(await screen.findByText("Testing connection from campus LAN.")).toBeInTheDocument();
    });

    it("switches to Internal Notes tab with warm amber warning styling and posts note (AC-04, UI Spec §4.4)", async () => {
      const newNote: api.InternalNote = {
        id: 2,
        ticketId: 101,
        content: "Private verification: radius cert expired.",
        author: { id: 10, name: "Alex Staff", role: "IT_STAFF" },
        createdAt: "2026-05-12T10:05:00.000Z",
      };
      vi.mocked(api.postInternalNote).mockResolvedValue(newNote);

      renderComponent();

      await waitFor(() => {
        expect(screen.getByTestId("tab-internal-notes")).toBeInTheDocument();
      });

      // Switch to Internal Notes tab
      fireEvent.click(screen.getByTestId("tab-internal-notes"));

      // Verify distinct warm amber banner & lock disclaimer
      const banner = await screen.findByTestId("internal-notes-banner");
      expect(banner).toBeInTheDocument();
      expect(banner).toHaveTextContent(
        "INTERNAL NOTES: Visible only to IT Staff and Administrators. Never shared with the Requester."
      );

      // Verify existing internal note is displayed
      expect(screen.getByText(/Customer subnet routing configuration/)).toBeInTheDocument();

      // Post new internal note
      const noteInput = screen.getByTestId("internal-note-input");
      fireEvent.change(noteInput, {
        target: { value: "Private verification: radius cert expired." },
      });

      fireEvent.click(screen.getByTestId("post-note-btn"));

      await waitFor(() => {
        expect(api.postInternalNote).toHaveBeenCalledWith(
          101,
          "Private verification: radius cert expired."
        );
      });

      expect(await screen.findByText("Private verification: radius cert expired.")).toBeInTheDocument();
    });

    it("completely hides Internal Notes tab when user role is REQUESTER (AC-04, API-08 confidentiality isolation)", async () => {
      renderComponent(mockRequesterUser);

      await waitFor(() => {
        expect(screen.getByTestId("tab-public-comments")).toBeInTheDocument();
      });

      // Internal Notes tab must NEVER exist for Requester
      expect(screen.queryByTestId("tab-internal-notes")).not.toBeInTheDocument();
      expect(screen.queryByTestId("internal-notes-banner")).not.toBeInTheDocument();
      expect(api.fetchInternalNotes).not.toHaveBeenCalled();
    });
  });
});
