import React, { useState, useEffect, useCallback } from "react";
import { useOptionalAuth } from "../context/AuthContext.js";
import {
  ActionTakenItem,
  ActionStatusType,
  StaffAssignee,
  fetchActionsTaken,
  createActionTaken,
  updateActionTaken,
  fetchStaffAssignees,
} from "../api.js";

interface ActionsTakenProps {
  ticketId: number;
  isReadOnly?: boolean;
  onActionSaved?: () => void;
  assignees?: StaffAssignee[];
}

export const ActionsTaken: React.FC<ActionsTakenProps> = ({
  ticketId,
  isReadOnly = false,
  onActionSaved,
  assignees: preloadedAssignees,
}) => {
  const auth = useOptionalAuth();
  const currentUser = auth?.currentUser;

  // Determine read-only mode: prop or role is REQUESTER
  const isRequesterRole = currentUser?.role === "REQUESTER";
  const effectiveReadOnly = isReadOnly || isRequesterRole;

  const [actions, setActions] = useState<ActionTakenItem[]>([]);
  const [assignees, setAssignees] = useState<StaffAssignee[]>(preloadedAssignees || []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingAction, setEditingAction] = useState<ActionTakenItem | null>(null);

  // Form Field States
  const [actionDateTime, setActionDateTime] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [status, setStatus] = useState<ActionStatusType>("COMPLETED");
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [followUpDone, setFollowUpDone] = useState<boolean>(false);
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");

  // Submission & Validation States
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [conflictAction, setConflictAction] = useState<ActionTakenItem | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  // Helper to format ISO datetime for datetime-local input (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (dateString?: string) => {
    const d = dateString ? new Date(dateString) : new Date();
    if (isNaN(d.getTime())) return "";
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // Load actions taken list
  const loadActions = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchActionsTaken(ticketId);
      setActions(data);
    } catch (err: any) {
      setError(err.message || "Failed to load actions taken.");
    } finally {
      setIsLoading(false);
    }
  }, [ticketId]);

  // Load assignees if not provided
  useEffect(() => {
    if (preloadedAssignees && preloadedAssignees.length > 0) {
      setAssignees(preloadedAssignees);
      return;
    }
    if (!effectiveReadOnly) {
      fetchStaffAssignees()
        .then((data) => setAssignees(data))
        .catch(() => setAssignees([]));
    }
  }, [preloadedAssignees, effectiveReadOnly]);

  useEffect(() => {
    loadActions();
  }, [loadActions]);

  // Handle keyboard Escape to close modal (WCAG AA accessibility)
  useEffect(() => {
    if (!isModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isModalOpen, isSubmitting]);

  // Open modal for Logging new action
  const handleOpenCreateModal = () => {
    setEditingAction(null);
    setActionDateTime(formatDateTimeLocal());
    setAssigneeId(currentUser?.id ? currentUser.id.toString() : "");
    setStatus("COMPLETED");
    setDescription("");
    setResult("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setFollowUpDone(false);
    setAttachmentNotes("");
    setModalError(null);
    setConflictAction(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  // Open modal for Editing existing action
  const handleOpenEditModal = (action: ActionTakenItem) => {
    setEditingAction(action);
    setActionDateTime(formatDateTimeLocal(action.actionDateTime));
    setAssigneeId(action.assigneeId ? action.assigneeId.toString() : "");
    setStatus(action.status);
    setDescription(action.description);
    setResult(action.result);
    setFollowUpRequired(action.followUpRequired);
    setFollowUpNote(action.followUpNote || "");
    setFollowUpDone(action.followUpDone);
    setAttachmentNotes(action.attachmentNotes || "");
    setModalError(null);
    setConflictAction(null);
    setFieldErrors({});
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setIsModalOpen(false);
    setEditingAction(null);
    setModalError(null);
    setConflictAction(null);
    setFieldErrors({});
  };

  // Validate form client-side before submission
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errors.description = "Action description is required.";
    } else if (trimmedDesc.length > 2000) {
      errors.description = "Action description must not exceed 2000 characters.";
    }

    const trimmedResult = result.trim();
    if (!trimmedResult) {
      errors.result = "Action result is required.";
    } else if (trimmedResult.length > 2000) {
      errors.result = "Action result must not exceed 2000 characters.";
    }

    if (!actionDateTime) {
      errors.actionDateTime = "Action date/time is required.";
    } else if (isNaN(new Date(actionDateTime).getTime())) {
      errors.actionDateTime = "Invalid date/time format.";
    }

    if (followUpRequired) {
      const trimmedNote = followUpNote.trim();
      if (!trimmedNote) {
        errors.followUpNote = "Follow-up note is required when follow-up is requested.";
      } else if (trimmedNote.length > 1000) {
        errors.followUpNote = "Follow-up note must not exceed 1000 characters.";
      }
    }

    if (attachmentNotes && attachmentNotes.trim().length > 500) {
      errors.attachmentNotes = "Attachment notes must not exceed 500 characters.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double-click submission

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setModalError(null);
    setConflictAction(null);

    try {
      const parsedAssignee = assigneeId ? parseInt(assigneeId, 10) : null;
      const formattedDate = actionDateTime ? new Date(actionDateTime).toISOString() : new Date().toISOString();

      if (editingAction) {
        // Update Action Taken (PATCH)
        await updateActionTaken(ticketId, editingAction.id, {
          actionDateTime: formattedDate,
          assigneeId: parsedAssignee,
          status,
          description: description.trim(),
          result: result.trim(),
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote.trim() : null,
          followUpDone: followUpRequired ? followUpDone : false,
          attachmentNotes: attachmentNotes.trim().length > 0 ? attachmentNotes.trim() : null,
          version: editingAction.version,
        });
      } else {
        // Create Action Taken (POST)
        await createActionTaken(ticketId, {
          actionDateTime: formattedDate,
          assigneeId: parsedAssignee,
          status,
          description: description.trim(),
          result: result.trim(),
          followUpRequired,
          followUpNote: followUpRequired ? followUpNote.trim() : null,
          followUpDone: followUpRequired ? followUpDone : false,
          attachmentNotes: attachmentNotes.trim().length > 0 ? attachmentNotes.trim() : null,
        });
      }

      setIsModalOpen(false);
      setEditingAction(null);
      await loadActions();
      if (onActionSaved) {
        onActionSaved();
      }
    } catch (err: any) {
      if (err.code === "STALE_UPDATE" || err.status === 409) {
        setConflictAction(err.currentAction || null);
        setModalError(
          "⚠️ Update Conflict: Another staff member has modified this action. Please reload the latest data to avoid overwriting their work."
        );
      } else {
        setModalError(err.message || "Failed to save action taken.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConflictReload = async () => {
    await loadActions();
    handleCloseModal();
  };

  // Status Badge Rendering
  const renderStatusBadge = (actionStatus: ActionStatusType) => {
    let badgeClass = "badge-action-completed";
    let label = "Completed";

    switch (actionStatus) {
      case "PENDING":
        badgeClass = "badge-action-pending";
        label = "Pending";
        break;
      case "IN_PROGRESS":
        badgeClass = "badge-action-in-progress";
        label = "In Progress";
        break;
      case "COMPLETED":
        badgeClass = "badge-action-completed";
        label = "Completed";
        break;
      case "CANCELLED":
        badgeClass = "badge-action-cancelled";
        label = "Cancelled";
        break;
    }

    return (
      <span className={`badge ${badgeClass} fw-semibold px-2 py-1`} data-testid={`action-status-badge-${actionStatus}`}>
        {label}
      </span>
    );
  };

  // Format readable timestamp
  const formatDisplayDateTime = (dt: string) => {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return dt;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="actions-taken-container my-4" data-testid="actions-taken-section">
      <div className="card zen-card shadow-sm">
        {/* Header with Title and Action Button */}
        <div className="card-header bg-white py-3 px-4 d-flex justify-content-between align-items-center border-bottom">
          <div className="d-flex align-items-center">
            <h3 className="h5 mb-0 fw-bold text-dark me-2" data-testid="actions-taken-title">
              Actions Taken
            </h3>
            <span className="badge rounded-pill bg-light text-success border border-success fw-bold px-2 py-1" data-testid="actions-count-badge">
              {actions.length}
            </span>
          </div>

          {!effectiveReadOnly && (
            <button
              type="button"
              className="btn btn-zen-primary btn-sm d-flex align-items-center"
              onClick={handleOpenCreateModal}
              data-testid="log-action-btn"
            >
              <span className="me-1 fw-bold">+</span> Log Action Taken
            </button>
          )}
        </div>

        <div className="card-body p-0">
          {/* Loading Indicator */}
          {isLoading && (
            <div className="text-center py-4" data-testid="actions-loading">
              <div className="spinner-border spinner-border-sm text-success me-2" role="status"></div>
              <span className="text-muted">Loading actions taken...</span>
            </div>
          )}

          {/* Error Message */}
          {error && !isLoading && (
            <div className="alert alert-danger m-3 py-2 small" data-testid="actions-error">
              {error}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && actions.length === 0 && (
            <div className="text-center py-5 text-muted" data-testid="no-actions-message">
              <div className="mb-2" style={{ fontSize: "1.8rem" }}>📋</div>
              <p className="mb-0 fw-medium">No actions taken logged yet.</p>
              {!effectiveReadOnly && (
                <small className="text-muted">Click "+ Log Action Taken" to document operational work.</small>
              )}
            </div>
          )}

          {/* Desktop Table View */}
          {!isLoading && !error && actions.length > 0 && (
            <>
              <div className="table-responsive d-none d-md-block">
                <table className="table table-hover align-middle mb-0" data-testid="actions-taken-table">
                  <thead className="table-light">
                    <tr>
                      <th scope="col" style={{ width: "16%" }} className="small text-uppercase text-muted fw-semibold ps-4">
                        Date / Time
                      </th>
                      <th scope="col" style={{ width: "26%" }} className="small text-uppercase text-muted fw-semibold">
                        Description
                      </th>
                      <th scope="col" style={{ width: "24%" }} className="small text-uppercase text-muted fw-semibold">
                        Result
                      </th>
                      <th scope="col" style={{ width: "12%" }} className="small text-uppercase text-muted fw-semibold">
                        Status
                      </th>
                      <th scope="col" style={{ width: "14%" }} className="small text-uppercase text-muted fw-semibold">
                        Performer / Assignee
                      </th>
                      {!effectiveReadOnly && (
                        <th scope="col" style={{ width: "8%" }} className="small text-uppercase text-muted fw-semibold text-end pe-4">
                          Action
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {actions.map((act) => (
                      <tr key={act.id} data-testid={`action-row-${act.id}`}>
                        {/* Date / Time */}
                        <td className="ps-4 text-nowrap">
                          <div className="fw-semibold text-dark small">{formatDisplayDateTime(act.actionDateTime)}</div>
                          {new Date(act.actionDateTime) > new Date() && (
                            <span className="badge bg-light text-primary border small" style={{ fontSize: "0.7rem" }}>
                              Planned
                            </span>
                          )}
                        </td>

                        {/* Description */}
                        <td>
                          <div className="text-dark small text-break" style={{ whiteSpace: "pre-wrap" }}>
                            {act.description}
                          </div>
                          {act.attachmentNotes && (
                            <div className="mt-1 small text-muted font-monospace" style={{ fontSize: "0.78rem" }}>
                              📎 {act.attachmentNotes}
                            </div>
                          )}
                        </td>

                        {/* Result & Follow-up */}
                        <td>
                          <div className="text-dark small text-break" style={{ whiteSpace: "pre-wrap" }}>
                            {act.result}
                          </div>
                          {act.followUpRequired && (
                            <div className="mt-2 p-2 rounded small bg-light border">
                              <div className="d-flex align-items-center mb-1">
                                <span className="fw-semibold text-dark me-2">Follow-up:</span>
                                {act.followUpDone ? (
                                  <span className="badge bg-success small px-2 py-0" data-testid={`followup-done-${act.id}`}>
                                    ✓ Completed
                                  </span>
                                ) : (
                                  <span className="badge bg-warning text-dark small px-2 py-0" data-testid={`followup-pending-${act.id}`}>
                                    ⏳ Pending
                                  </span>
                                )}
                              </div>
                              <div className="text-muted small fst-italic text-break">{act.followUpNote}</div>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td>{renderStatusBadge(act.status)}</td>

                        {/* Performer / Assignee */}
                        <td className="small">
                          <div>
                            <span className="text-muted">By:</span>{" "}
                            <span className="fw-semibold text-dark">{act.performedBy?.name || "System"}</span>
                          </div>
                          {act.assignee && (
                            <div className="text-muted">
                              <span>For:</span>{" "}
                              <span className="fw-semibold text-secondary">{act.assignee.name}</span>
                            </div>
                          )}
                        </td>

                        {/* Edit Action Button */}
                        {!effectiveReadOnly && (
                          <td className="text-end pe-4">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm px-2 py-1"
                              onClick={() => handleOpenEditModal(act)}
                              data-testid={`edit-action-btn-${act.id}`}
                              aria-label={`Edit Action ${act.id}`}
                            >
                              Edit
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="d-md-none p-3" data-testid="actions-mobile-cards">
                {actions.map((act) => (
                  <div
                    key={act.id}
                    className="card mb-3 p-3 shadow-sm bg-white action-card-mobile"
                    data-testid={`action-card-${act.id}`}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <div>
                        <span className="small text-muted fw-semibold">{formatDisplayDateTime(act.actionDateTime)}</span>
                        {new Date(act.actionDateTime) > new Date() && (
                          <span className="badge bg-light text-primary border ms-2 small" style={{ fontSize: "0.7rem" }}>
                            Planned
                          </span>
                        )}
                      </div>
                      <div>{renderStatusBadge(act.status)}</div>
                    </div>

                    <div className="mb-2">
                      <div className="small text-muted fw-semibold">Description:</div>
                      <div className="text-dark small text-break" style={{ whiteSpace: "pre-wrap" }}>
                        {act.description}
                      </div>
                    </div>

                    <div className="mb-2">
                      <div className="small text-muted fw-semibold">Result:</div>
                      <div className="text-dark small text-break" style={{ whiteSpace: "pre-wrap" }}>
                        {act.result}
                      </div>
                    </div>

                    {act.followUpRequired && (
                      <div className="mb-2 p-2 rounded small bg-light border">
                        <div className="d-flex align-items-center mb-1">
                          <span className="fw-semibold text-dark me-2">Follow-up:</span>
                          {act.followUpDone ? (
                            <span className="badge bg-success small px-2 py-0">✓ Completed</span>
                          ) : (
                            <span className="badge bg-warning text-dark small px-2 py-0">⏳ Pending</span>
                          )}
                        </div>
                        <div className="text-muted small fst-italic text-break">{act.followUpNote}</div>
                      </div>
                    )}

                    {act.attachmentNotes && (
                      <div className="mb-2 small text-muted font-monospace" style={{ fontSize: "0.78rem" }}>
                        📎 {act.attachmentNotes}
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2 small">
                      <div className="text-muted">
                        <span>By {act.performedBy?.name || "System"}</span>
                        {act.assignee && <span> → {act.assignee.name}</span>}
                      </div>

                      {!effectiveReadOnly && (
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          style={{ minHeight: "44px", minWidth: "60px" }}
                          onClick={() => handleOpenEditModal(act)}
                          data-testid={`mobile-edit-action-btn-${act.id}`}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Log / Edit Action Taken Modal Dialog */}
      {isModalOpen && (
        <div
          className="modal-backdrop-custom"
          role="dialog"
          aria-modal="true"
          aria-labelledby="action-modal-title"
          data-testid="action-taken-modal"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseModal();
          }}
        >
          <div className="modal-dialog modal-dialog-centered modal-lg w-100" style={{ maxWidth: "680px" }}>
            <div className="modal-content shadow-lg border-0 rounded-3">
              <div className="modal-header py-3 px-4 border-bottom" style={{ backgroundColor: "var(--color-primary-green)", color: "#FFFFFF" }}>
                <h4 className="modal-title h5 mb-0 fw-bold" id="action-modal-title" data-testid="action-modal-title">
                  {editingAction ? "Edit Action Taken" : "Log Action Taken"}
                </h4>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  aria-label="Close"
                  disabled={isSubmitting}
                  onClick={handleCloseModal}
                  data-testid="close-modal-btn"
                ></button>
              </div>

              <form onSubmit={handleSubmit} noValidate>
                <div className="modal-body p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
                  {/* Stale Update 409 Conflict Banner */}
                  {(conflictAction || (modalError && modalError.toLowerCase().includes("conflict"))) && (
                    <div className="alert alert-conflict p-3 mb-3 rounded" data-testid="action-conflict-banner">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>⚠️ Concurrent Update Collision:</strong>
                          <div className="small mt-1">
                            {conflictAction
                              ? `This action was concurrently updated by another staff member (Version ${conflictAction.version}). Your changes cannot be saved directly over their work.`
                              : modalError || "This action was concurrently modified by another user. Please reload the latest data."}
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-warning btn-sm fw-bold ms-3"
                          onClick={handleConflictReload}
                          data-testid="reload-conflict-action-btn"
                        >
                          Reload Latest
                        </button>
                      </div>
                    </div>
                  )}

                  {/* General Modal Error */}
                  {modalError && !conflictAction && !modalError.toLowerCase().includes("conflict") && (
                    <div className="alert alert-danger py-2 small mb-3" data-testid="modal-error-alert">
                      {modalError}
                    </div>
                  )}

                  <div className="row g-3">
                    {/* Performer (Read-Only) */}
                    <div className="col-12 col-md-6">
                      <label className="form-label small text-muted fw-semibold">
                        Performed By (Session User)
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        readOnly
                        disabled
                        value={
                          editingAction
                            ? editingAction.performedBy?.name || currentUser?.name || "IT Staff"
                            : currentUser?.name || "IT Staff"
                        }
                        style={{ backgroundColor: "var(--color-field-readonly)", color: "var(--color-text-main)" }}
                        data-testid="action-performer-field"
                      />
                      <div className="form-text" style={{ fontSize: "0.75rem" }}>
                        Authoritatively bound to authenticated session (BR-03).
                      </div>
                    </div>

                    {/* Assignee (Select) */}
                    <div className="col-12 col-md-6">
                      <label htmlFor="action-assignee-select" className="form-label small text-muted fw-semibold">
                        Assignee (Staff / Admin)
                      </label>
                      <select
                        id="action-assignee-select"
                        className="form-select"
                        value={assigneeId}
                        onChange={(e) => setAssigneeId(e.target.value)}
                        disabled={isSubmitting}
                        data-testid="action-assignee-select"
                      >
                        <option value="">Unassigned</option>
                        {assignees.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role === "ADMINISTRATOR" ? "Admin" : "Staff"})
                          </option>
                        ))}
                      </select>
                      {fieldErrors.assigneeId && (
                        <div className="text-danger small mt-1">{fieldErrors.assigneeId}</div>
                      )}
                    </div>

                    {/* Action Date / Time */}
                    <div className="col-12 col-md-6">
                      <label htmlFor="action-datetime-input" className="form-label small text-muted fw-semibold">
                        Action Date & Time <span className="text-danger">*</span>
                      </label>
                      <input
                        id="action-datetime-input"
                        type="datetime-local"
                        className={`form-control ${fieldErrors.actionDateTime ? "is-invalid" : ""}`}
                        value={actionDateTime}
                        onChange={(e) => setActionDateTime(e.target.value)}
                        disabled={isSubmitting}
                        required
                        data-testid="action-datetime-input"
                      />
                      {fieldErrors.actionDateTime && (
                        <div className="invalid-feedback">{fieldErrors.actionDateTime}</div>
                      )}
                      <div className="form-text" style={{ fontSize: "0.75rem" }}>
                        Supports past, present, or future scheduled actions (BR-04).
                      </div>
                    </div>

                    {/* Status */}
                    <div className="col-12 col-md-6">
                      <label htmlFor="action-status-select" className="form-label small text-muted fw-semibold">
                        Action Status <span className="text-danger">*</span>
                      </label>
                      <select
                        id="action-status-select"
                        className="form-select"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as ActionStatusType)}
                        disabled={isSubmitting}
                        data-testid="action-status-select"
                      >
                        <option value="COMPLETED">COMPLETED (Executed Work)</option>
                        <option value="PENDING">PENDING (Planned Work)</option>
                        <option value="IN_PROGRESS">IN_PROGRESS (Underway)</option>
                        <option value="CANCELLED">CANCELLED (Withdrawn)</option>
                      </select>
                    </div>

                    {/* Description */}
                    <div className="col-12">
                      <div className="d-flex justify-content-between">
                        <label htmlFor="action-description-input" className="form-label small text-muted fw-semibold mb-1">
                          Action Description <span className="text-danger">*</span>
                        </label>
                        <span className="small text-muted">{description.length}/2000</span>
                      </div>
                      <textarea
                        id="action-description-input"
                        className={`form-control ${fieldErrors.description ? "is-invalid" : ""}`}
                        rows={3}
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Detailed technical or operational steps taken (1–2000 characters)..."
                        maxLength={2000}
                        required
                        data-testid="action-description-input"
                      ></textarea>
                      {fieldErrors.description && (
                        <div className="invalid-feedback">{fieldErrors.description}</div>
                      )}
                    </div>

                    {/* Result */}
                    <div className="col-12">
                      <div className="d-flex justify-content-between">
                        <label htmlFor="action-result-input" className="form-label small text-muted fw-semibold mb-1">
                          Result / Outcome <span className="text-danger">*</span>
                        </label>
                        <span className="small text-muted">{result.length}/2000</span>
                      </div>
                      <textarea
                        id="action-result-input"
                        className={`form-control ${fieldErrors.result ? "is-invalid" : ""}`}
                        rows={3}
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Observed diagnostic outcomes, telemetry verification, or test results (1–2000 characters)..."
                        maxLength={2000}
                        required
                        data-testid="action-result-input"
                      ></textarea>
                      {fieldErrors.result && (
                        <div className="invalid-feedback">{fieldErrors.result}</div>
                      )}
                    </div>

                    {/* Follow-up Required Toggle */}
                    <div className="col-12">
                      <div className="form-check form-switch p-0 d-flex align-items-center">
                        <input
                          id="follow-up-required-checkbox"
                          className="form-check-input ms-0 me-3"
                          type="checkbox"
                          role="switch"
                          checked={followUpRequired}
                          onChange={(e) => setFollowUpRequired(e.target.checked)}
                          disabled={isSubmitting}
                          data-testid="follow-up-required-checkbox"
                          style={{ cursor: "pointer", width: "2.4em", height: "1.2em" }}
                        />
                        <label
                          htmlFor="follow-up-required-checkbox"
                          className="form-check-label fw-semibold text-dark user-select-none"
                          style={{ cursor: "pointer" }}
                        >
                          Follow-up Action Required? (BR-05)
                        </label>
                      </div>
                    </div>

                    {/* Conditional Follow-up Fields (Only visible when followUpRequired === true) */}
                    {followUpRequired && (
                      <div className="col-12 p-3 rounded bg-light border border-warning" data-testid="conditional-followup-panel">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <label htmlFor="follow-up-note-input" className="form-label small fw-bold text-dark mb-0">
                            Follow-up Note <span className="text-danger">*</span>
                          </label>
                          <span className="small text-muted">{followUpNote.length}/1000</span>
                        </div>
                        <textarea
                          id="follow-up-note-input"
                          className={`form-control mb-3 ${fieldErrors.followUpNote ? "is-invalid" : ""}`}
                          rows={2}
                          value={followUpNote}
                          onChange={(e) => setFollowUpNote(e.target.value)}
                          disabled={isSubmitting}
                          placeholder="Describe the necessary follow-up work or verification steps (1–1000 characters)..."
                          maxLength={1000}
                          required
                          data-testid="follow-up-note-input"
                        ></textarea>
                        {fieldErrors.followUpNote && (
                          <div className="invalid-feedback d-block mb-2">{fieldErrors.followUpNote}</div>
                        )}

                        <div className="form-check">
                          <input
                            id="follow-up-done-checkbox"
                            className="form-check-input"
                            type="checkbox"
                            checked={followUpDone}
                            onChange={(e) => setFollowUpDone(e.target.checked)}
                            disabled={isSubmitting}
                            data-testid="follow-up-done-checkbox"
                          />
                          <label htmlFor="follow-up-done-checkbox" className="form-check-label small text-dark fw-semibold">
                            Follow-up Work Completed? (Clears resolution blocking BR-20)
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Attachment Notes */}
                    <div className="col-12">
                      <div className="d-flex justify-content-between">
                        <label htmlFor="attachment-notes-input" className="form-label small text-muted fw-semibold mb-1">
                          Attachment Notes (Optional)
                        </label>
                        <span className="small text-muted">{attachmentNotes.length}/500</span>
                      </div>
                      <input
                        id="attachment-notes-input"
                        type="text"
                        className={`form-control ${fieldErrors.attachmentNotes ? "is-invalid" : ""}`}
                        value={attachmentNotes}
                        onChange={(e) => setAttachmentNotes(e.target.value)}
                        disabled={isSubmitting}
                        placeholder="Reference attached report, spec sheet, or log file (e.g. diagnostics.pdf)..."
                        maxLength={500}
                        data-testid="attachment-notes-input"
                      />
                      {fieldErrors.attachmentNotes && (
                        <div className="invalid-feedback">{fieldErrors.attachmentNotes}</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-footer py-2 px-4 bg-light border-top d-flex justify-content-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary me-2"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    data-testid="cancel-action-btn"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-zen-primary"
                    disabled={isSubmitting}
                    data-testid="save-action-btn"
                  >
                    {isSubmitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving Action...
                      </>
                    ) : editingAction ? (
                      "Update Action Taken"
                    ) : (
                      "Save Action Taken"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
