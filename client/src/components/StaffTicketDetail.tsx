import React, { useState, useEffect, useCallback } from "react";
import { useOptionalAuth } from "../context/AuthContext.js";
import {
  fetchStaffTicketDetail,
  updateTicketOwner,
  updateTicketPriority,
  updateTicketStatus,
  fetchStaffAssignees,
  fetchPublicComments,
  postPublicComment,
  fetchInternalNotes,
  postInternalNote,
  StaffTicketDetailData,
  StaffAssignee,
  PublicComment,
  InternalNote,
} from "../api.js";
import { AttachmentSection } from "./AttachmentSection.js";

interface StaffTicketDetailProps {
  ticketId: number;
  onBack: () => void;
}

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({
  ticketId,
  onBack,
}) => {
  const auth = useOptionalAuth();
  const currentUser = auth?.currentUser;

  const [ticket, setTicket] = useState<StaffTicketDetailData | null>(null);
  const [assignees, setAssignees] = useState<StaffAssignee[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Operational Controls State
  const [selectedOwnerId, setSelectedOwnerId] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [resolutionSummaryText, setResolutionSummaryText] = useState<string>("");

  const [isUpdatingOwner, setIsUpdatingOwner] = useState<boolean>(false);
  const [isUpdatingPriority, setIsUpdatingPriority] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);

  // Feedback Notifications
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Activity / Communication Tabs
  const [activeTab, setActiveTab] = useState<"public" | "internal">("public");
  const [publicComments, setPublicComments] = useState<PublicComment[]>([]);
  const [internalNotes, setInternalNotes] = useState<InternalNote[]>([]);

  // Public Comment Form
  const [newCommentText, setNewCommentText] = useState<string>("");
  const [isPostingComment, setIsPostingComment] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Internal Note Form
  const [newNoteText, setNewNoteText] = useState<string>("");
  const [isPostingNote, setIsPostingNote] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const isStaffOrAdmin =
    currentUser?.role === "IT_STAFF" || currentUser?.role === "ADMINISTRATOR";

  // Auto-dismiss success notification
  useEffect(() => {
    if (!successNotice) return;
    const timer = setTimeout(() => setSuccessNotice(null), 4000);
    return () => clearTimeout(timer);
  }, [successNotice]);

  // Load ticket details and assignees
  const loadTicket = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ticketData, assigneesData] = await Promise.all([
        fetchStaffTicketDetail(ticketId),
        fetchStaffAssignees().catch(() => []),
      ]);

      setTicket(ticketData);
      setAssignees(assigneesData);
      setSelectedOwnerId(ticketData.owner ? ticketData.owner.id.toString() : "");
      setSelectedPriority(ticketData.itPriority);
      setSelectedStatus(ticketData.permittedNextStatuses[0] || "");
      setResolutionSummaryText(ticketData.resolutionSummary || "");
    } catch (err: any) {
      setError(err.message || "Failed to load ticket detail.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  // Load communications feeds
  const loadComments = useCallback(async () => {
    try {
      const comments = await fetchPublicComments(ticketId);
      setPublicComments(comments);
    } catch {
      setPublicComments([]);
    }
  }, [ticketId]);

  const loadNotes = useCallback(async () => {
    if (!isStaffOrAdmin) return;
    try {
      const notes = await fetchInternalNotes(ticketId);
      setInternalNotes(notes);
    } catch {
      setInternalNotes([]);
    }
  }, [ticketId, isStaffOrAdmin]);

  useEffect(() => {
    loadTicket();
    loadComments();
    loadNotes();
  }, [loadTicket, loadComments, loadNotes]);

  // 1. Claim Ownership (Assign to Me)
  const handleAssignToMe = async () => {
    if (!currentUser) return;
    setIsUpdatingOwner(true);
    setActionError(null);
    try {
      const res = await updateTicketOwner(ticketId, currentUser.id);
      setTicket((prev) => (prev ? { ...prev, owner: res.owner } : null));
      setSelectedOwnerId(currentUser.id.toString());
      setSuccessNotice(`Ticket claimed and assigned to ${currentUser.name}.`);
    } catch (err: any) {
      setActionError(err.message || "Failed to assign ticket to yourself.");
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // 2. Reassign Ownership via Dropdown
  const handleOwnerChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedOwnerId(val);
    setIsUpdatingOwner(true);
    setActionError(null);

    const targetId = val === "" ? null : parseInt(val, 10);
    try {
      const res = await updateTicketOwner(ticketId, targetId);
      setTicket((prev) => (prev ? { ...prev, owner: res.owner } : null));
      setSuccessNotice(
        res.owner
          ? `Ticket reassigned to ${res.owner.name}.`
          : "Ticket unassigned successfully."
      );
    } catch (err: any) {
      setActionError(err.message || "Failed to update ticket ownership.");
      // Rollback selection
      setSelectedOwnerId(ticket?.owner ? ticket.owner.id.toString() : "");
    } finally {
      setIsUpdatingOwner(false);
    }
  };

  // 3. Update IT Priority
  const handlePriorityChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPriority = e.target.value;
    setSelectedPriority(newPriority);
    setIsUpdatingPriority(true);
    setActionError(null);

    try {
      const res = await updateTicketPriority(ticketId, newPriority);
      setTicket((prev) =>
        prev ? { ...prev, itPriority: res.itPriority as any, updatedAt: res.updatedAt } : null
      );
      setSuccessNotice(`IT Priority updated to ${res.itPriority}.`);
    } catch (err: any) {
      setActionError(err.message || "Failed to update IT Priority.");
      setSelectedPriority(ticket?.itPriority || "");
    } finally {
      setIsUpdatingPriority(false);
    }
  };

  // 4. Update Status Transition
  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStatus) return;

    setIsUpdatingStatus(true);
    setActionError(null);

    try {
      const res = await updateTicketStatus(
        ticketId,
        selectedStatus,
        resolutionSummaryText
      );
      setTicket((prev) =>
        prev
          ? {
              ...prev,
              currentStatus: res.currentStatus,
              resolutionSummary: res.resolutionSummary,
              permittedNextStatuses: res.permittedNextStatuses,
              updatedAt: res.updatedAt,
            }
          : null
      );
      setSelectedStatus(res.permittedNextStatuses[0] || "");
      setSuccessNotice(`Status successfully updated to ${res.currentStatus}.`);
    } catch (err: any) {
      setActionError(err.message || "Failed to update ticket status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // 5. Post Public Comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCommentText.trim();
    if (!trimmed) {
      setCommentError("Comment cannot be empty.");
      return;
    }

    setIsPostingComment(true);
    setCommentError(null);
    try {
      const newComment = await postPublicComment(ticketId, trimmed);
      setPublicComments((prev) => [...prev, newComment]);
      setNewCommentText("");
      setSuccessNotice("Public comment posted successfully.");
    } catch (err: any) {
      setCommentError(err.message || "Failed to post comment.");
    } finally {
      setIsPostingComment(false);
    }
  };

  // 6. Post Internal Note
  const handlePostNote = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newNoteText.trim();
    if (!trimmed) {
      setNoteError("Internal note cannot be empty.");
      return;
    }

    setIsPostingNote(true);
    setNoteError(null);
    try {
      const newNote = await postInternalNote(ticketId, trimmed);
      setInternalNotes((prev) => [...prev, newNote]);
      setNewNoteText("");
      setSuccessNotice("Internal note posted successfully.");
    } catch (err: any) {
      setNoteError(err.message || "Failed to post internal note.");
    } finally {
      setIsPostingNote(false);
    }
  };

  // Badge Helpers
  const renderStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    const testId = `status-badge-${s.toLowerCase().replace(/_/g, "-")}`;
    switch (s) {
      case "NEW":
        return <span className="badge bg-primary" data-testid={testId}>NEW</span>;
      case "OPEN":
        return <span className="badge bg-success" data-testid={testId}>OPEN</span>;
      case "IN_PROGRESS":
        return <span className="badge bg-primary" data-testid={testId}>IN PROGRESS</span>;
      case "WAITING_FOR_REQUESTER":
        return <span className="badge bg-warning text-dark" data-testid={testId}>WAITING FOR REQUESTER</span>;
      case "RESOLVED":
        return <span className="badge bg-success" data-testid={testId}>RESOLVED</span>;
      case "CLOSED":
        return <span className="badge bg-dark" data-testid={testId}>CLOSED</span>;
      case "REOPENED":
        return <span className="badge bg-info text-dark" data-testid={testId}>REOPENED</span>;
      case "CANCELLED":
        return <span className="badge bg-danger" data-testid={testId}>CANCELLED</span>;
      default:
        return <span className="badge bg-secondary" data-testid={testId}>{status}</span>;
    }
  };

  const renderPriorityBadge = (priority: string, testIdPrefix = "priority-badge") => {
    const p = priority.toUpperCase();
    const testId = `${testIdPrefix}-${p.toLowerCase()}`;
    switch (p) {
      case "URGENT":
        return <span className="badge bg-danger fw-bold" data-testid={testId}>URGENT</span>;
      case "HIGH":
        return <span className="badge bg-warning text-dark" data-testid={testId}>HIGH</span>;
      case "MEDIUM":
        return <span className="badge bg-info text-dark" data-testid={testId}>MEDIUM</span>;
      case "LOW":
        return <span className="badge bg-secondary" data-testid={testId}>LOW</span>;
      default:
        return <span className="badge bg-light text-dark" data-testid={testId}>{priority}</span>;
    }
  };

  const renderRoleBadge = (role: string) => {
    switch (role) {
      case "ADMINISTRATOR":
        return <span className="badge bg-purple text-dark border ms-2">Administrator</span>;
      case "IT_STAFF":
        return <span className="badge bg-success text-white ms-2">IT Staff</span>;
      default:
        return <span className="badge bg-info text-dark ms-2">Requester</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="container py-4 text-center">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading ticket details...</span>
        </div>
        <p className="mt-2 text-muted">Loading ticket details...</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="container py-4">
        <button
          type="button"
          className="btn btn-outline-secondary mb-3"
          onClick={onBack}
          data-testid="back-to-queue-btn"
        >
          &larr; Back to Queue
        </button>
        <div className="alert alert-danger" role="alert">
          {error || "Ticket not found."}
        </div>
      </div>
    );
  }

  const isAssignedToCurrentUser =
    Boolean(currentUser && ticket.owner && ticket.owner.id === currentUser.id);

  const showResolutionInput =
    selectedStatus === "RESOLVED" ||
    selectedStatus === "CLOSED" ||
    ticket.currentStatus === "RESOLVED" ||
    ticket.currentStatus === "CLOSED";

  return (
    <div className="staff-ticket-detail-container pb-5">
      {/* Breadcrumb Navigation & Top Action Bar */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <nav aria-label="breadcrumb">
          <ol className="breadcrumb mb-0">
            <li className="breadcrumb-item">
              <button
                type="button"
                className="btn btn-link p-0 text-decoration-none"
                onClick={onBack}
                data-testid="back-to-queue-btn"
                style={{ color: "var(--color-primary-green)" }}
              >
                Ticket Queue
              </button>
            </li>
            <li className="breadcrumb-item active" aria-current="page">
              Ticket Detail
            </li>
          </ol>
        </nav>

        <button
          type="button"
          className="btn btn-outline-secondary btn-sm"
          onClick={onBack}
        >
          &larr; Back to Queue
        </button>
      </div>

      {/* Global Alerts */}
      {successNotice && (
        <div
          className="alert zen-alert-success alert-dismissible fade show mb-3"
          role="alert"
          data-testid="success-banner"
        >
          {successNotice}
          <button
            type="button"
            className="btn-close"
            onClick={() => setSuccessNotice(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {actionError && (
        <div
          className="alert alert-danger alert-dismissible fade show mb-3"
          role="alert"
          data-testid="action-error-banner"
        >
          {actionError}
          <button
            type="button"
            className="btn-close"
            onClick={() => setActionError(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* Ticket Header Card */}
      <div className="card zen-card p-3 mb-4 shadow-sm">
        <div className="d-flex flex-wrap justify-content-between align-items-center">
          <div>
            <h1 className="h4 fw-bold mb-1 font-monospace" data-testid="ticket-number">
              {ticket.ticketNumber}
            </h1>
            <h2 className="h5 text-dark mb-0">{ticket.summary}</h2>
          </div>
          <div className="mt-2 mt-md-0">
            {renderStatusBadge(ticket.currentStatus)}
          </div>
        </div>
      </div>

      {/* Requester Indication Callout Banner (BR-05, AC-12) */}
      {ticket.resolutionIndicated && (
        <div
          className="alert alert-warning d-flex align-items-center mb-4 shadow-sm"
          role="alert"
          data-testid="resolution-indicated-banner"
          style={{
            backgroundColor: "var(--color-warning-bg, #FFF3E0)",
            borderLeft: "4px solid #F57C00",
          }}
        >
          <svg
            className="me-2 flex-shrink-0"
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F57C00"
            strokeWidth="2"
          >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div>
            <strong>Requester Resolution Indication:</strong> The requester has marked this problem as resolved. Please verify and update status.
          </div>
        </div>
      )}

      {/* Operational Controls Grid (2 or 4 columns) */}
      <div className="card zen-card p-4 mb-4 shadow-sm">
        <h3 className="h6 text-uppercase fw-bold text-muted mb-3 border-bottom pb-2">
          Ticket Operations & Metadata
        </h3>

        <div className="row g-3">
          {/* Read-only Category */}
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label text-muted small fw-semibold">Category</label>
            <div
              className="p-2 rounded bg-light border text-truncate"
              data-testid="detail-category"
            >
              {ticket.category?.name || "Uncategorized"}
            </div>
          </div>

          {/* Read-only Related System */}
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label text-muted small fw-semibold">Related System</label>
            <div
              className="p-2 rounded bg-light border text-truncate"
              data-testid="detail-related-system"
            >
              {ticket.relatedSystem?.name || "None"}
            </div>
          </div>

          {/* Read-only Requester */}
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label text-muted small fw-semibold">Requester</label>
            <div
              className="p-2 rounded bg-light border text-truncate"
              data-testid="detail-requester"
              title={`${ticket.requester.name} (${ticket.requester.email})`}
            >
              {ticket.requester.name}{" "}
              <span className="text-muted small">({ticket.requester.email})</span>
            </div>
          </div>

          {/* Read-only Requested Priority */}
          <div className="col-12 col-md-6 col-lg-3">
            <label className="form-label text-muted small fw-semibold">Requested Priority</label>
            <div className="p-2 rounded bg-light border" data-testid="detail-requested-priority">
              {renderPriorityBadge(ticket.requestedPriority, "detail-requested-badge")}
            </div>
          </div>

          {/* Interactive Ticket Owner Assignment */}
          <div className="col-12 col-md-6 col-lg-6">
            <div className="d-flex justify-content-between align-items-center mb-1">
              <label htmlFor="owner-select" className="form-label text-muted small fw-semibold mb-0">
                Ticket Owner (Assignee)
              </label>
              {currentUser && !isAssignedToCurrentUser && (
                <button
                  type="button"
                  className="btn btn-link btn-sm p-0 text-decoration-none fw-semibold"
                  style={{ color: "var(--color-primary-green)" }}
                  onClick={handleAssignToMe}
                  disabled={isUpdatingOwner}
                  data-testid="assign-to-me-btn"
                >
                  Assign to Me
                </button>
              )}
            </div>
            <select
              id="owner-select"
              className="form-select"
              value={selectedOwnerId}
              onChange={handleOwnerChange}
              disabled={isUpdatingOwner}
              data-testid="owner-select"
            >
              <option value="">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role === "ADMINISTRATOR" ? "Admin" : "Staff"})
                </option>
              ))}
            </select>
          </div>

          {/* Interactive IT Priority */}
          <div className="col-12 col-md-6 col-lg-6">
            <label htmlFor="it-priority-select" className="form-label text-muted small fw-semibold">
              IT Priority (Operational)
            </label>
            <select
              id="it-priority-select"
              className="form-select"
              value={selectedPriority}
              onChange={handlePriorityChange}
              disabled={isUpdatingPriority}
              data-testid="it-priority-select"
            >
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
        </div>

        {/* Status Transition Control Form */}
        <div className="mt-4 pt-3 border-top">
          <form onSubmit={handleUpdateStatus}>
            <div className="row g-3 align-items-end">
              <div className="col-12 col-md-5">
                <label htmlFor="status-select" className="form-label text-muted small fw-semibold">
                  Advance Ticket Status
                </label>
                {ticket.permittedNextStatuses.length > 0 ? (
                  <select
                    id="status-select"
                    className="form-select"
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    disabled={isUpdatingStatus}
                    data-testid="status-select"
                  >
                    {ticket.permittedNextStatuses.map((st) => (
                      <option key={st} value={st}>
                        {st.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="form-control bg-light text-muted" data-testid="status-terminal">
                    No further transitions (Terminal Status)
                  </div>
                )}
              </div>

              <div className="col-12 col-md-3">
                <button
                  type="submit"
                  className="btn btn-success w-100"
                  style={{ backgroundColor: "var(--color-primary-green)" }}
                  disabled={
                    isUpdatingStatus ||
                    ticket.permittedNextStatuses.length === 0 ||
                    !selectedStatus
                  }
                  data-testid="update-status-btn"
                >
                  {isUpdatingStatus ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Updating...
                    </>
                  ) : (
                    "Update Status"
                  )}
                </button>
              </div>
            </div>

            {/* Resolution Summary input (visible when transitioning to or in RESOLVED/CLOSED) */}
            {showResolutionInput && (
              <div className="mt-3" data-testid="resolution-summary-container">
                <label
                  htmlFor="resolution-summary-input"
                  className="form-label text-muted small fw-semibold"
                >
                  Resolution Summary (Visible to Requester)
                </label>
                <textarea
                  id="resolution-summary-input"
                  className="form-control"
                  rows={3}
                  value={resolutionSummaryText}
                  onChange={(e) => setResolutionSummaryText(e.target.value)}
                  placeholder="Add resolution summary (Visible to requester)..."
                  maxLength={2000}
                  data-testid="resolution-summary-input"
                  aria-label="Resolution Summary"
                ></textarea>
                <div className="form-text text-end">
                  {resolutionSummaryText.length}/2000 characters
                </div>
              </div>
            )}
          </form>
        </div>
      </div>

      {/* Description & Details Panel */}
      <div className="card zen-card p-4 mb-4 shadow-sm">
        <h3 className="h6 text-uppercase fw-bold text-muted mb-3 border-bottom pb-2">
          Description
        </h3>
        <div
          className="p-3 bg-light rounded text-break"
          style={{ minHeight: "80px", whiteSpace: "pre-wrap" }}
          data-testid="ticket-description"
        >
          {ticket.description}
        </div>

        {ticket.resolutionSummary && !showResolutionInput && (
          <div className="mt-3 p-3 rounded border" style={{ backgroundColor: "var(--color-pale-green)" }}>
            <h4 className="h6 fw-bold text-success mb-1">Resolution Summary</h4>
            <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap" }}>
              {ticket.resolutionSummary}
            </p>
          </div>
        )}
      </div>

      {/* Tabbed Activity & Communication Container */}
      <div className="card zen-card shadow-sm mb-4">
        <div className="card-header bg-white p-0 border-bottom">
          <ul className="nav nav-tabs card-header-tabs m-0 px-3 pt-2">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link fw-semibold ${activeTab === "public" ? "active text-success border-bottom-0" : "text-muted"}`}
                onClick={() => setActiveTab("public")}
                data-testid="tab-public-comments"
              >
                Public Comments ({publicComments.length})
              </button>
            </li>

            {isStaffOrAdmin && (
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeTab === "internal" ? "active text-warning border-bottom-0" : "text-muted"}`}
                  onClick={() => setActiveTab("internal")}
                  data-testid="tab-internal-notes"
                  style={
                    activeTab === "internal"
                      ? { color: "#E65100", borderTop: "2px solid #F57C00" }
                      : {}
                  }
                >
                  <span className="me-1">🔒</span> Internal Notes ({internalNotes.length})
                </button>
              </li>
            )}
          </ul>
        </div>

        <div className="card-body p-4">
          {/* TAB 1: Public Comments */}
          {activeTab === "public" && (
            <div data-testid="public-comments-tab-content">
              <div className="alert alert-info py-2 px-3 mb-3 small d-flex align-items-center">
                <span className="me-2">ℹ️</span>
                <span>Public comments are visible to you and the Requester.</span>
              </div>

              {/* Feed */}
              <div
                className="comments-feed mb-4"
                style={{ maxHeight: "400px", overflowY: "auto" }}
                data-testid="public-comments-feed"
              >
                {publicComments.length === 0 ? (
                  <p className="text-muted text-center py-3 mb-0">No public comments yet.</p>
                ) : (
                  publicComments.map((c) => (
                    <div
                      key={c.id}
                      className="card mb-2 border-0 bg-light shadow-none"
                      data-testid={`comment-card-${c.id}`}
                    >
                      <div className="card-body py-2 px-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="fw-semibold">
                            {c.author.name}
                            {renderRoleBadge(c.author.role)}
                          </div>
                          <small className="text-muted">
                            {new Date(c.createdAt).toLocaleString()}
                          </small>
                        </div>
                        <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap" }}>
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Public Comment Form */}
              <form onSubmit={handlePostComment}>
                {commentError && (
                  <div className="alert alert-danger py-2 small mb-2">{commentError}</div>
                )}
                <div className="mb-2">
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Write a public comment to the requester..."
                    value={newCommentText}
                    onChange={(e) => setNewCommentText(e.target.value)}
                    maxLength={2000}
                    data-testid="public-comment-input"
                  ></textarea>
                  <div className="form-text text-end">
                    {newCommentText.length}/2000 characters
                  </div>
                </div>
                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-success"
                    style={{ backgroundColor: "var(--color-primary-green)" }}
                    disabled={isPostingComment || newCommentText.trim().length === 0}
                    data-testid="post-comment-btn"
                  >
                    {isPostingComment ? "Posting..." : "Post Comment"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 2: Internal Notes (Amber Styling) */}
          {activeTab === "internal" && isStaffOrAdmin && (
            <div data-testid="internal-notes-tab-content">
              {/* Distinct Warm Amber Banner (UI Spec §4.4) */}
              <div
                className="p-3 mb-3 rounded"
                data-testid="internal-notes-banner"
                style={{
                  backgroundColor: "var(--color-warning-bg, #FFF3E0)",
                  borderLeft: "4px solid #F57C00",
                  color: "#5D4037",
                }}
              >
                <div className="d-flex align-items-center">
                  <span className="me-2" style={{ fontSize: "1.2rem" }}>
                    🔒
                  </span>
                  <strong>
                    INTERNAL NOTES: Visible only to IT Staff and Administrators. Never shared with the Requester.
                  </strong>
                </div>
              </div>

              {/* Notes Feed */}
              <div
                className="notes-feed mb-4"
                style={{ maxHeight: "400px", overflowY: "auto" }}
                data-testid="internal-notes-feed"
              >
                {internalNotes.length === 0 ? (
                  <p className="text-muted text-center py-3 mb-0">No internal notes yet.</p>
                ) : (
                  internalNotes.map((n) => (
                    <div
                      key={n.id}
                      className="card mb-2"
                      style={{
                        backgroundColor: "#FFF8E1",
                        border: "1px solid #FFE082",
                        borderLeft: "4px solid #F57C00",
                      }}
                      data-testid={`note-card-${n.id}`}
                    >
                      <div className="card-body py-2 px-3">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="fw-semibold text-dark">
                            {n.author.name}
                            <span className="badge bg-warning text-dark border ms-2">
                              🔒 Internal Note
                            </span>
                          </div>
                          <small className="text-muted">
                            {new Date(n.createdAt).toLocaleString()}
                          </small>
                        </div>
                        <p className="mb-0 text-dark" style={{ whiteSpace: "pre-wrap" }}>
                          {n.content}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Add Internal Note Form */}
              <form onSubmit={handlePostNote}>
                {noteError && (
                  <div className="alert alert-danger py-2 small mb-2">{noteError}</div>
                )}
                <div className="mb-2">
                  <textarea
                    className="form-control"
                    rows={3}
                    placeholder="Add an internal note (Staff & Admin only)..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    maxLength={2000}
                    data-testid="internal-note-input"
                    style={{ borderColor: "#FFCC80" }}
                  ></textarea>
                  <div className="form-text text-end">
                    {newNoteText.length}/2000 characters
                  </div>
                </div>
                <div className="text-end">
                  <button
                    type="submit"
                    className="btn btn-warning text-dark fw-semibold"
                    style={{ backgroundColor: "#F57C00", color: "#FFFFFF", borderColor: "#F57C00" }}
                    disabled={isPostingNote || newNoteText.trim().length === 0}
                    data-testid="post-note-btn"
                  >
                    {isPostingNote ? "Posting Note..." : "Post Internal Note"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Attachments Section */}
      <div className="card zen-card p-4 shadow-sm">
        <h3 className="h6 text-uppercase fw-bold text-muted mb-3 border-bottom pb-2">
          Attachments
        </h3>
        <AttachmentSection
          ticketId={ticketId}
          attachments={ticket.attachments || []}
          onAttachmentsUpdated={loadTicket}
        />
      </div>
    </div>
  );
};
