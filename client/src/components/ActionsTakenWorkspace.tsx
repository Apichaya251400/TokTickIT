import React, { useEffect, useState, useRef } from "react";
import {
  User,
  ActionTaken,
  ActionStatus,
  fetchTicketActions,
  createTicketAction,
  updateTicketAction,
  updateTicketActionStatus,
  fetchAssignees,
} from "../api";

interface ActionsTakenWorkspaceProps {
  ticketId: string;
  currentUser: User;
  isTicketCancelled?: boolean;
  readOnly?: boolean;
  onActionUpdated?: () => void;
}

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `act-key-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function formatDateTime(dateStr?: string | null): string {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

export const ActionsTakenWorkspace: React.FC<ActionsTakenWorkspaceProps> = ({
  ticketId,
  currentUser,
  isTicketCancelled = false,
  readOnly = false,
  onActionUpdated,
}) => {
  const [actions, setActions] = useState<ActionTaken[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Assignees list for assignee dropdown
  const [assignees, setAssignees] = useState<Array<{ id: number; name: string; email: string; role: string; isActive?: boolean }>>([]);
  const [assigneesLoading, setAssigneesLoading] = useState<boolean>(false);
  const [assigneesError, setAssigneesError] = useState<string | null>(null);

  // Modal accessibility & focus management
  const editModalRef = useRef<HTMLDivElement | null>(null);
  const editDescriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const editTriggerRef = useRef<HTMLElement | null>(null);

  // Create Form State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [description, setDescription] = useState<string>("");
  const [result, setResult] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [followUpRequired, setFollowUpRequired] = useState<boolean>(false);
  const [followUpNote, setFollowUpNote] = useState<string>("");
  const [attachmentNotes, setAttachmentNotes] = useState<string>("");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitLoading, setSubmitLoading] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState<string>("");

  // Edit Action Modal State
  const [editingAction, setEditingAction] = useState<ActionTaken | null>(null);
  const [editDescription, setEditDescription] = useState<string>("");
  const [editResult, setEditResult] = useState<string>("");
  const [editAssigneeId, setEditAssigneeId] = useState<string>("");
  const [editFollowUpRequired, setEditFollowUpRequired] = useState<boolean>(false);
  const [editFollowUpNote, setEditFollowUpNote] = useState<string>("");
  const [editAttachmentNotes, setEditAttachmentNotes] = useState<string>("");
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isStaleConflict, setIsStaleConflict] = useState<boolean>(false);

  // Status Transition State
  const [transitioningActionId, setTransitioningActionId] = useState<string | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  const isStaffOrAdmin = currentUser.role === "IT_STAFF" || currentUser.role === "ADMINISTRATOR";
  const canModify = !readOnly && isStaffOrAdmin && !isTicketCancelled;

  useEffect(() => {
    loadActions();
    if (isStaffOrAdmin) {
      loadAssignees();
    }
  }, [ticketId]);

  async function loadActions() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchTicketActions(ticketId);
      // Sort chronologically createdAt ASC, tie-breaker id ASC
      const sorted = (res?.data || []).slice().sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });
      setActions(sorted);
    } catch (err: any) {
      setError(err?.data?.error?.message || err?.message || "Failed to load actions taken.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignees() {
    setAssigneesLoading(true);
    setAssigneesError(null);
    try {
      const res = await fetchAssignees();
      setAssignees(res?.assignees || []);
    } catch (err: any) {
      setAssigneesError(err?.data?.error?.message || err?.message || "Failed to load assignees.");
    } finally {
      setAssigneesLoading(false);
    }
  }

  function handleOpenCreateForm() {
    if (!idempotencyKey) {
      setIdempotencyKey(generateIdempotencyKey());
    }
    setFormErrors({});
    setSubmitError(null);
    setIsCreateOpen(true);
  }

  function handleCloseCreateForm() {
    setIsCreateOpen(false);
    setFormErrors({});
    setSubmitError(null);
  }

  function resetCreateForm() {
    setDescription("");
    setResult("");
    setAssigneeId("");
    setFollowUpRequired(false);
    setFollowUpNote("");
    setAttachmentNotes("");
    setFormErrors({});
    setSubmitError(null);
    setIdempotencyKey(generateIdempotencyKey());
    setIsCreateOpen(false);
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitLoading || !canModify) return;

    // Validate fields
    const errors: Record<string, string> = {};
    const trimmedDesc = description.trim();
    if (!trimmedDesc) {
      errors.description = "Description is required.";
    } else if (trimmedDesc.length > 2000) {
      errors.description = "Description cannot exceed 2000 characters.";
    }

    const trimmedResult = result.trim();
    if (!trimmedResult) {
      errors.result = "Result is required.";
    } else if (trimmedResult.length > 2000) {
      errors.result = "Result cannot exceed 2000 characters.";
    }

    const trimmedFollowUpNote = followUpNote.trim();
    if (followUpRequired) {
      if (!trimmedFollowUpNote) {
        errors.followUpNote = "Follow-up note is required when follow-up is needed.";
      } else if (trimmedFollowUpNote.length > 1000) {
        errors.followUpNote = "Follow-up note cannot exceed 1000 characters.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmitLoading(true);
    setSubmitError(null);

    const keyToUse = idempotencyKey || generateIdempotencyKey();
    if (!idempotencyKey) setIdempotencyKey(keyToUse);

    try {
      const parsedAssignee = assigneeId ? Number(assigneeId) : null;
      await createTicketAction(
        ticketId,
        {
          description: trimmedDesc,
          result: trimmedResult,
          assigneeId: parsedAssignee,
          followUpRequired,
          followUpNote: followUpRequired ? trimmedFollowUpNote : null,
          attachmentNotes: attachmentNotes.trim() ? attachmentNotes.trim() : null,
        },
        keyToUse
      );

      resetCreateForm();
      await loadActions();
      if (onActionUpdated) onActionUpdated();
    } catch (err: any) {
      // Form values are preserved for retry (TEST-FAIL-01)
      const errCode = err?.data?.error?.code;
      const errMsg = err?.data?.error?.message;
      if (errCode === "TICKET_TERMINAL") {
        setSubmitError("Cannot perform actions on a cancelled ticket.");
      } else if (errCode === "INVALID_ASSIGNEE" || (errMsg && errMsg.toLowerCase().includes("assignee"))) {
        const msg = errMsg || "Assignee must be an active IT Staff or Administrator user.";
        setSubmitError(msg);
        setFormErrors((prev) => ({ ...prev, assigneeId: msg }));
      } else {
        setSubmitError(errMsg || err?.message || "Failed to record action. Please check your inputs and try again.");
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  function handleOpenEdit(action: ActionTaken, triggerEl?: HTMLElement) {
    editTriggerRef.current = triggerEl || (document.activeElement as HTMLElement) || null;
    setEditingAction(action);
    setEditDescription(action.description);
    setEditResult(action.result);
    setEditAssigneeId(action.assignee?.id ? String(action.assignee.id) : "");
    setEditFollowUpRequired(action.followUpRequired);
    setEditFollowUpNote(action.followUpNote || "");
    setEditAttachmentNotes(action.attachmentNotes || "");
    setEditFormErrors({});
    setEditError(null);
    setIsStaleConflict(false);
  }

  function handleCloseEdit() {
    setEditingAction(null);
    setEditFormErrors({});
    setEditError(null);
    setIsStaleConflict(false);
  }

  useEffect(() => {
    if (!editingAction) return;

    // Auto-focus description input
    editDescriptionRef.current?.focus();
    const timer = setTimeout(() => {
      editDescriptionRef.current?.focus();
    }, 0);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleCloseEdit();
        return;
      }

      if (e.key === "Tab") {
        if (!editModalRef.current) return;
        const focusableElements = editModalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement || document.activeElement === editModalRef.current) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", handleKeyDown);
      if (editTriggerRef.current) {
        editTriggerRef.current.focus();
      }
    };
  }, [editingAction]);

  async function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingAction || editLoading || isTicketCancelled || isStaleConflict) return;

    const errors: Record<string, string> = {};
    const trimmedDesc = editDescription.trim();
    if (!trimmedDesc) {
      errors.description = "Description is required.";
    } else if (trimmedDesc.length > 2000) {
      errors.description = "Description cannot exceed 2000 characters.";
    }

    const trimmedResult = editResult.trim();
    if (!trimmedResult) {
      errors.result = "Result is required.";
    } else if (trimmedResult.length > 2000) {
      errors.result = "Result cannot exceed 2000 characters.";
    }

    const trimmedFollowUpNote = editFollowUpNote.trim();
    if (editFollowUpRequired) {
      if (!trimmedFollowUpNote) {
        errors.followUpNote = "Follow-up note is required when follow-up is needed.";
      } else if (trimmedFollowUpNote.length > 1000) {
        errors.followUpNote = "Follow-up note cannot exceed 1000 characters.";
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setEditFormErrors({});
    setEditLoading(true);
    setEditError(null);

    try {
      const parsedAssignee = editAssigneeId ? Number(editAssigneeId) : null;
      await updateTicketAction(editingAction.id, {
        expectedUpdatedAt: editingAction.updatedAt,
        description: trimmedDesc,
        result: trimmedResult,
        assigneeId: parsedAssignee,
        followUpRequired: editFollowUpRequired,
        followUpNote: editFollowUpRequired ? trimmedFollowUpNote : null,
        attachmentNotes: editAttachmentNotes.trim() ? editAttachmentNotes.trim() : null,
      });

      handleCloseEdit();
      await loadActions();
      if (onActionUpdated) onActionUpdated();
    } catch (err: any) {
      const errCode = err?.data?.error?.code;
      const errMsg = err?.data?.error?.message;
      if (errCode === "STALE_UPDATE" || err?.status === 409) {
        setIsStaleConflict(true);
        setEditError("Action content was updated concurrently by another user. Please refresh and try again.");
      } else if (errCode === "TICKET_TERMINAL") {
        setEditError("Cannot edit actions on a cancelled ticket.");
      } else if (errCode === "INVALID_ASSIGNEE" || (errMsg && errMsg.toLowerCase().includes("assignee"))) {
        setEditError("Assignee must be an active IT Staff or Administrator user.");
      } else {
        setEditError(errMsg || err?.message || "Failed to update action content.");
      }
    } finally {
      setEditLoading(false);
    }
  }

  async function handleRefreshEditAction() {
    if (!editingAction) return;
    setEditLoading(true);
    try {
      const res = await fetchTicketActions(ticketId);
      const latestActions = (res?.data || []).slice().sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });
      setActions(latestActions);
      const latestTarget = latestActions.find((a: ActionTaken) => a.id === editingAction.id);
      if (latestTarget) {
        setEditingAction(latestTarget);
        setEditDescription(latestTarget.description);
        setEditResult(latestTarget.result);
        setEditAssigneeId(latestTarget.assignee?.id ? String(latestTarget.assignee.id) : "");
        setEditFollowUpRequired(latestTarget.followUpRequired);
        setEditFollowUpNote(latestTarget.followUpNote || "");
        setEditAttachmentNotes(latestTarget.attachmentNotes || "");
        setIsStaleConflict(false);
        setEditError(null);
      } else {
        setEditError("Action was removed or is no longer accessible.");
        setIsStaleConflict(true);
      }
      if (onActionUpdated) onActionUpdated();
    } catch {
      setEditError("Failed to refresh action. Please close and re-open.");
      setIsStaleConflict(true);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleStatusTransition(action: ActionTaken, nextStatus: ActionStatus) {
    if (transitioningActionId || isTicketCancelled || !canModify) return;

    setTransitioningActionId(action.id);
    setStatusActionError(null);

    try {
      await updateTicketActionStatus(action.id, {
        status: nextStatus,
        expectedUpdatedAt: action.updatedAt,
      });
      await loadActions();
      if (onActionUpdated) onActionUpdated();
    } catch (err: any) {
      const errCode = err?.data?.error?.code;
      const errMsg = err?.data?.error?.message;
      if (errCode === "STALE_UPDATE" || err?.status === 409) {
        setStatusActionError("Action status was updated concurrently by another user. Please refresh and try again.");
      } else if (errCode === "TICKET_TERMINAL") {
        setStatusActionError("Cannot perform actions on a cancelled ticket.");
      } else {
        setStatusActionError(errMsg || err?.message || "Failed to update action status.");
      }
    } finally {
      setTransitioningActionId(null);
    }
  }

  async function handleRefreshStatusConflict() {
    try {
      const res = await fetchTicketActions(ticketId);
      const sorted = (res?.data || []).slice().sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        if (timeA !== timeB) return timeA - timeB;
        return a.id.localeCompare(b.id);
      });
      setActions(sorted);
      setStatusActionError(null);
      if (onActionUpdated) onActionUpdated();
    } catch {
      setStatusActionError("Failed to refresh actions taken. Please try again.");
    }
  }

  function renderStatusBadge(status: ActionStatus) {
    switch (status) {
      case "PENDING":
        return <span className="badge bg-warning text-dark">PENDING</span>;
      case "IN_PROGRESS":
        return <span className="badge bg-primary text-white">IN_PROGRESS</span>;
      case "COMPLETED":
        return <span className="badge bg-success text-white">COMPLETED</span>;
      case "CANCELLED":
        return <span className="badge bg-light text-muted border">CANCELLED</span>;
      default:
        return <span className="badge bg-secondary text-white">{status}</span>;
    }
  }

  return (
    <div className="card shadow-sm mb-4 border" data-testid="actions-taken-workspace">
      <style>{`
        [data-testid="actions-taken-workspace"] button:focus,
        [data-testid="actions-taken-workspace"] button:focus-visible,
        [data-testid="actions-taken-workspace"] input:focus,
        [data-testid="actions-taken-workspace"] input:focus-visible,
        [data-testid="actions-taken-workspace"] select:focus,
        [data-testid="actions-taken-workspace"] select:focus-visible,
        [data-testid="actions-taken-workspace"] textarea:focus,
        [data-testid="actions-taken-workspace"] textarea:focus-visible,
        [data-testid="actions-taken-workspace"] .btn:focus,
        [data-testid="actions-taken-workspace"] .btn:focus-visible,
        [data-testid="actions-taken-workspace"] .form-control:focus,
        [data-testid="actions-taken-workspace"] .form-select:focus,
        [data-testid="actions-taken-workspace"] .form-check-input:focus,
        [data-testid="edit-action-modal"] button:focus,
        [data-testid="edit-action-modal"] button:focus-visible,
        [data-testid="edit-action-modal"] input:focus,
        [data-testid="edit-action-modal"] input:focus-visible,
        [data-testid="edit-action-modal"] select:focus,
        [data-testid="edit-action-modal"] select:focus-visible,
        [data-testid="edit-action-modal"] textarea:focus,
        [data-testid="edit-action-modal"] textarea:focus-visible,
        [data-testid="edit-action-modal"] .btn:focus,
        [data-testid="edit-action-modal"] .btn:focus-visible,
        [data-testid="edit-action-modal"] .form-control:focus,
        [data-testid="edit-action-modal"] .form-select:focus {
          outline: 2px solid #198754 !important;
          outline-offset: 2px !important;
          box-shadow: 0 0 0 2px rgba(25, 135, 84, 0.25) !important;
        }
      `}</style>
      {/* Workspace Header */}
      <div className="card-header bg-light d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <h3 className="h6 fw-bold mb-0 text-success" style={{ color: "#198754" }}>
            Actions Taken Work Log
          </h3>
          <span className="badge bg-secondary" data-testid="actions-count-badge">
            {actions.length} {actions.length === 1 ? "action recorded" : "actions recorded"}
          </span>
          {readOnly && (
            <span className="badge bg-secondary-subtle text-secondary border" data-testid="actions-readonly-badge">
              Read-Only (Requester)
            </span>
          )}
        </div>

        {canModify && (
          <button
            type="button"
            className="btn btn-sm btn-success fw-semibold"
            onClick={handleOpenCreateForm}
            data-testid="record-action-btn"
            style={{ backgroundColor: "#198754", borderColor: "#198754" }}
          >
            + Record Action
          </button>
        )}
      </div>

      <div className="card-body p-3">
        {statusActionError && (
          <div className="alert alert-danger py-2 small d-flex justify-content-between align-items-center mb-3" data-testid="status-action-error">
            <span>{statusActionError}</span>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm py-0 ms-2"
              data-testid="status-error-refresh-btn"
              onClick={handleRefreshStatusConflict}
            >
              Refresh
            </button>
          </div>
        )}

        {/* Create Action Form (Collapsible Card) */}
        {isCreateOpen && canModify && (
          <div className="card mb-4 border-success bg-light shadow-sm" data-testid="create-action-card">
            <div className="card-header bg-light border-success fw-bold text-success d-flex justify-content-between align-items-center py-2">
              <span>Record New Action Taken</span>
              <button
                type="button"
                className="btn-close"
                aria-label="Close form"
                onClick={handleCloseCreateForm}
              />
            </div>
            <div className="card-body">
              {submitError && (
                <div className="alert alert-danger py-2 small mb-3" data-testid="create-action-error">
                  {submitError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} noValidate aria-label="Create Action Form" data-testid="create-action-form">
                {/* Performed By (Auto Identity Capsule) */}
                <div className="mb-3">
                  <label htmlFor="create-action-performer" className="form-label small fw-semibold text-muted">Performed By (Authenticated Session)</label>
                  <div
                    id="create-action-performer"
                    className="p-2 border rounded bg-light d-flex align-items-center gap-2"
                    data-testid="performed-by-capsule"
                  >
                    <span className="badge bg-success">Active Session</span>
                    <span className="fw-bold small">{currentUser.name}</span>
                    <span className="badge bg-secondary">{currentUser.role}</span>
                  </div>
                  <span className="small text-muted fst-italic">
                    Actor identity is derived automatically from your authenticated session.
                  </span>
                </div>

                {/* Description */}
                <div className="mb-3">
                  <label htmlFor="action-description" className="form-label small fw-semibold">
                    Action Description <span className="text-danger">*</span> (1–2000 chars)
                  </label>
                  <textarea
                    id="action-description"
                    rows={3}
                    className={`form-control form-control-sm ${formErrors.description ? "is-invalid" : ""}`}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the action taken..."
                    data-testid="action-description-input"
                  />
                  {formErrors.description && (
                    <div className="invalid-feedback d-block small">{formErrors.description}</div>
                  )}
                </div>

                {/* Result */}
                <div className="mb-3">
                  <label htmlFor="action-result" className="form-label small fw-semibold">
                    Action Result <span className="text-danger">*</span> (1–2000 chars)
                  </label>
                  <textarea
                    id="action-result"
                    rows={2}
                    className={`form-control form-control-sm ${formErrors.result ? "is-invalid" : ""}`}
                    value={result}
                    onChange={(e) => setResult(e.target.value)}
                    placeholder="Describe the outcome or diagnostic findings..."
                    data-testid="action-result-input"
                  />
                  {formErrors.result && (
                    <div className="invalid-feedback d-block small">{formErrors.result}</div>
                  )}
                </div>

                {/* Assignee Selector */}
                <div className="mb-3">
                  <label htmlFor="action-assignee" className="form-label small fw-semibold">
                    Action Assignee (Optional)
                  </label>
                  {assigneesError && (
                    <div className="alert alert-danger py-2 small d-flex justify-content-between align-items-center mb-2" role="alert" data-testid="assignee-load-error">
                      <span>{assigneesError}</span>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm py-0"
                        onClick={loadAssignees}
                        disabled={assigneesLoading}
                        data-testid="assignee-retry-btn"
                      >
                        {assigneesLoading ? "Retrying…" : "Retry"}
                      </button>
                    </div>
                  )}
                  <select
                    id="action-assignee"
                    className={`form-select form-select-sm ${formErrors.assigneeId ? "is-invalid" : ""}`}
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    data-testid="action-assignee-select"
                  >
                    <option value="">Unassigned</option>
                    {assignees
                      .filter((a) => a.isActive !== false && a.role !== "REQUESTER")
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.role})
                        </option>
                      ))}
                  </select>
                  {formErrors.assigneeId && (
                    <div className="invalid-feedback d-block small" data-testid="assignee-error">
                      {formErrors.assigneeId}
                    </div>
                  )}
                </div>

                {/* Follow-Up Required Switch */}
                <div className="form-check form-switch mb-3">
                  <input
                    id="action-follow-up-switch"
                    type="checkbox"
                    className="form-check-input"
                    checked={followUpRequired}
                    onChange={(e) => setFollowUpRequired(e.target.checked)}
                    data-testid="follow-up-switch"
                  />
                  <label htmlFor="action-follow-up-switch" className="form-check-label small fw-semibold">
                    Follow-up needed
                  </label>
                </div>

                {/* Follow-up Note Box (Conditional) */}
                {followUpRequired && (
                  <div className="mb-3 p-3 border border-warning rounded bg-white" data-testid="follow-up-note-container">
                    <label htmlFor="action-follow-up-note" className="form-label small fw-semibold text-warning-emphasis">
                      Follow-up Note <span className="text-danger">*</span> (1–1000 chars)
                    </label>
                    <textarea
                      id="action-follow-up-note"
                      rows={2}
                      className={`form-control form-control-sm ${formErrors.followUpNote ? "is-invalid" : ""}`}
                      value={followUpNote}
                      onChange={(e) => setFollowUpNote(e.target.value)}
                      placeholder="Specify what follow-up action is required..."
                      data-testid="follow-up-note-input"
                    />
                    {formErrors.followUpNote && (
                      <div className="invalid-feedback d-block small">{formErrors.followUpNote}</div>
                    )}
                  </div>
                )}

                {/* Attachment Notes */}
                <div className="mb-3">
                  <label htmlFor="action-attachment-notes" className="form-label small fw-semibold">
                    Attachment Notes (Optional)
                  </label>
                  <input
                    id="action-attachment-notes"
                    type="text"
                    className="form-control form-control-sm"
                    value={attachmentNotes}
                    onChange={(e) => setAttachmentNotes(e.target.value)}
                    placeholder="e.g. See diagnostic_log.png attached"
                    data-testid="attachment-notes-input"
                  />
                </div>

                {/* Action Buttons */}
                <div className="d-flex justify-content-end gap-2 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleCloseCreateForm}
                    disabled={submitLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm fw-semibold"
                    disabled={submitLoading}
                    data-testid="save-action-btn"
                    style={{ backgroundColor: "#198754", borderColor: "#198754" }}
                  >
                    {submitLoading ? "Saving…" : "Save Action"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4 text-muted small" data-testid="actions-loading">
            <div className="spinner-border spinner-border-sm text-success me-2" role="status" />
            Loading actions taken…
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="alert alert-danger py-2 small d-flex justify-content-between align-items-center" role="alert">
            <span>{error}</span>
            <button
              type="button"
              className="btn btn-outline-danger btn-sm py-0"
              onClick={loadActions}
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && actions.length === 0 && (
          <div className="text-center py-4 bg-light rounded border border-dashed" data-testid="actions-empty-state">
            <p className="text-muted small mb-0">No actions recorded for this ticket yet.</p>
          </div>
        )}

        {/* Actions Feed List (Chronological createdAt ASC) */}
        {!loading && !error && actions.length > 0 && (
          <div className="d-flex flex-column gap-3" data-testid="actions-list">
            {actions.map((act) => {
              const isPending = act.status === "PENDING";
              const isInProgress = act.status === "IN_PROGRESS";
              const isTerminal = act.status === "COMPLETED" || act.status === "CANCELLED";

              return (
                <div
                  key={act.id}
                  className="card border shadow-sm"
                  data-testid={`action-card-${act.id}`}
                >
                  <div className="card-header bg-light d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
                    <div className="d-flex flex-wrap align-items-center gap-2 small">
                      <span className="text-muted fw-semibold" data-testid="action-date-time">
                        {formatDateTime(act.createdAt)}
                      </span>
                      <span className="badge bg-secondary" data-testid="action-performer">
                        By: {act.performedBy?.name || "Unknown"} ({act.performedBy?.role})
                      </span>
                      {act.assignee ? (
                        <span className="badge bg-info text-dark" data-testid="action-assignee">
                          Assignee: {act.assignee.name}
                        </span>
                      ) : (
                        <span className="badge bg-light text-muted border">Unassigned</span>
                      )}
                    </div>
                    <div>{renderStatusBadge(act.status)}</div>
                  </div>

                  <div className="card-body p-3">
                    {/* Description */}
                    <div className="mb-2">
                      <label className="form-label small fw-bold text-muted mb-0">Description</label>
                      <div className="small text-dark" style={{ whiteSpace: "pre-wrap" }} data-testid="action-description">
                        {act.description}
                      </div>
                    </div>

                    {/* Result */}
                    <div className="mb-2">
                      <label className="form-label small fw-bold text-muted mb-0">Result</label>
                      <div className="small text-dark" style={{ whiteSpace: "pre-wrap" }} data-testid="action-result">
                        {act.result}
                      </div>
                    </div>

                    {/* Follow-up Note */}
                    {act.followUpRequired && act.followUpNote && (
                      <div
                        className="alert alert-warning border-warning p-2 small mb-2 d-flex align-items-start gap-2"
                        data-testid="action-follow-up-note"
                      >
                        <span className="badge bg-warning text-dark">Follow-Up</span>
                        <div style={{ whiteSpace: "pre-wrap" }}>{act.followUpNote}</div>
                      </div>
                    )}

                    {/* Attachment Notes */}
                    {act.attachmentNotes && (
                      <div className="text-muted small fst-italic mb-2" data-testid="action-attachment-notes">
                        📎 Notes: {act.attachmentNotes}
                      </div>
                    )}

                    {/* Controls (IT Staff & Admin only; hidden on cancelled tickets) */}
                    {canModify && (
                      <div className="d-flex flex-wrap justify-content-end align-items-center gap-2 pt-2 border-top mt-2">
                        {/* Status Transitions per Section 8.2 */}
                        {isPending && (
                          <>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleStatusTransition(act, "IN_PROGRESS")}
                              disabled={transitioningActionId === act.id}
                              data-testid={`action-start-work-btn-${act.id}`}
                            >
                              Start Work
                            </button>
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => handleStatusTransition(act, "COMPLETED")}
                              disabled={transitioningActionId === act.id}
                              data-testid={`action-complete-btn-${act.id}`}
                              style={{ backgroundColor: "#198754", borderColor: "#198754" }}
                            >
                              Complete Action
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleStatusTransition(act, "CANCELLED")}
                              disabled={transitioningActionId === act.id}
                              data-testid={`action-cancel-btn-${act.id}`}
                            >
                              Cancel Action
                            </button>
                          </>
                        )}

                        {isInProgress && (
                          <>
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() => handleStatusTransition(act, "COMPLETED")}
                              disabled={transitioningActionId === act.id}
                              data-testid={`action-complete-btn-${act.id}`}
                              style={{ backgroundColor: "#198754", borderColor: "#198754" }}
                            >
                              Complete Action
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleStatusTransition(act, "CANCELLED")}
                              disabled={transitioningActionId === act.id}
                              data-testid={`action-cancel-btn-${act.id}`}
                            >
                              Cancel Action
                            </button>
                          </>
                        )}

                        {/* Terminal states have no status transition buttons */}
                        {isTerminal && (
                          <span className="small text-muted fst-italic me-auto">
                            Terminal status ({act.status}). Status cannot be changed.
                          </span>
                        )}

                        {/* Content Edit Button (Permitted even for COMPLETED/CANCELLED actions unless ticket is cancelled) */}
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm"
                          onClick={(e) => handleOpenEdit(act, e.currentTarget)}
                          data-testid={`action-edit-btn-${act.id}`}
                        >
                          Edit Content
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Cancelled Ticket Notice */}
        {isTicketCancelled && (
          <div className="alert alert-light border text-muted small mt-2 mb-0" data-testid="ticket-cancelled-banner">
            Parent Ticket is CANCELLED. All action creation, editing, and status transitions are locked.
          </div>
        )}
      </div>

      {/* Edit Action Modal */}
      {editingAction && (
        <div
          ref={editModalRef}
          className="modal d-block"
          tabIndex={-1}
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-action-modal-title"
          data-testid="edit-action-modal"
        >
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-light">
                <h5 id="edit-action-modal-title" className="modal-title h6 fw-bold">Edit Action Taken Content</h5>
                <button
                  type="button"
                  className="btn-close"
                  aria-label="Close"
                  onClick={handleCloseEdit}
                />
              </div>

              <form onSubmit={handleEditSubmit} noValidate>
                <div className="modal-body">
                  {editError && (
                    <div className="alert alert-danger py-2 small mb-3 d-flex justify-content-between align-items-center" data-testid="edit-action-error">
                      <span>{editError}</span>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm py-0 ms-2"
                        data-testid="edit-refresh-btn"
                        onClick={handleRefreshEditAction}
                      >
                        Refresh
                      </button>
                    </div>
                  )}

                  {/* Description */}
                  <div className="mb-3">
                    <label htmlFor="edit-action-description" className="form-label small fw-semibold">
                      Action Description <span className="text-danger">*</span>
                    </label>
                    <textarea
                      ref={editDescriptionRef}
                      id="edit-action-description"
                      rows={3}
                      className={`form-control form-control-sm ${editFormErrors.description ? "is-invalid" : ""}`}
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      data-testid="edit-description-input"
                    />
                    {editFormErrors.description && (
                      <div className="invalid-feedback d-block small">{editFormErrors.description}</div>
                    )}
                  </div>

                  {/* Result */}
                  <div className="mb-3">
                    <label htmlFor="edit-action-result" className="form-label small fw-semibold">
                      Action Result <span className="text-danger">*</span>
                    </label>
                    <textarea
                      id="edit-action-result"
                      rows={2}
                      className={`form-control form-control-sm ${editFormErrors.result ? "is-invalid" : ""}`}
                      value={editResult}
                      onChange={(e) => setEditResult(e.target.value)}
                      data-testid="edit-result-input"
                    />
                    {editFormErrors.result && (
                      <div className="invalid-feedback d-block small">{editFormErrors.result}</div>
                    )}
                  </div>

                  {/* Assignee Selector */}
                  <div className="mb-3">
                    <label htmlFor="edit-action-assignee" className="form-label small fw-semibold">
                      Action Assignee
                    </label>
                    {assigneesError && (
                      <div className="alert alert-danger py-2 small d-flex justify-content-between align-items-center mb-2" role="alert" data-testid="edit-assignee-load-error">
                        <span>{assigneesError}</span>
                        <button
                          type="button"
                          className="btn btn-outline-danger btn-sm py-0"
                          onClick={loadAssignees}
                          disabled={assigneesLoading}
                          data-testid="edit-assignee-retry-btn"
                        >
                          {assigneesLoading ? "Retrying…" : "Retry"}
                        </button>
                      </div>
                    )}
                    <select
                      id="edit-action-assignee"
                      className="form-select form-select-sm"
                      value={editAssigneeId}
                      onChange={(e) => setEditAssigneeId(e.target.value)}
                      data-testid="edit-assignee-select"
                    >
                      <option value="">Unassigned</option>
                      {assignees
                        .filter((a) => a.isActive !== false && a.role !== "REQUESTER")
                        .map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.role})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Follow-Up Required Switch */}
                  <div className="form-check form-switch mb-3">
                    <input
                      id="edit-follow-up-switch"
                      type="checkbox"
                      className="form-check-input"
                      checked={editFollowUpRequired}
                      onChange={(e) => setEditFollowUpRequired(e.target.checked)}
                      data-testid="edit-follow-up-switch"
                    />
                    <label htmlFor="edit-follow-up-switch" className="form-check-label small fw-semibold">
                      Follow-up needed
                    </label>
                  </div>

                  {/* Follow-up Note Box (Conditional) */}
                  {editFollowUpRequired && (
                    <div className="mb-3 p-3 border border-warning rounded bg-white">
                      <label htmlFor="edit-follow-up-note" className="form-label small fw-semibold text-warning-emphasis">
                        Follow-up Note <span className="text-danger">*</span> (1–1000 chars)
                      </label>
                      <textarea
                        id="edit-follow-up-note"
                        rows={2}
                        className={`form-control form-control-sm ${editFormErrors.followUpNote ? "is-invalid" : ""}`}
                        value={editFollowUpNote}
                        onChange={(e) => setEditFollowUpNote(e.target.value)}
                        data-testid="edit-follow-up-note-input"
                      />
                      {editFormErrors.followUpNote && (
                        <div className="invalid-feedback d-block small">{editFormErrors.followUpNote}</div>
                      )}
                    </div>
                  )}

                  {/* Attachment Notes */}
                  <div className="mb-3">
                    <label htmlFor="edit-attachment-notes" className="form-label small fw-semibold">
                      Attachment Notes
                    </label>
                    <input
                      id="edit-attachment-notes"
                      type="text"
                      className="form-control form-control-sm"
                      value={editAttachmentNotes}
                      onChange={(e) => setEditAttachmentNotes(e.target.value)}
                      data-testid="edit-attachment-notes-input"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary btn-sm"
                    onClick={handleCloseEdit}
                    disabled={editLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-success btn-sm fw-semibold"
                    disabled={editLoading || isStaleConflict}
                    data-testid="save-edit-action-btn"
                    style={{ backgroundColor: "#198754", borderColor: "#198754" }}
                  >
                    {editLoading ? "Saving…" : "Save Changes"}
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
