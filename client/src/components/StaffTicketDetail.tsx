import React, { useEffect, useState } from "react";
import {
  User,
  fetchTicketById,
  claimTicketApi,
  assignTicketApi,
  updateItPriorityApi,
  updateTicketStatusApi,
  fetchTicketComments,
  postTicketComment,
  fetchInternalNotes,
  postInternalNote,
  fetchAssignees,
  PublicComment,
  InternalNote,
  downloadAttachment,
} from "../api";

interface StaffTicketDetailProps {
  ticketId: string;
  currentUser: User;
  onBack: () => void;
  onTicketUpdated?: () => void;
}

const PERMITTED_STATUS_TRANSITIONS: Record<string, string[]> = {
  NEW: ["OPEN", "CANCELLED"],
  OPEN: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["WAITING_FOR_REQUESTER", "RESOLVED", "CANCELLED"],
  WAITING_FOR_REQUESTER: ["IN_PROGRESS", "RESOLVED", "CANCELLED"],
  RESOLVED: ["CLOSED", "REOPENED"],
  CLOSED: ["REOPENED"],
  REOPENED: ["IN_PROGRESS", "CANCELLED"],
  CANCELLED: [],
};

export const StaffTicketDetail: React.FC<StaffTicketDetailProps> = ({
  ticketId,
  currentUser,
  onBack,
  onTicketUpdated,
}) => {
  const [ticket, setTicket] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [assignees, setAssignees] = useState<Array<{ id: number; name: string; email: string; role: string }>>([]);
  const [selectedAssigneeId, setSelectedAssigneeId] = useState<string>("");
  const [selectedItPriority, setSelectedItPriority] = useState<string>("");

  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Comments state
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [commentInput, setCommentInput] = useState<string>("");
  const [commentSubmitting, setCommentSubmitting] = useState<boolean>(false);
  const [commentError, setCommentError] = useState<string | null>(null);

  // Internal Notes state
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [notesLoading, setNotesLoading] = useState<boolean>(false);
  const [noteInput, setNoteInput] = useState<string>("");
  const [noteSubmitting, setNoteSubmitting] = useState<boolean>(false);
  const [noteError, setNoteError] = useState<string | null>(null);

  const [activeCommTab, setActiveCommTab] = useState<"comments" | "notes">("comments");

  const isItStaff = currentUser.role === "IT_STAFF";
  const isAdmin = currentUser.role === "ADMINISTRATOR";

  useEffect(() => {
    loadTicketData();
    if (isItStaff || isAdmin) {
      loadAssignees();
      loadNotes();
    }
    loadComments();
  }, [ticketId]);

  async function loadTicketData() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicketById(ticketId);
      setTicket(data);
      setSelectedItPriority(data.itPriority || data.requestedPriority || "MEDIUM");
      if (data.owner) {
        setSelectedAssigneeId(String(data.owner.id));
      } else {
        setSelectedAssigneeId("");
      }
    } catch (err: any) {
      setError(err?.data?.error?.message || err?.message || "Failed to load ticket details.");
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignees() {
    try {
      const res = await fetchAssignees();
      setAssignees(res.assignees || []);
    } catch (err) {
      // Ignored non-critically
    }
  }

  async function loadComments() {
    setCommentsLoading(true);
    try {
      const res = await fetchTicketComments(ticketId);
      setComments(res.comments || []);
    } catch (err) {
      // Ignored
    } finally {
      setCommentsLoading(false);
    }
  }

  async function loadNotes() {
    setNotesLoading(true);
    try {
      const res = await fetchInternalNotes(ticketId);
      setNotes(res.notes || []);
    } catch (err) {
      // Ignored if forbidden
    } finally {
      setNotesLoading(false);
    }
  }

  async function handleClaim() {
    if (actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await claimTicketApi(ticketId);
      setActionSuccess(res.message || "Ticket claimed successfully.");
      await loadTicketData();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      setActionError(err?.data?.message || err?.data?.error || "Failed to claim ticket.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssign() {
    if (!selectedAssigneeId || actionLoading) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await assignTicketApi(ticketId, Number(selectedAssigneeId));
      setActionSuccess(res.message || "Ticket owner updated successfully.");
      await loadTicketData();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      setActionError(err?.data?.message || err?.data?.error?.message || "Failed to reassign ticket.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleUpdateItPriority() {
    if (!selectedItPriority || actionLoading || !isItStaff) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await updateItPriorityApi(ticketId, selectedItPriority);
      setActionSuccess(res.message || "IT priority updated successfully.");
      await loadTicketData();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      setActionError(err?.data?.message || err?.data?.error?.message || "Failed to update IT priority.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleStatusTransition(targetStatus: string) {
    if (actionLoading || !isItStaff) return;
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await updateTicketStatusApi(ticketId, targetStatus);
      setActionSuccess(res.message || `Status updated to ${targetStatus}.`);
      await loadTicketData();
      if (onTicketUpdated) onTicketUpdated();
    } catch (err: any) {
      setActionError(err?.data?.message || err?.data?.error?.message || "Failed to update status.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = commentInput.trim();
    if (!trimmed || commentSubmitting) {
      setCommentError("Comment content cannot be empty or whitespace-only.");
      return;
    }
    setCommentSubmitting(true);
    setCommentError(null);
    try {
      await postTicketComment(ticketId, trimmed);
      setCommentInput("");
      await loadComments();
    } catch (err: any) {
      setCommentError(err?.data?.message || err?.data?.error?.message || "Failed to post comment.");
    } finally {
      setCommentSubmitting(false);
    }
  }

  async function handlePostNote(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = noteInput.trim();
    if (!trimmed || noteSubmitting) {
      setNoteError("Note content cannot be empty or whitespace-only.");
      return;
    }
    setNoteSubmitting(true);
    setNoteError(null);
    try {
      await postInternalNote(ticketId, trimmed);
      setNoteInput("");
      await loadNotes();
    } catch (err: any) {
      setNoteError(err?.data?.message || err?.data?.error?.message || "Failed to post internal note.");
    } finally {
      setNoteSubmitting(false);
    }
  }

  async function handleDownloadFile(att: any) {
    if (att.isRemoved || att.removedAt) return;
    try {
      const res = await downloadAttachment(att.id);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", att.fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Handled visually
    }
  }

  function renderPriorityBadge(priority: string) {
    let bgClass = "bg-secondary";
    if (priority === "URGENT") bgClass = "bg-danger text-white";
    else if (priority === "HIGH") bgClass = "bg-warning text-dark";
    else if (priority === "MEDIUM") bgClass = "bg-success text-white";
    else if (priority === "LOW") bgClass = "bg-secondary text-white";
    return <span className={`badge ${bgClass}`}>{priority}</span>;
  }

  function renderStatusBadge(status: string) {
    let bgClass = "bg-primary";
    if (status === "NEW") bgClass = "bg-info text-dark";
    else if (status === "OPEN") bgClass = "bg-primary text-white";
    else if (status === "IN_PROGRESS") bgClass = "bg-warning text-dark";
    else if (status === "WAITING_FOR_REQUESTER") bgClass = "bg-secondary text-white";
    else if (status === "RESOLVED") bgClass = "bg-success text-white";
    else if (status === "CLOSED") bgClass = "bg-dark text-white";
    else if (status === "REOPENED") bgClass = "bg-danger text-white";
    else if (status === "CANCELLED") bgClass = "bg-danger text-white";
    return <span className={`badge ${bgClass}`}>{status}</span>;
  }

  function formatDateTime(isoString?: string) {
    if (!isoString) return "N/A";
    return new Date(isoString).toLocaleString();
  }

  if (loading) {
    return (
      <div className="card shadow-sm p-5 text-center my-4" data-testid="staff-ticket-detail">
        <div className="spinner-border text-success mx-auto mb-3" role="status">
          <span className="visually-hidden">Loading ticket details…</span>
        </div>
        <p className="text-muted mb-0">Loading ticket details…</p>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="card shadow-sm p-4 text-center my-4" data-testid="staff-ticket-detail">
        <div className="alert alert-danger mb-3" role="alert">
          {error || "Ticket not found"}
        </div>
        <div>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={onBack}
            data-testid="back-to-queue-btn"
          >
            Back to Queue
          </button>
        </div>
      </div>
    );
  }

  const permittedTransitions = PERMITTED_STATUS_TRANSITIONS[ticket.currentStatus] || [];
  const isOwner = ticket.owner?.id === currentUser.id;

  return (
    <div className="staff-ticket-detail my-3" data-testid="staff-ticket-detail">
      {/* Top Header Bar */}
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-3 mb-4">
        <div>
          <div className="d-flex align-items-center gap-2">
            <h1 className="h4 fw-bold mb-0 text-success">{ticket.ticketNumber}</h1>
            {renderStatusBadge(ticket.currentStatus)}
            {renderPriorityBadge(ticket.itPriority || ticket.requestedPriority)}
          </div>
          <p className="text-muted small mb-0 mt-1">
            Created: {formatDateTime(ticket.createdAt)} | Last Updated: {formatDateTime(ticket.updatedAt)}
          </p>
        </div>
        <button
          type="button"
          className="btn btn-outline-secondary btn-sm fw-semibold"
          onClick={onBack}
          data-testid="back-to-queue-btn"
          style={{ outlineColor: "#0B7A46" }}
        >
          ← Back to Queue
        </button>
      </div>

      {/* Alert Banners */}
      {actionSuccess && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          {actionSuccess}
          <button type="button" className="btn-close" onClick={() => setActionSuccess(null)} aria-label="Close"></button>
        </div>
      )}

      {actionError && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          {actionError}
          <button type="button" className="btn-close" onClick={() => setActionError(null)} aria-label="Close"></button>
        </div>
      )}

      {/* Informational Signalling Banners */}
      {ticket.requesterResolvedIndicatedAt && (
        <div className="alert alert-info border-info d-flex align-items-center gap-2 mb-4">
          <span className="fw-bold">Requester Signal:</span>
          <span>
            Requester indicated the problem appears resolved on {formatDateTime(ticket.requesterResolvedIndicatedAt)}. Please review for formal resolution.
          </span>
        </div>
      )}

      {ticket.requesterReopenRequestedAt && (
        <div className="alert alert-warning border-warning d-flex align-items-center gap-2 mb-4">
          <span className="fw-bold">Requester Signal:</span>
          <span>
            Requester requested ticket reopening on {formatDateTime(ticket.requesterReopenRequestedAt)}. Please review.
          </span>
        </div>
      )}

      {/* Metadata & Controls Card */}
      <div className="card shadow-sm mb-4 border">
        <div className="card-header bg-light fw-semibold d-flex justify-content-between align-items-center">
          <span>Ticket Overview & Operational Controls</span>
          {isAdmin && (
            <span className="badge bg-purple text-white" style={{ backgroundColor: "#7C3AED" }}>
              Administrator Mode (Read-Only Status & Priority)
            </span>
          )}
        </div>
        <div className="card-body">
          <div className="row g-3">
            {/* Requester Info */}
            <div className="col-12 col-md-4">
              <label className="form-label small text-muted fw-semibold">Requester</label>
              <input
                type="text"
                className="form-control form-control-sm bg-light"
                value={`${ticket.requester?.name || "N/A"} (${ticket.requester?.email || ""})`}
                readOnly
              />
            </div>

            {/* Category & System */}
            <div className="col-6 col-md-4">
              <label className="form-label small text-muted fw-semibold">Category</label>
              <input type="text" className="form-control form-control-sm bg-light" value={ticket.category?.name || "N/A"} readOnly />
            </div>
            <div className="col-6 col-md-4">
              <label className="form-label small text-muted fw-semibold">Related System</label>
              <input type="text" className="form-control form-control-sm bg-light" value={ticket.relatedSystem?.name || "N/A"} readOnly />
            </div>

            {/* Requested Priority */}
            <div className="col-6 col-md-4">
              <label className="form-label small text-muted fw-semibold">Requested Priority</label>
              <div>{renderPriorityBadge(ticket.requestedPriority)}</div>
            </div>

            {/* IT Priority Dropdown */}
            <div className="col-6 col-md-4">
              <label htmlFor="itPrioritySelect" className="form-label small text-muted fw-semibold">IT Priority</label>
              <div className="d-flex gap-2">
                <select
                  id="itPrioritySelect"
                  aria-label="IT Priority"
                  className="form-select form-select-sm"
                  value={selectedItPriority}
                  onChange={(e) => setSelectedItPriority(e.target.value)}
                  disabled={!isItStaff || actionLoading}
                  data-testid="it-priority-select"
                  style={{ outlineColor: "#0B7A46" }}
                >
                  <option value="LOW">LOW</option>
                  <option value="MEDIUM">MEDIUM</option>
                  <option value="HIGH">HIGH</option>
                  <option value="URGENT">URGENT</option>
                </select>
                {isItStaff && (
                  <button
                    type="button"
                    className="btn btn-outline-success btn-sm"
                    onClick={handleUpdateItPriority}
                    disabled={actionLoading || selectedItPriority === ticket.itPriority}
                    data-testid="update-priority-btn"
                    style={{ borderColor: "#006B3C", color: "#006B3C" }}
                  >
                    Save
                  </button>
                )}
              </div>
            </div>

            {/* Current Owner & Claim / Reassign Controls */}
            <div className="col-12 col-md-4">
              <label htmlFor="reassignSelect" className="form-label small text-muted fw-semibold">
                Owner: {ticket.owner ? <strong>{ticket.owner.name}</strong> : <span className="text-danger italic">Unassigned</span>}
              </label>
              <div className="d-flex gap-2">
                {!isOwner && (
                  <button
                    type="button"
                    className="btn btn-success btn-sm px-3"
                    onClick={handleClaim}
                    disabled={actionLoading}
                    data-testid="claim-ticket-btn"
                    style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                  >
                    {actionLoading ? "Claiming…" : "Claim"}
                  </button>
                )}
                <select
                  id="reassignSelect"
                  aria-label="Reassign owner"
                  className="form-select form-select-sm"
                  value={selectedAssigneeId}
                  onChange={(e) => setSelectedAssigneeId(e.target.value)}
                  disabled={actionLoading}
                  data-testid="reassign-owner-select"
                  style={{ outlineColor: "#0B7A46" }}
                >
                  <option value="">Select Assignee…</option>
                  {assignees.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn btn-outline-secondary btn-sm"
                  onClick={handleAssign}
                  disabled={!selectedAssigneeId || actionLoading || String(ticket.owner?.id) === selectedAssigneeId}
                  data-testid="assign-owner-btn"
                >
                  Assign
                </button>
              </div>
            </div>
          </div>

          {/* Status Transitions Action Bar (IT Staff Only) */}
          <div className="border-top pt-3 mt-3">
            <label className="form-label small text-muted fw-semibold d-block mb-2">
              Status Transitions (Current: {ticket.currentStatus})
            </label>
            {isItStaff ? (
              permittedTransitions.length > 0 ? (
                <div className="d-flex flex-wrap gap-2">
                  {permittedTransitions.map((nextStatus) => (
                    <button
                      key={nextStatus}
                      type="button"
                      className={`btn btn-sm ${
                        nextStatus === "CANCELLED"
                          ? "btn-outline-danger"
                          : nextStatus === "RESOLVED"
                          ? "btn-success"
                          : "btn-outline-primary"
                      }`}
                      onClick={() => handleStatusTransition(nextStatus)}
                      disabled={actionLoading}
                      data-testid={`status-transition-btn-${nextStatus}`}
                    >
                      {actionLoading ? "Updating…" : `Transition to ${nextStatus}`}
                    </button>
                  ))}
                </div>
              ) : (
                <span className="small text-muted italic">No further status transitions available for terminal state.</span>
              )
            ) : (
              <span className="small text-muted italic">
                Status transitions are reserved for IT Staff members according to the authorization matrix.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Summary & Description Card */}
      <div className="card shadow-sm mb-4 border">
        <div className="card-header bg-light fw-semibold">Summary & Description</div>
        <div className="card-body">
          <div className="mb-3">
            <label className="form-label fw-bold small text-muted">Summary</label>
            <div className="p-2 border rounded bg-light fw-semibold">{ticket.summary}</div>
          </div>
          <div>
            <label className="form-label fw-bold small text-muted">Description</label>
            <div className="p-3 border rounded bg-light" style={{ whiteSpace: "pre-wrap" }}>
              {ticket.description}
            </div>
          </div>
        </div>
      </div>

      {/* Attachments Section */}
      <div className="card shadow-sm mb-4 border">
        <div className="card-header bg-light fw-semibold">Attachments</div>
        <div className="card-body">
          {ticket.attachments && ticket.attachments.length > 0 ? (
            <ul className="list-group">
              {ticket.attachments.map((att: any) => (
                <li key={att.id} className="list-group-item d-flex align-items-center justify-content-between p-2 small">
                  <div>
                    <span className="fw-bold">{att.fileName}</span> ({(att.fileSize / 1024).toFixed(1)} KB)
                    {att.isRemoved && <span className="badge bg-secondary ms-2">Removed</span>}
                  </div>
                  <div>
                    {!att.isRemoved ? (
                      <button
                        type="button"
                        className="btn btn-outline-primary btn-sm py-0 px-2"
                        onClick={() => handleDownloadFile(att)}
                      >
                        Download
                      </button>
                    ) : (
                      <span className="small text-muted italic">Removed</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="small text-muted italic">No attachments for this ticket.</div>
          )}
        </div>
      </div>

      {/* Communication Section Tabs */}
      <div className="card shadow-sm border mb-4">
        <div className="card-header bg-light">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button
                type="button"
                className={`nav-link fw-semibold ${activeCommTab === "comments" ? "active text-success" : "text-secondary"}`}
                onClick={() => setActiveCommTab("comments")}
              >
                Public Comments ({comments.length})
              </button>
            </li>
            {(isItStaff || isAdmin) && (
              <li className="nav-item">
                <button
                  type="button"
                  className={`nav-link fw-semibold ${activeCommTab === "notes" ? "active text-warning" : "text-secondary"}`}
                  onClick={() => setActiveCommTab("notes")}
                >
                  Internal Notes 🔒 ({notes.length})
                </button>
              </li>
            )}
          </ul>
        </div>

        <div className="card-body">
          {/* Public Comments View (Green theme / Shared with Requester) */}
          {activeCommTab === "comments" && (
            <div data-testid="public-comments-section">
              <div className="alert alert-success border-success bg-light text-dark p-2 mb-3 small d-flex align-items-center gap-2">
                <span className="badge bg-success">Public</span>
                <span>Public Comments are visible to the Requester, IT Staff, and Administrator.</span>
              </div>

              {commentsLoading ? (
                <div className="small text-muted italic">Loading comments…</div>
              ) : comments.length > 0 ? (
                <div className="d-flex flex-column gap-3 mb-4">
                  {comments.map((c) => (
                    <div key={c.id} className="p-3 border rounded border-success-subtle bg-light">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold small">
                          {c.author?.name || "Unknown Author"}{" "}
                          <span className="badge bg-secondary ms-1">{c.author?.role}</span>
                        </span>
                        <span className="text-muted small">{formatDateTime(c.createdAt)}</span>
                      </div>
                      <div className="small text-dark" style={{ whiteSpace: "pre-wrap" }}>
                        {c.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small text-muted italic mb-4">No public comments recorded yet.</div>
              )}

              {/* Post Public Comment Form */}
              <form onSubmit={handlePostComment} className="border-top pt-3">
                {commentError && <div className="alert alert-danger small py-2 mb-2">{commentError}</div>}
                <div className="mb-2">
                  <textarea
                    rows={3}
                    aria-label="Public Comment"
                    className="form-control form-control-sm"
                    placeholder="Add a public comment visible to Requester..."
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    style={{ outlineColor: "#0B7A46" }}
                  />
                </div>
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn btn-success btn-sm px-3"
                    disabled={commentSubmitting}
                    data-testid="post-public-comment-btn"
                    style={{ backgroundColor: "#006B3C", borderColor: "#006B3C" }}
                  >
                    {commentSubmitting ? "Posting…" : "Post Comment"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Internal Notes View (Amber theme / Private to IT Staff & Admin) */}
          {activeCommTab === "notes" && (isItStaff || isAdmin) && (
            <div data-testid="internal-notes-section">
              <div className="alert alert-warning border-warning p-2 mb-3 small d-flex align-items-center gap-2">
                <span className="badge bg-warning text-dark">Private 🔒</span>
                <span className="fw-semibold">Internal Notes are private and visible ONLY to IT Staff & Administrator.</span>
              </div>

              {notesLoading ? (
                <div className="small text-muted italic">Loading internal notes…</div>
              ) : notes.length > 0 ? (
                <div className="d-flex flex-column gap-3 mb-4">
                  {notes.map((n) => (
                    <div key={n.id} className="p-3 border border-warning rounded" style={{ backgroundColor: "#FEF3C7" }}>
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <span className="fw-bold small text-dark">
                          {n.author?.name || "Unknown Author"}{" "}
                          <span className="badge bg-dark ms-1">{n.author?.role}</span>
                        </span>
                        <span className="text-muted small">{formatDateTime(n.createdAt)}</span>
                      </div>
                      <div className="small text-dark" style={{ whiteSpace: "pre-wrap" }}>
                        {n.content}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="small text-muted italic mb-4">No internal notes recorded yet.</div>
              )}

              {/* Post Internal Note Form */}
              <form onSubmit={handlePostNote} className="border-top pt-3">
                {noteError && <div className="alert alert-danger small py-2 mb-2">{noteError}</div>}
                <div className="mb-2">
                  <textarea
                    rows={3}
                    aria-label="Internal Note"
                    className="form-control form-control-sm"
                    placeholder="Add a private internal note for IT Staff & Admin..."
                    value={noteInput}
                    onChange={(e) => setNoteInput(e.target.value)}
                    style={{ outlineColor: "#0B7A46" }}
                  />
                </div>
                <div className="d-flex justify-content-end">
                  <button
                    type="submit"
                    className="btn btn-warning text-dark btn-sm px-3 fw-semibold"
                    disabled={noteSubmitting}
                    data-testid="post-internal-note-btn"
                  >
                    {noteSubmitting ? "Saving…" : "Post Internal Note"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
