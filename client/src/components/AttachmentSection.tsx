import React, { useState, useRef, useEffect } from "react";
import {
  AttachmentItem,
  uploadAttachment,
  softRemoveAttachment,
  downloadAttachment,
} from "../api.js";
import { useRequester } from "../context/RequesterContext.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

interface AttachmentSectionProps {
  ticketId: number;
  attachments: AttachmentItem[];
  onAttachmentsUpdated: () => void;
}

export const AttachmentSection: React.FC<AttachmentSectionProps> = ({
  ticketId,
  attachments,
  onAttachmentsUpdated,
}) => {
  const { currentRequester } = useRequester();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Component state
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Soft-removal modal state
  const [modalTarget, setModalTarget] = useState<AttachmentItem | null>(null);
  const [removalReason, setRemovalReason] = useState("");
  const [isRemoving, setIsRemoving] = useState(false);
  const [reasonTouched, setReasonTouched] = useState(false);

  // Auto-dismiss success banner after 5 seconds (UI Spec §4.6)
  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => {
      setSuccessBanner(null);
    }, 5000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  // Handle Escape key to close modal
  useEffect(() => {
    if (!modalTarget) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isRemoving) {
        closeRemovalModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalTarget, isRemoving]);

  const activeAttachments = attachments.filter((a) => !a.isRemoved);
  const isMaxReached = activeAttachments.length >= 5;

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr?: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Trigger file picker
  const handleAddClick = () => {
    setErrorBanner(null);
    setSuccessBanner(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // Handle file selection and upload
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentRequester) return;

    // Validate active count
    if (activeAttachments.length >= 5) {
      setErrorBanner("A ticket can have a maximum of 5 active attachments.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size (BR-13: <= 5MB)
    if (file.size > MAX_FILE_SIZE) {
      setErrorBanner(
        `File "${file.name}" exceeds the maximum permitted size of 5 MB (5,242,880 bytes).`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate extension / MIME type (BR-12)
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);
    const isMimeAllowed = file.type
      ? ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())
      : isExtAllowed;

    if (!isExtAllowed || !isMimeAllowed) {
      setErrorBanner(
        `Unsupported file type for "${file.name}". Only JPG, PNG, WEBP, and PDF files are permitted.`
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setIsUploading(true);
    setErrorBanner(null);
    setSuccessBanner(null);

    try {
      await uploadAttachment(ticketId, file, currentRequester.id);
      setSuccessBanner(`Attachment "${file.name}" uploaded successfully.`);
      onAttachmentsUpdated();
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to upload attachment.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Download attachment
  const handleDownload = async (attachment: AttachmentItem) => {
    if (!currentRequester) return;
    setErrorBanner(null);
    setDownloadingId(attachment.id);

    try {
      await downloadAttachment(attachment.id, attachment.originalName, currentRequester.id);
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to download file.");
    } finally {
      setDownloadingId(null);
    }
  };

  // Open modal
  const openRemovalModal = (attachment: AttachmentItem) => {
    setModalTarget(attachment);
    setRemovalReason("");
    setReasonTouched(false);
    setErrorBanner(null);
  };

  // Close modal
  const closeRemovalModal = () => {
    setModalTarget(null);
    setRemovalReason("");
    setReasonTouched(false);
  };

  // Confirm soft removal
  const handleConfirmRemoval = async () => {
    const trimmed = removalReason.trim();
    if (trimmed.length < 3 || !modalTarget || !currentRequester) return;

    setIsRemoving(true);
    setErrorBanner(null);

    try {
      await softRemoveAttachment(modalTarget.id, trimmed, currentRequester.id);
      setSuccessBanner(`Attachment "${modalTarget.originalName}" has been removed.`);
      closeRemovalModal();
      onAttachmentsUpdated();
    } catch (err: any) {
      setErrorBanner(err.message || "Failed to remove attachment.");
    } finally {
      setIsRemoving(false);
    }
  };

  const isReasonValid = removalReason.trim().length >= 3;

  return (
    <div className="border rounded p-3 bg-white" data-testid="attachment-section">
      {/* Notification Banners */}
      {errorBanner && (
        <div
          className="alert zen-alert-danger alert-dismissible fade show mb-3"
          role="alert"
        >
          <div className="d-flex align-items-center justify-content-between">
            <span className="small">{errorBanner}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Close error"
              onClick={() => setErrorBanner(null)}
            ></button>
          </div>
        </div>
      )}

      {successBanner && (
        <div
          className="alert zen-alert-success alert-dismissible fade show mb-3"
          role="alert"
        >
          <div className="d-flex align-items-center justify-content-between">
            <span className="small">{successBanner}</span>
            <button
              type="button"
              className="btn-close"
              aria-label="Close success"
              onClick={() => setSuccessBanner(null)}
            ></button>
          </div>
        </div>
      )}

      {/* Card Header with count & Add Button */}
      <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
        <h3 className="h6 fw-bold text-dark mb-0">
          Attachments ({activeAttachments.length}/5 active)
        </h3>

        {!isMaxReached && (
          <div>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={handleFileChange}
              data-testid="attachment-file-input"
            />
            <button
              type="button"
              className="btn btn-zen-secondary btn-sm d-inline-flex align-items-center gap-1"
              style={{ minHeight: "44px" }}
              onClick={handleAddClick}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>+ Add Attachment</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <p className="text-muted small mb-0 py-2">No attachments uploaded for this ticket.</p>
      ) : (
        <ul className="list-group list-group-flush">
          {attachments.map((att) => (
            <li
              key={att.id}
              className={`list-group-item px-0 py-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2 ${
                att.isRemoved ? "opacity-50 text-muted" : ""
              }`}
              data-testid={`attachment-row-${att.id}`}
            >
              <div className="d-flex align-items-center gap-2 text-truncate">
                {/* File Icon */}
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="flex-shrink-0 text-muted"
                  aria-hidden="true"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>

                {/* File Name */}
                <span
                  className={`fw-medium small text-truncate ${
                    att.isRemoved ? "text-decoration-line-through text-muted" : "text-dark"
                  }`}
                  title={att.originalName}
                >
                  {att.originalName}
                </span>

                {/* File Size */}
                <span className="text-muted extra-small">
                  ({formatFileSize(att.sizeBytes)})
                </span>

                {/* Upload Date */}
                <span className="text-muted extra-small d-none d-sm-inline">
                  • {formatDate(att.createdAt)}
                </span>

                {/* Removed Badge */}
                {att.isRemoved && (
                  <span className="badge bg-secondary ms-1">Removed</span>
                )}
              </div>

              {/* Action Buttons or Removal Details */}
              <div className="d-flex align-items-center gap-2 flex-wrap">
                {att.isRemoved ? (
                  <div className="extra-small text-muted fst-italic">
                    {att.removalReason && <span>Reason: {att.removalReason}</span>}
                    {att.removedAt && (
                      <span className="ms-1">({formatDate(att.removedAt)})</span>
                    )}
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm d-inline-flex align-items-center"
                      style={{ minHeight: "44px" }}
                      onClick={() => handleDownload(att)}
                      disabled={downloadingId === att.id}
                      aria-label={`Download ${att.originalName}`}
                    >
                      {downloadingId === att.id ? "Downloading..." : "Download"}
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm d-inline-flex align-items-center"
                      style={{ minHeight: "44px" }}
                      onClick={() => openRemovalModal(att)}
                      aria-label={`Remove ${att.originalName}`}
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Soft-Removal Modal Dialog (UI Spec §4.5, UI-04, AC-08) */}
      {modalTarget && (
        <div
          className="modal fade show d-block"
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby="removal-modal-title"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isRemoving) {
              closeRemovalModal();
            }
          }}
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow">
              {/* Modal Header */}
              <div className="modal-header border-bottom">
                <h5 className="modal-title h6 fw-bold text-danger" id="removal-modal-title">
                  Remove Attachment
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={closeRemovalModal}
                  disabled={isRemoving}
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body">
                <p className="small text-dark mb-2">
                  Please state the reason for removing this attachment (required for audit logging):
                </p>
                <div className="mb-2">
                  <span className="fw-semibold small text-muted d-block mb-1">
                    File: {modalTarget.originalName}
                  </span>
                  <textarea
                    id="removalReason"
                    autoFocus
                    className={`form-control ${
                      reasonTouched && !isReasonValid ? "is-invalid" : ""
                    }`}
                    rows={3}
                    maxLength={500}
                    placeholder="e.g. Uploaded wrong document version..."
                    value={removalReason}
                    onChange={(e) => setRemovalReason(e.target.value)}
                    onBlur={() => setReasonTouched(true)}
                    disabled={isRemoving}
                    aria-label="Reason for removing attachment"
                  />
                  {reasonTouched && !isReasonValid && (
                    <div className="invalid-feedback small">
                      Removal reason is required and must be at least 3 characters.
                    </div>
                  )}
                  <small className="text-muted extra-small mt-1 d-block">
                    Minimum 3 characters required.
                  </small>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer border-top gap-2">
                <button
                  type="button"
                  className="btn btn-zen-secondary btn-sm"
                  style={{ minHeight: "44px" }}
                  onClick={closeRemovalModal}
                  disabled={isRemoving}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-sm d-inline-flex align-items-center gap-1"
                  style={{ minHeight: "44px" }}
                  onClick={handleConfirmRemoval}
                  disabled={!isReasonValid || isRemoving}
                >
                  {isRemoving ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      <span>Removing...</span>
                    </>
                  ) : (
                    "Confirm Removal"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
