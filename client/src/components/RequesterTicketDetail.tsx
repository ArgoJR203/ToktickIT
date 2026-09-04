import React, { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { fetchTicketDetail, TicketDetail } from "../api.js";
import { AttachmentSection } from "./AttachmentSection.js";

interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export const RequesterTicketDetail: React.FC<RequesterTicketDetailProps> = ({
  ticketId,
  onBack,
}) => {
  const { currentRequester } = useRequester();
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentRequester) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchTicketDetail(ticketId, currentRequester.id)
      .then((data) => {
        if (isMounted) {
          setTicket(data);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load ticket details.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [ticketId, currentRequester]);

  const reloadTicket = useCallback(() => {
    if (!currentRequester) return;
    fetchTicketDetail(ticketId, currentRequester.id)
      .then((data) => {
        setTicket(data);
      })
      .catch((err) => {
        console.error("Failed to refresh ticket details:", err);
      });
  }, [ticketId, currentRequester]);

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="badge bg-danger">URGENT</span>;
      case "HIGH":
        return <span className="badge bg-warning text-dark">HIGH</span>;
      case "MEDIUM":
        return <span className="badge bg-info text-dark">MEDIUM</span>;
      case "LOW":
        return <span className="badge bg-secondary">LOW</span>;
      default:
        return <span className="badge bg-light text-dark">{priority}</span>;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span
            className="badge"
            style={{
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
              border: "1px solid var(--color-secondary-green)",
            }}
          >
            NEW
          </span>
        );
      case "IN_PROGRESS":
        return <span className="badge bg-primary">IN PROGRESS</span>;
      case "PENDING":
        return <span className="badge bg-warning text-dark">PENDING</span>;
      case "RESOLVED":
        return <span className="badge bg-success">RESOLVED</span>;
      case "CLOSED":
        return <span className="badge bg-dark">CLOSED</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFullTime = (dateStr?: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="container px-0" style={{ maxWidth: 900 }}>
      {/* Breadcrumb Navigation (UI Spec §4.5) */}
      <nav aria-label="breadcrumb" className="mb-3">
        <ol className="breadcrumb mb-0 small align-items-center">
          <li className="breadcrumb-item">
            <button
              type="button"
              className="btn btn-link p-0 text-decoration-none fw-medium d-inline-flex align-items-center"
              style={{ color: "var(--color-primary-green)", minHeight: "44px" }}
              onClick={onBack}
            >
              My Tickets
            </button>
          </li>
          <li className="breadcrumb-item active text-muted" aria-current="page">
            Ticket Details
          </li>
        </ol>
      </nav>

      {/* Loading State */}
      {isLoading ? (
        <div className="zen-card p-5 text-center">
          <div className="spinner-border text-success mb-3" role="status">
            <span className="visually-hidden">Loading ticket details...</span>
          </div>
          <p className="text-muted small mb-0">Loading ticket details...</p>
        </div>
      ) : error ? (
        /* Error State */
        <div className="zen-card p-4">
          <div className="alert zen-alert-danger mb-3" role="alert">
            <h4 className="h6 fw-bold mb-1">Error Loading Ticket</h4>
            <p className="mb-0 small">{error}</p>
          </div>
          <button
            className="btn btn-zen-secondary btn-sm d-inline-flex align-items-center"
            style={{ minHeight: "44px" }}
            onClick={onBack}
          >
            &larr; Back to My Tickets
          </button>
        </div>
      ) : ticket ? (
        /* Ticket Detail Content */
        <div className="zen-card p-4">
          {/* Header */}
          <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center pb-3 mb-4 border-bottom gap-2">
            <div>
              <span className="text-muted extra-small text-uppercase tracking-wider">Ticket Number</span>
              <div className="d-flex align-items-center gap-2 mt-1">
                <h2
                  className="h3 fw-bold font-monospace mb-0"
                  style={{ color: "var(--color-primary-green)" }}
                >
                  {ticket.ticketNumber}
                </h2>
                {renderStatusBadge(ticket.currentStatus)}
              </div>
            </div>
            <div>
              <button
                className="btn btn-zen-secondary btn-sm d-inline-flex align-items-center"
                style={{ minHeight: "44px" }}
                onClick={onBack}
              >
                &larr; Back to My Tickets
              </button>
            </div>
          </div>

          {/* Ticket Summary Title */}
          <div className="mb-4">
            <h1 className="h5 fw-bold text-dark mb-1">{ticket.summary}</h1>
          </div>

          {/* Read-Only Metadata Grid (UI Spec §4.5) */}
          <div className="p-3 mb-4 rounded border" style={{ backgroundColor: "#F9FAF9" }}>
            <div className="row g-3">
              {/* Requester */}
              <div className="col-12 col-md-6 col-lg-3">
                <span className="text-muted small d-block">Requester</span>
                <span className="fw-semibold text-dark small">
                  {ticket.requester?.name || "Unknown"}
                </span>
                <span className="text-muted extra-small d-block text-truncate">
                  {ticket.requester?.email || ""}
                </span>
              </div>

              {/* Created Date */}
              <div className="col-12 col-md-6 col-lg-3">
                <span className="text-muted small d-block">Date Submitted</span>
                <span className="fw-semibold text-dark small">
                  {formatFullDate(ticket.createdAt)}
                </span>
                <span className="text-muted extra-small d-block">
                  {formatFullTime(ticket.createdAt)}
                </span>
              </div>

              {/* Category */}
              <div className="col-12 col-md-6 col-lg-3">
                <span className="text-muted small d-block">Category</span>
                <span className="fw-semibold text-dark small">
                  {ticket.category?.name || "Uncategorized"}
                </span>
              </div>

              {/* Related System */}
              <div className="col-12 col-md-6 col-lg-3">
                <span className="text-muted small d-block">Related System</span>
                <span className="fw-semibold text-dark small">
                  {ticket.relatedSystem?.name || "N/A"}
                </span>
              </div>

              {/* Requested Priority */}
              <div className="col-12 col-md-6 col-lg-3">
                <span className="text-muted small d-block mb-1">Requested Priority</span>
                {renderPriorityBadge(ticket.requestedPriority)}
              </div>

              {/* Current Status */}
              <div className="col-12 col-md-6 col-lg-3">
                <span className="text-muted small d-block mb-1">Current Status</span>
                {renderStatusBadge(ticket.currentStatus)}
              </div>
            </div>
          </div>

          {/* Description Section */}
          <div className="mb-4">
            <h3 className="h6 fw-bold text-dark mb-2">Description</h3>
            <div
              className="p-3 rounded border"
              style={{
                backgroundColor: "var(--color-field-readonly)",
                whiteSpace: "pre-wrap",
                minHeight: "100px",
                lineHeight: 1.6,
              }}
            >
              {ticket.description}
            </div>
          </div>

          {/* Attachment Lifecycle Section (Issue #2-8) */}
          <AttachmentSection
            ticketId={ticket.id}
            attachments={ticket.attachments}
            onAttachmentsUpdated={reloadTicket}
          />
        </div>
      ) : null}
    </div>
  );
};
