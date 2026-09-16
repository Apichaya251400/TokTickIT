import React, { useState, useEffect } from "react";
import { PublicComment, fetchTicketComments, postTicketComment, User } from "../api";

interface PublicCommentsProps {
  ticketId: string;
  currentUser: User;
}

export default function PublicComments({ ticketId, currentUser }: PublicCommentsProps) {
  const [comments, setComments] = useState<PublicComment[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    loadComments();
  }, [ticketId]);

  async function loadComments() {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTicketComments(ticketId);
      setComments(data.comments || []);
    } catch (err: any) {
      setError(err?.data?.message || "Failed to load public comments.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setFormError("Comment content cannot be empty.");
      return;
    }
    if (trimmed.length > 2000) {
      setFormError("Comment content cannot exceed 2000 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const newComment = await postTicketComment(ticketId, trimmed);
      setComments((prev) => [...prev, newComment]);
      setContent("");
    } catch (err: any) {
      setFormError(err?.data?.message || "Failed to post public comment.");
    } finally {
      setSubmitting(false);
    }
  }

  function renderRoleBadge(role?: string) {
    if (role === "IT_STAFF") {
      return <span className="badge bg-success text-white">IT Staff</span>;
    }
    if (role === "ADMINISTRATOR") {
      return <span className="badge text-white" style={{ backgroundColor: "#7c3aed" }}>Administrator</span>;
    }
    return <span className="badge text-white" style={{ backgroundColor: "#0284c7" }}>Requester</span>;
  }

  function formatDate(dateStr?: string) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleString();
  }

  return (
    <div className="card shadow-sm border-0 mb-4">
      <div className="card-header bg-white border-bottom py-3">
        <h3 className="h6 fw-bold text-success mb-0 d-flex align-items-center">
          <i className="bi bi-chat-left-text me-2"></i>Public Comments
        </h3>
      </div>
      <div className="card-body p-4">
        {loading ? (
          <div className="text-center py-3 text-muted">Loading comments…</div>
        ) : error ? (
          <div className="alert alert-danger py-2">{error}</div>
        ) : comments.length === 0 ? (
          <p className="text-muted small fst-italic mb-3">No public comments yet.</p>
        ) : (
          <div className="d-flex flex-column gap-3 mb-4">
            {comments.map((comment) => (
              <div
                key={comment.id}
                className="p-3 bg-light rounded-3 border-start border-4 border-success shadow-sm"
              >
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="fw-semibold text-dark">
                      {comment.author?.name || `User #${comment.authorId}`}
                    </span>
                    {renderRoleBadge(comment.author?.role)}
                  </div>
                  <span className="text-muted small">{formatDate(comment.createdAt)}</span>
                </div>
                <p className="mb-0 text-dark small style-whitespace-prewrap" style={{ whiteSpace: "pre-wrap" }}>
                  {comment.content}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Post Comment Form */}
        <form onSubmit={handleSubmit} className="border-top pt-3 mt-2">
          <div className="mb-3">
            <label htmlFor="commentContent" className="form-label fw-semibold small text-secondary">
              Add a Public Comment
            </label>
            <textarea
              id="commentContent"
              className="form-control"
              rows={3}
              placeholder="Type your public comment here…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              maxLength={2000}
              disabled={submitting}
            />
            {formError && <div className="text-danger small mt-1">{formError}</div>}
          </div>
          <div className="d-flex justify-content-end">
            <button
              type="submit"
              className="btn btn-success btn-sm fw-semibold"
              disabled={submitting || !content.trim()}
            >
              {submitting ? "Posting…" : "Post Comment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
