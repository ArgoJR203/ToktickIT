import React, { useState, useEffect, useCallback } from "react";
import { useRequester } from "../context/RequesterContext.js";
import { useOptionalAuth } from "../context/AuthContext.js";
import {
  fetchTicketDetail,
  TicketDetail,
  PublicComment,
  fetchPublicComments,
  postPublicComment,
  indicateProblemResolved,
} from "../api.js";
import { AttachmentSection } from "./AttachmentSection.js";

interface RequesterTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export const RequesterTicketDetail: React.FC<RequesterTicketDetailProps> = ({
  ticketId,
  onBack,
}) => {
  const auth = useOptionalAuth();
  const { currentRequester } = useRequester();
  const activeUser = auth?.currentUser || currentRequester;
  const [ticket, setTicket] = useState<TicketDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Public Comments State
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loadingComments, setLoadingComments] = useState<boolean>(false);
  const [commentText, setCommentText] = useState<string>("");
  const [submittingComment, setSubmittingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Resolution Indication State
  const [isResolving, setIsResolving] = useState<boolean>(false);
  const [resolveSuccessNotice, setResolveSuccessNotice] = useState<string | null>(null);

  const loadComments = useCallback(async () => {
    if (!activeUser) return;
    try {
      setLoadingComments(true);
      const data = await fetchPublicComments(ticketId, activeUser.id);
      setComments(data);
    } catch {
      // Quietly fallback to empty list if network/backend is unavailable (e.g. in legacy tests)
      setComments([]);
    } finally {
      setLoadingComments(false);
    }
  }, [ticketId, activeUser?.id]);

  useEffect(() => {
    if (!activeUser) {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchTicketDetail(ticketId, activeUser.id)
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

    loadComments();

    return () => {
      isMounted = false;
    };
  }, [ticketId, activeUser?.id, loadComments]);

  const reloadTicket = useCallback(() => {
    if (!activeUser) return;
    fetchTicketDetail(ticketId, activeUser.id)
      .then((data) => {
        setTicket(data);
      })
      .catch((err) => {
        console.error("Failed to refresh ticket details:", err);
      });
    loadComments();
  }, [ticketId, activeUser?.id, loadComments]);

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeUser) return;
    const trimmed = commentText.trim();
    if (!trimmed) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    setSubmittingComment(true);
    setCommentError(null);
    try {
      const newComment = await postPublicComment(ticketId, trimmed, activeUser.id);
      setComments((prev) => [...prev, newComment]);
      setCommentText("");
    } catch (err) {
      setCommentError(err instanceof Error ? err.message : "Failed to post comment.");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleIndicateResolved = async () => {
    if (!activeUser) return;
    setIsResolving(true);
    try {
      const res = await indicateProblemResolved(ticketId, activeUser.id);
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              resolutionIndicated: true,
              resolutionIndicatedAt: res.resolutionIndicatedAt,
            }
          : prev
      );
      setResolveSuccessNotice(res.message);
      // Reload comments so automated comment appears
      await loadComments();
    } catch (err) {
      console.error("Failed to indicate problem resolved:", err);
    } finally {
      setIsResolving(false);
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "REQUESTER":
        return (
          <span
            className="badge"
            style={{
              backgroundColor: "#E8F4F8",
              color: "#0288D1",
              border: "1px solid #B3E5FC",
            }}
          >
            Requester
          </span>
        );
      case "IT_STAFF":
        return (
          <span
            className="badge fw-semibold"
            style={{
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
              border: "1px solid #A3D9BE",
            }}
          >
            IT Staff
          </span>
        );
      case "ADMINISTRATOR":
        return (
          <span
            className="badge fw-semibold"
            style={{
              backgroundColor: "#F3E5F5",
              color: "#6A1B9A",
              border: "1px solid #E1BEE7",
            }}
          >
            Administrator
          </span>
        );
      default:
        return <span className="badge bg-light text-dark">{role}</span>;
    }
  };

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
      case "WAITING_FOR_REQUESTER":
      case "PENDING":
        return <span className="badge bg-warning text-dark">WAITING FOR REQUESTER</span>;
      case "RESOLVED":
        return <span className="badge bg-success">RESOLVED</span>;
      case "CLOSED":
        return <span className="badge bg-dark">CLOSED</span>;
      case "REOPENED":
        return <span className="badge bg-info text-dark">REOPENED</span>;
      case "CANCELLED":
        return <span className="badge bg-danger">CANCELLED</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  const formatFullDate = (dateStr?: string | null) => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatFullTime = (dateStr?: string | null) => {
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
        <div className="zen-card p-3 p-md-4">
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
              <div className="col-12 col-sm-6 col-lg-4">
                <span className="text-muted small d-block">Requester</span>
                <span className="fw-semibold text-dark small">
                  {ticket.requester?.name || "Unknown"}
                </span>
                <span className="text-muted extra-small d-block text-truncate">
                  {ticket.requester?.email || ""}
                </span>
              </div>

              {/* Created Date */}
              <div className="col-12 col-sm-6 col-lg-4">
                <span className="text-muted small d-block">Date Submitted</span>
                <span className="fw-semibold text-dark small">
                  {formatFullDate(ticket.createdAt)}
                </span>
                <span className="text-muted extra-small d-block">
                  {formatFullTime(ticket.createdAt)}
                </span>
              </div>

              {/* Category */}
              <div className="col-12 col-sm-6 col-lg-4">
                <span className="text-muted small d-block">Category</span>
                <span className="fw-semibold text-dark small">
                  {ticket.category?.name || "Uncategorized"}
                </span>
              </div>

              {/* Related System */}
              <div className="col-12 col-sm-6 col-lg-4">
                <span className="text-muted small d-block">Related System</span>
                <span className="fw-semibold text-dark small">
                  {ticket.relatedSystem?.name || "N/A"}
                </span>
              </div>

              {/* Requested Priority */}
              <div className="col-12 col-sm-6 col-lg-4">
                <span className="text-muted small d-block mb-1">Requested Priority</span>
                {renderPriorityBadge(ticket.requestedPriority)}
              </div>

              {/* Current Status */}
              <div className="col-12 col-sm-6 col-lg-4">
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

          {/* Resolution Summary Section (if present) */}
          {ticket.resolutionSummary && (
            <div className="mb-4 p-3 rounded border" style={{ backgroundColor: "#EAF6EF", borderColor: "#A3D9BE" }}>
              <div className="d-flex align-items-center mb-2">
                <svg className="me-2 flex-shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#006B3C" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
                <h3 className="h6 fw-bold mb-0" style={{ color: "var(--color-primary-green)" }}>
                  Resolution Summary
                </h3>
              </div>
              <p className="mb-0 text-dark small" style={{ whiteSpace: "pre-wrap" }}>
                {ticket.resolutionSummary}
              </p>
            </div>
          )}

          {/* Problem Appears Resolved Callout (BR-05, BR-16, AC-12) */}
          {(ticket.currentStatus === "IN_PROGRESS" || ticket.currentStatus === "WAITING_FOR_REQUESTER") && (
            <div className="mb-4 p-3 rounded border" style={{ backgroundColor: "#F5F7F6" }}>
              {ticket.resolutionIndicated ? (
                <div className="d-flex align-items-center text-success small">
                  <svg className="me-2 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="9 12 11 14 15 10"></polyline>
                  </svg>
                  <div>
                    <strong>Problem Indicated as Resolved</strong>
                    <div className="text-muted extra-small">
                      {ticket.resolutionIndicatedAt
                        ? `Indicated on ${formatFullDate(ticket.resolutionIndicatedAt)} at ${formatFullTime(ticket.resolutionIndicatedAt)}. `
                        : ""}
                      IT Staff have been notified to review and formally close the ticket.
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  {resolveSuccessNotice && (
                    <div className="alert zen-alert-success py-2 px-3 small mb-3" role="alert">
                      {resolveSuccessNotice}
                    </div>
                  )}
                  <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3">
                    <div>
                      <h4 className="h6 fw-bold mb-1 text-dark">Is your problem resolved?</h4>
                      <p className="small text-muted mb-0">
                        If everything is working as expected, let IT Staff know that the problem appears resolved.
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-zen-secondary btn-sm flex-shrink-0 d-inline-flex align-items-center"
                      style={{ minHeight: "44px" }}
                      onClick={handleIndicateResolved}
                      disabled={isResolving}
                    >
                      {isResolving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Indicating...
                        </>
                      ) : (
                        <>
                          <svg className="me-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Problem Appears Resolved
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Attachment Lifecycle Section (Issue #2-8) */}
          <div className="mb-4">
            <AttachmentSection
              ticketId={ticket.id}
              attachments={ticket.attachments}
              onAttachmentsUpdated={reloadTicket}
            />
          </div>

          {/* Public Comments Timeline Section (Issue #3-5, API-11, API-12) */}
          <div className="mt-4 pt-3 border-top">
            <div className="d-flex align-items-center justify-content-between mb-3">
              <h3 className="h6 fw-bold text-dark mb-0 d-flex align-items-center">
                <span>Public Comments</span>
                <span className="badge bg-light text-muted border ms-2">
                  {comments.length}
                </span>
              </h3>
            </div>

            {/* Comments Feed */}
            {loadingComments ? (
              <div className="text-center py-3">
                <span className="spinner-border spinner-border-sm text-success" role="status"></span>
                <span className="ms-2 small text-muted">Loading comments...</span>
              </div>
            ) : comments.length === 0 ? (
              <div
                className="p-3 mb-3 rounded border text-center text-muted small"
                style={{ backgroundColor: "#FAFAFA" }}
              >
                No public comments yet. Post a question or update to communicate with IT Staff.
              </div>
            ) : (
              <div className="d-flex flex-column gap-3 mb-4">
                {comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="p-3 rounded border"
                    style={{
                      backgroundColor: comment.author.role === "REQUESTER" ? "#F9FAF9" : "#FFFFFF",
                      borderLeft:
                        comment.author.role === "REQUESTER"
                          ? "3px solid var(--color-primary-green)"
                          : "3px solid #0288D1",
                    }}
                  >
                    <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-1">
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-semibold text-dark small">{comment.author.name}</span>
                        {renderRoleBadge(comment.author.role)}
                      </div>
                      <span className="text-muted extra-small">
                        {formatFullDate(comment.createdAt)} {formatFullTime(comment.createdAt)}
                      </span>
                    </div>
                    <div className="small text-dark" style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
                      {comment.content}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add Comment Form */}
            <form onSubmit={handlePostComment}>
              {commentError && (
                <div className="alert zen-alert-danger py-2 px-3 small mb-2" role="alert">
                  {commentError}
                </div>
              )}
              <div className="mb-2">
                <label htmlFor="requester-comment-input" className="form-label small fw-semibold text-dark mb-1">
                  Add a Comment
                </label>
                <textarea
                  id="requester-comment-input"
                  className="form-control"
                  rows={3}
                  placeholder="Write a message to IT Staff..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  disabled={submittingComment}
                  maxLength={2000}
                />
                <div className="d-flex justify-content-between align-items-center mt-1">
                  <span className="extra-small text-muted">
                    {commentText.trim().length} / 2000 characters
                  </span>
                </div>
              </div>
              <div className="d-flex justify-content-end">
                <button
                  type="submit"
                  className="btn btn-zen-primary btn-sm d-inline-flex align-items-center"
                  style={{ minHeight: "44px" }}
                  disabled={submittingComment || !commentText.trim()}
                >
                  {submittingComment ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Posting...
                    </>
                  ) : (
                    "Post Comment"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
};

