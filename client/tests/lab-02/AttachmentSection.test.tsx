import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AttachmentSection } from "../../src/components/AttachmentSection.js";
import * as api from "../../src/api.js";
import { RequesterProvider } from "../../src/context/RequesterContext.js";

// Mock API layer
vi.mock("../../src/api.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/api.js")>();
  return {
    ...actual,
    uploadAttachment: vi.fn(),
    softRemoveAttachment: vi.fn(),
    downloadAttachment: vi.fn(),
  };
});

const mockRequester = {
  id: 1,
  name: "Jennifer Anderson",
  email: "jennifer.anderson@example.com",
  isActive: true,
};

const mockAttachments: api.AttachmentItem[] = [
  {
    id: 101,
    ticketId: 42,
    filename: "battery_report.pdf",
    originalName: "battery_report.pdf",
    mimeType: "application/pdf",
    sizeBytes: 245120, // ~239 KB
    isRemoved: false,
    createdAt: "2026-05-12T09:15:00.000Z",
  },
  {
    id: 102,
    ticketId: 42,
    filename: "old_screenshot.png",
    originalName: "old_screenshot.png",
    mimeType: "image/png",
    sizeBytes: 1048576, // 1 MB
    isRemoved: true,
    removalReason: "Uploaded wrong screenshot version",
    removedAt: "2026-05-12T10:00:00.000Z",
    createdAt: "2026-05-12T09:16:00.000Z",
  },
];

describe("AttachmentSection Component Tests (UI-04, AC-08, BR-12–BR-16)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("toktickit_requester", JSON.stringify(mockRequester));
    vi.clearAllMocks();
  });

  it("renders active and soft-removed attachments with correct counts and badges (UI Spec §4.5)", () => {
    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    // Header count: 1 active out of 2 total
    expect(screen.getByText(/Attachments \(1\/5 active\)/i)).toBeInTheDocument();

    // Active item
    expect(screen.getByText("battery_report.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download battery_report\.pdf/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Remove battery_report\.pdf/i })).toBeInTheDocument();

    // Removed item
    expect(screen.getByText("old_screenshot.png")).toBeInTheDocument();
    expect(screen.getByText("Removed")).toBeInTheDocument();
    expect(screen.getByText(/Reason: Uploaded wrong screenshot version/i)).toBeInTheDocument();
  });

  it("opens soft-removal modal, disables Confirm until reason >= 3 chars, and completes removal on confirmation (UI-04, AC-08, BR-15)", async () => {
    vi.mocked(api.softRemoveAttachment).mockResolvedValue({
      id: 101,
      ticketId: 42,
      originalName: "battery_report.pdf",
      isRemoved: true,
      removalReason: "Document contains obsolete metrics",
      removedAt: new Date().toISOString(),
    });

    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    // 1. Click Remove button on active attachment
    const removeBtn = screen.getByRole("button", { name: /Remove battery_report\.pdf/i });
    fireEvent.click(removeBtn);

    // 2. Modal appears with prompt text
    expect(screen.getByRole("heading", { name: "Remove Attachment" })).toBeInTheDocument();
    expect(
      screen.getByText(/Please state the reason for removing this attachment \(required for audit logging\):/i)
    ).toBeInTheDocument();

    const confirmBtn = screen.getByRole("button", { name: "Confirm Removal" });
    const textarea = screen.getByRole("textbox", { name: /Reason for removing attachment/i });

    // 3. Confirm Removal is disabled when empty
    expect(confirmBtn).toBeDisabled();

    // 4. Type 2 characters -> still disabled
    fireEvent.change(textarea, { target: { value: "ab" } });
    expect(confirmBtn).toBeDisabled();

    // 5. Type >= 3 characters -> enabled
    fireEvent.change(textarea, { target: { value: "Document contains obsolete metrics" } });
    expect(confirmBtn).not.toBeDisabled();

    // 6. Click Confirm Removal
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.softRemoveAttachment).toHaveBeenCalledWith(
        101,
        "Document contains obsolete metrics",
        1
      );
      expect(onUpdated).toHaveBeenCalledTimes(1);
    });

    // 7. Modal is closed and success banner appears
    await waitFor(() => {
      expect(screen.queryByRole("heading", { name: "Remove Attachment" })).not.toBeInTheDocument();
      expect(screen.getByText(/has been removed/i)).toBeInTheDocument();
    });
  });

  it("closes modal without submitting when Cancel is clicked (UI-04)", () => {
    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /Remove battery_report\.pdf/i }));
    expect(screen.getByRole("heading", { name: "Remove Attachment" })).toBeInTheDocument();

    // Click Cancel
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    // Modal closed
    expect(screen.queryByRole("heading", { name: "Remove Attachment" })).not.toBeInTheDocument();
    expect(api.softRemoveAttachment).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("invokes downloadAttachment API when active attachment Download is clicked", async () => {
    vi.mocked(api.downloadAttachment).mockResolvedValue();
    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    const downloadBtn = screen.getByRole("button", { name: /Download battery_report\.pdf/i });
    fireEvent.click(downloadBtn);

    await waitFor(() => {
      expect(api.downloadAttachment).toHaveBeenCalledWith(101, "battery_report.pdf", 1);
    });
  });

  it("hides '+ Add Attachment' button when ticket reaches 5 active attachments (BR-14)", () => {
    const fiveActiveAttachments: api.AttachmentItem[] = Array.from({ length: 5 }, (_, i) => ({
      id: 200 + i,
      ticketId: 42,
      filename: `file_${i + 1}.png`,
      originalName: `file_${i + 1}.png`,
      mimeType: "image/png",
      sizeBytes: 1024,
      isRemoved: false,
      createdAt: "2026-05-12T09:15:00.000Z",
    }));

    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={fiveActiveAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    expect(screen.getByText(/Attachments \(5\/5 active\)/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /\+ Add Attachment/i })).not.toBeInTheDocument();
  });

  it("validates file size <= 5MB before upload attempt (BR-13, AC-07)", async () => {
    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    const input = screen.getByTestId("attachment-file-input");

    // File > 5MB
    const oversizedFile = new File(["a".repeat(100)], "huge.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(oversizedFile, "size", { value: 6 * 1024 * 1024 });

    fireEvent.change(input, { target: { files: [oversizedFile] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/exceeds the maximum permitted size of 5 MB/i)).toBeInTheDocument();
    });

    expect(api.uploadAttachment).not.toHaveBeenCalled();
  });

  it("validates allowed file types (JPG, PNG, WEBP, PDF) before upload attempt (BR-12, AC-07)", async () => {
    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    const input = screen.getByTestId("attachment-file-input");

    // Disallowed file type (.txt)
    const invalidFile = new File(["test text"], "notes.txt", {
      type: "text/plain",
    });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeInTheDocument();
      expect(screen.getByText(/Unsupported file type for "notes.txt"/i)).toBeInTheDocument();
    });

    expect(api.uploadAttachment).not.toHaveBeenCalled();
  });

  it("uploads valid file and triggers onAttachmentsUpdated callback (AC-06)", async () => {
    vi.mocked(api.uploadAttachment).mockResolvedValue({
      id: 103,
      ticketId: 42,
      originalName: "system_info.pdf",
      mimeType: "application/pdf",
      sizeBytes: 50000,
      isRemoved: false,
      createdAt: new Date().toISOString(),
    });

    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    const input = screen.getByTestId("attachment-file-input");
    const validFile = new File(["%PDF-1.4 test"], "system_info.pdf", {
      type: "application/pdf",
    });
    Object.defineProperty(validFile, "size", { value: 50000 });

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(api.uploadAttachment).toHaveBeenCalledWith(42, validFile, 1);
      expect(onUpdated).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/uploaded successfully/i)).toBeInTheDocument();
    });
  });

  it("closes modal without submitting when Escape key is pressed (UI Spec §6)", () => {
    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /Remove battery_report\.pdf/i }));
    expect(screen.getByRole("heading", { name: "Remove Attachment" })).toBeInTheDocument();

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });

    // Modal closed
    expect(screen.queryByRole("heading", { name: "Remove Attachment" })).not.toBeInTheDocument();
    expect(api.softRemoveAttachment).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });

  it("closes modal without submitting when backdrop is clicked", () => {
    const onUpdated = vi.fn();

    render(
      <RequesterProvider>
        <AttachmentSection
          ticketId={42}
          attachments={mockAttachments}
          onAttachmentsUpdated={onUpdated}
        />
      </RequesterProvider>
    );

    // Open modal
    fireEvent.click(screen.getByRole("button", { name: /Remove battery_report\.pdf/i }));
    expect(screen.getByRole("heading", { name: "Remove Attachment" })).toBeInTheDocument();

    // Click backdrop (modal container element itself)
    const modalContainer = screen.getByRole("dialog");
    fireEvent.click(modalContainer);

    // Modal closed
    expect(screen.queryByRole("heading", { name: "Remove Attachment" })).not.toBeInTheDocument();
    expect(api.softRemoveAttachment).not.toHaveBeenCalled();
    expect(onUpdated).not.toHaveBeenCalled();
  });
});
