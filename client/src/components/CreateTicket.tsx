import React, { useState, useEffect, useRef } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  uploadAttachment,
  Category,
  RelatedSystem,
  Ticket,
} from "../api.js";

const MAX_ATTACHMENTS = 5;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];

interface CreateTicketProps {
  onSuccess?: (ticket: Ticket) => void;
  onCancel?: () => void;
}

export const CreateTicket: React.FC<CreateTicketProps> = ({ onSuccess, onCancel }) => {
  const { currentRequester } = useRequester();

  // Reference data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [relatedSystems, setRelatedSystems] = useState<RelatedSystem[]>([]);
  const [isLoadingRefData, setIsLoadingRefData] = useState<boolean>(true);
  const [refDataError, setRefDataError] = useState<string | null>(null);

  // Form field state
  const [categoryId, setCategoryId] = useState<string>("");
  const [relatedSystemId, setRelatedSystemId] = useState<string>("");
  const [summary, setSummary] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [requestedPriority, setRequestedPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");

  // Form submission and error state
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [warningBanner, setWarningBanner] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Attachments state (UI Spec §4.3 / BR-17)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load Categories on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingRefData(true);
    fetchCategories()
      .then((data) => {
        if (isMounted) {
          setCategories(data);
          setRefDataError(null);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setRefDataError(err.message || "Failed to load categories.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingRefData(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Related Systems when selected category changes
  useEffect(() => {
    let isMounted = true;
    const catId = categoryId ? parseInt(categoryId, 10) : undefined;
    fetchRelatedSystems(catId)
      .then((data) => {
        if (isMounted) {
          setRelatedSystems(data);
          // If current related system is not in new list, reset it
          if (relatedSystemId) {
            const exists = data.some((sys) => sys.id === parseInt(relatedSystemId, 10));
            if (!exists) setRelatedSystemId("");
          }
        }
      })
      .catch((err) => {
        console.error("Failed to load related systems:", err);
      });
    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!categoryId) {
      newErrors.categoryId = "Category selection is required.";
    }

    if (!relatedSystemId) {
      newErrors.relatedSystemId = "Related system selection is required.";
    }

    const trimmedSummary = summary.trim();
    if (!trimmedSummary) {
      newErrors.summary = "Ticket summary is required.";
    } else if (trimmedSummary.length < 5) {
      newErrors.summary = "Ticket summary must be at least 5 characters.";
    } else if (trimmedSummary.length > 100) {
      newErrors.summary = "Ticket summary cannot exceed 100 characters.";
    }

    const trimmedDescription = description.trim();
    if (!trimmedDescription) {
      newErrors.description = "Ticket description is required.";
    } else if (trimmedDescription.length < 10) {
      newErrors.description = "Ticket description must be at least 10 characters.";
    } else if (trimmedDescription.length > 2000) {
      newErrors.description = "Ticket description cannot exceed 2000 characters.";
    }

    if (!requestedPriority) {
      newErrors.requestedPriority = "Requested priority selection is required.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFilesAdded = (files: FileList | null) => {
    if (!files) return;
    setAttachmentError(null);

    const newFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Check max files limit
      if (selectedFiles.length + newFiles.length >= MAX_ATTACHMENTS) {
        setAttachmentError(`You can upload a maximum of ${MAX_ATTACHMENTS} attachments per ticket.`);
        break;
      }

      // Check file size (BR-13)
      if (file.size > MAX_FILE_SIZE) {
        setAttachmentError(`File "${file.name}" exceeds maximum allowed size of 5 MB.`);
        continue;
      }

      // Check MIME type & extension (BR-12)
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      const isExtAllowed = ALLOWED_EXTENSIONS.includes(ext);
      const isMimeAllowed = file.type ? ALLOWED_MIME_TYPES.includes(file.type.toLowerCase()) : isExtAllowed;
      if (!isExtAllowed || !isMimeAllowed) {
        setAttachmentError(`Unsupported file type for "${file.name}". Only JPG, PNG, WEBP, and PDF files are allowed.`);
        continue;
      }

      // Check duplicate
      if (selectedFiles.some((f) => f.name === file.name && f.size === file.size)) {
        continue;
      }

      newFiles.push(file);
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleRemoveFile = (indexToRemove: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);
    setWarningBanner(null);

    if (!currentRequester) {
      setServerError("No active requester context. Please select a requester.");
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        categoryId: parseInt(categoryId, 10),
        relatedSystemId: parseInt(relatedSystemId, 10),
        summary: summary.trim(),
        description: description.trim(),
        requestedPriority,
      };

      const newTicket = await createTicket(payload, currentRequester.id);

      // Upload any selected initial attachments (FR-02 / BR-17)
      let failedCount = 0;
      if (selectedFiles.length > 0) {
        for (const file of selectedFiles) {
          try {
            await uploadAttachment(newTicket.id, file, currentRequester.id);
          } catch (uploadErr) {
            console.error("Failed to upload attachment during ticket creation:", uploadErr);
            failedCount++;
          }
        }
      }

      setIsSubmitting(false);

      if (failedCount > 0) {
        // BR-17: Warning banner for partial failure
        setWarningBanner(
          `Ticket ${newTicket.ticketNumber} created successfully, but ${failedCount} attachment(s) failed to upload.`
        );
        if (onSuccess) {
          setTimeout(() => onSuccess(newTicket), 3000);
        }
      } else {
        if (onSuccess) {
          onSuccess(newTicket);
        }
      }
    } catch (err: unknown) {
      setIsSubmitting(false);
      const errorObj = err as { message?: string; details?: Record<string, string> };
      if (errorObj.details) {
        setErrors(errorObj.details);
      }
      setServerError(errorObj.message || "Failed to submit ticket. Please check connection.");
    }
  };

  const currentDateString = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="zen-card p-4" style={{ maxWidth: 900, margin: "0 auto" }}>
      {/* Page Header */}
      <div className="mb-4 pb-2 border-bottom">
        <h2 className="h4 fw-bold mb-1" style={{ color: "var(--color-text-main)" }}>
          Create IT Support Ticket
        </h2>
        <p className="text-muted small mb-0">
          Submit a new IT support request. Required fields are marked with an asterisk (
          <span className="text-danger">*</span>).
        </p>
      </div>

      {/* Top Zen Green Server Error Notification Banner (AC-10) */}
      {serverError && (
        <div
          className="alert mb-4 d-flex justify-content-between align-items-center"
          role="alert"
          style={{
            backgroundColor: "var(--color-error-bg)",
            borderLeft: "4px solid var(--color-error-text)",
            color: "var(--color-text-main)",
          }}
        >
          <div className="d-flex align-items-center me-2">
            <svg
              className="me-2 flex-shrink-0"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-error-text)"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span className="small font-weight-medium">{serverError}</span>
          </div>
          <button
            type="button"
            className="btn-close ms-auto"
            aria-label="Close"
            onClick={() => setServerError(null)}
          ></button>
        </div>
      )}

      {/* Top Warning Banner for Partial Failure (BR-17 / UI Spec §4.6) */}
      {warningBanner && (
        <div
          className="alert mb-4 d-flex justify-content-between align-items-center"
          role="alert"
          style={{
            backgroundColor: "#FFF3E0",
            borderLeft: "4px solid #F57C00",
            color: "var(--color-text-main)",
          }}
        >
          <div className="d-flex align-items-center me-2">
            <svg
              className="me-2 flex-shrink-0"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#F57C00"
              strokeWidth="2"
            >
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <span className="small font-weight-medium">{warningBanner}</span>
          </div>
          <button
            type="button"
            className="btn-close ms-auto"
            aria-label="Close"
            onClick={() => setWarningBanner(null)}
          ></button>
        </div>
      )}

      {/* Reference Data Loading Error */}
      {refDataError && (
        <div className="alert zen-alert-danger mb-4 small" role="alert">
          {refDataError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        {/* System-Generated Header Info Box */}
        <div
          className="p-3 mb-4 rounded border"
          style={{ backgroundColor: "#F0F4F1", borderColor: "var(--color-border)" }}
        >
          <div className="row g-3">
            <div className="col-12 col-md-4">
              <label className="form-label text-muted small mb-1">Ticket Number</label>
              <input
                type="text"
                className="form-control form-control-sm text-muted bg-white"
                value="Generated upon submission"
                disabled
                readOnly
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label text-muted small mb-1">Ticket Date</label>
              <input
                type="text"
                className="form-control form-control-sm text-muted bg-white"
                value={currentDateString}
                disabled
                readOnly
              />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label text-muted small mb-1 d-block">Status</label>
              <span
                className="badge px-3 py-2"
                style={{
                  backgroundColor: "var(--color-pale-green)",
                  color: "var(--color-primary-green)",
                  border: "1px solid var(--color-secondary-green)",
                }}
              >
                NEW
              </span>
            </div>
          </div>
        </div>

        {/* Classification Section */}
        <div className="row g-3 mb-4">
          {/* Category Dropdown */}
          <div className="col-12 col-md-4">
            <label htmlFor="categoryId" className="form-label fw-medium small mb-1">
              Category <span className="text-danger">*</span>
            </label>
            <select
              id="categoryId"
              className={`form-select ${errors.categoryId ? "is-invalid" : ""}`}
              value={categoryId}
              onChange={(e) => {
                const newCatId = e.target.value;
                setCategoryId(newCatId);
                setRelatedSystemId("");
                setErrors((prev) => ({ ...prev, categoryId: "", relatedSystemId: "" }));
              }}
              disabled={isLoadingRefData || isSubmitting}
            >
              <option value="">-- Select Category --</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            {errors.categoryId && <div className="invalid-feedback">{errors.categoryId}</div>}
          </div>

          {/* Related System Dropdown */}
          <div className="col-12 col-md-4">
            <label htmlFor="relatedSystemId" className="form-label fw-medium small mb-1">
              Related System <span className="text-danger">*</span>
            </label>
            <select
              id="relatedSystemId"
              className={`form-select ${errors.relatedSystemId ? "is-invalid" : ""}`}
              value={relatedSystemId}
              onChange={(e) => {
                setRelatedSystemId(e.target.value);
                setErrors((prev) => ({ ...prev, relatedSystemId: "" }));
              }}
              disabled={isLoadingRefData || isSubmitting}
            >
              <option value="">-- Select Related System --</option>
              {relatedSystems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name}
                </option>
              ))}
            </select>
            {errors.relatedSystemId && (
              <div className="invalid-feedback">{errors.relatedSystemId}</div>
            )}
          </div>

          {/* Requested Priority Selector */}
          <div className="col-12 col-md-4">
            <label htmlFor="requestedPriority" className="form-label fw-medium small mb-1">
              Requested Priority <span className="text-danger">*</span>
            </label>
            <select
              id="requestedPriority"
              className={`form-select ${errors.requestedPriority ? "is-invalid" : ""}`}
              value={requestedPriority}
              onChange={(e) => {
                setRequestedPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT");
                setErrors((prev) => ({ ...prev, requestedPriority: "" }));
              }}
              disabled={isSubmitting}
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM (Default)</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
            {errors.requestedPriority && (
              <div className="invalid-feedback">{errors.requestedPriority}</div>
            )}
          </div>
        </div>

        {/* Content Section */}
        <div className="mb-3">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label htmlFor="summary" className="form-label fw-medium small mb-0">
              Ticket Summary <span className="text-danger">*</span>
            </label>
            <span className="text-muted extra-small">{summary.length}/100</span>
          </div>
          <input
            id="summary"
            type="text"
            className={`form-control ${errors.summary ? "is-invalid" : ""}`}
            placeholder="Brief description of issue (e.g. Cannot access campus Wi-Fi)"
            maxLength={100}
            value={summary}
            onChange={(e) => {
              setSummary(e.target.value);
              setErrors((prev) => ({ ...prev, summary: "" }));
            }}
            disabled={isSubmitting}
          />
          {errors.summary && <div className="invalid-feedback">{errors.summary}</div>}
        </div>

        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label htmlFor="description" className="form-label fw-medium small mb-0">
              Detailed Description <span className="text-danger">*</span>
            </label>
            <span className="text-muted extra-small">{description.length}/2000</span>
          </div>
          <textarea
            id="description"
            rows={5}
            className={`form-control ${errors.description ? "is-invalid" : ""}`}
            placeholder="Provide complete details about your issue, steps to reproduce, or error messages..."
            maxLength={2000}
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setErrors((prev) => ({ ...prev, description: "" }));
            }}
            disabled={isSubmitting}
          />
          {errors.description && <div className="invalid-feedback">{errors.description}</div>}
        </div>

        {/* Attachments Dropzone (UI Spec §4.3 / BR-12, BR-13, BR-14) */}
        <div className="mb-4">
          <div className="d-flex justify-content-between align-items-center mb-1">
            <label className="form-label fw-medium small mb-0">
              Attachments ({selectedFiles.length}/{MAX_ATTACHMENTS})
            </label>
            <span className="text-muted extra-small">Max 5MB per file (JPG, PNG, WEBP, PDF)</span>
          </div>

          <div
            className="p-4 rounded text-center"
            style={{
              border: "2px dashed var(--color-secondary-green)",
              backgroundColor: isDragging ? "#d7ede0" : "var(--color-pale-green)",
              cursor: isSubmitting ? "not-allowed" : "pointer",
              transition: "background-color 0.2s ease",
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!isSubmitting) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (!isSubmitting) handleFilesAdded(e.dataTransfer.files);
            }}
            onClick={() => {
              if (!isSubmitting && fileInputRef.current) {
                fileInputRef.current.click();
              }
            }}
          >
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              multiple
              accept=".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                handleFilesAdded(e.target.files);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              disabled={isSubmitting}
            />
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary-green)"
              strokeWidth="2"
              className="mb-2"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p className="small text-dark mb-0 fw-medium">
              Drag &amp; drop files here or <span className="text-decoration-underline" style={{ color: "var(--color-primary-green)" }}>click to browse</span>
            </p>
            <p className="extra-small text-muted mb-0 mt-1">
              JPG, PNG, WEBP, PDF up to 5MB, max 5 active attachments
            </p>
          </div>

          {attachmentError && (
            <div className="text-danger small mt-1">{attachmentError}</div>
          )}

          {/* Selected Files Preview List */}
          {selectedFiles.length > 0 && (
            <div className="mt-2 d-flex flex-column gap-1">
              {selectedFiles.map((file, idx) => (
                <div
                  key={`${file.name}-${idx}`}
                  className="d-flex justify-content-between align-items-center p-2 rounded border bg-light small"
                >
                  <div className="d-flex align-items-center gap-2 text-truncate">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-muted flex-shrink-0"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <span className="text-truncate fw-medium">{file.name}</span>
                    <span className="text-muted extra-small">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-link text-danger p-0 ms-2 text-decoration-none extra-small"
                    style={{ minHeight: "30px" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveFile(idx);
                    }}
                    disabled={isSubmitting}
                    aria-label={`Remove ${file.name}`}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions Bar */}
        <div className="d-flex justify-content-end align-items-center gap-2 pt-2 border-top">
          {onCancel && (
            <button
              type="button"
              className="btn btn-outline-secondary px-4"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-zen-primary px-4 d-flex align-items-center"
            disabled={isSubmitting || isLoadingRefData}
          >
            {isSubmitting ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Submitting Ticket...
              </>
            ) : (
              "Submit Ticket"
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
