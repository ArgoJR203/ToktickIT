import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchCategories,
  fetchRelatedSystems,
  createTicket,
  Category,
  RelatedSystem,
  Ticket,
} from "../api.js";

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
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!currentRequester) {
      setServerError("No active development requester selected.");
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
      setIsSubmitting(false);

      if (onSuccess) {
        onSuccess(newTicket);
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
            onClick={() => setServerError(null)}
            aria-label="Dismiss banner"
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
