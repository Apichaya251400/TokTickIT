import React, { useState, useEffect, useRef } from "react";
import { fetchQueueTickets, QueueQueryParams, User } from "../api";

interface StaffTicketQueueProps {
  onSelectTicket: (ticketId: string) => void;
  currentUser?: User | null;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
}

function renderPriorityBadge(priority?: string | null) {
  if (!priority) return <span className="badge bg-secondary">-</span>;
  let bgClass = "bg-secondary";
  if (priority === "URGENT") bgClass = "bg-danger text-white";
  else if (priority === "HIGH") bgClass = "bg-warning text-dark";
  else if (priority === "MEDIUM") bgClass = "bg-success text-white";
  else if (priority === "LOW") bgClass = "bg-secondary text-white";

  return <span className={`badge ${bgClass}`}>{priority}</span>;
}

function renderStatusBadge(status: string) {
  let bgClass = "bg-secondary";
  if (status === "NEW") bgClass = "bg-info text-dark";
  else if (status === "OPEN") bgClass = "bg-primary text-white";
  else if (status === "IN_PROGRESS") bgClass = "bg-warning text-dark";
  else if (status === "WAITING_FOR_REQUESTER") bgClass = "bg-dark text-white";
  else if (status === "RESOLVED") bgClass = "bg-success text-white";
  else if (status === "CLOSED") bgClass = "bg-secondary text-white";
  else if (status === "REOPENED") bgClass = "bg-danger text-white";
  else if (status === "CANCELLED") bgClass = "bg-light text-muted border";

  return <span className={`badge ${bgClass}`}>{status}</span>;
}

export default function StaffTicketQueue({ onSelectTicket, currentUser }: StaffTicketQueueProps) {
  const [ownerFilter, setOwnerFilter] = useState<"all" | "my_queue" | "unassigned">("all");
  const [q, setQ] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [requestedPriorityFilter, setRequestedPriorityFilter] = useState<string>("");
  const [itPriorityFilter, setItPriorityFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<"createdAt" | "itPriority" | "updatedAt" | "ticketNumber">("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);
  const [limit, setLimit] = useState<number>(10);

  const [tickets, setTickets] = useState<any[]>([]);
  const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; totalPages: number }>({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState<boolean>(false);

  const latestRequestIdRef = useRef<number>(0);

  useEffect(() => {
    loadQueue();
  }, [ownerFilter, q, statusFilter, requestedPriorityFilter, itPriorityFilter, sortBy, sortDir, page, limit]);

  async function loadQueue() {
    const requestId = ++latestRequestIdRef.current;
    setLoading(true);
    setError(null);
    setForbidden(false);

    try {
      const params: QueueQueryParams = {
        q: q.trim() || undefined,
        status: statusFilter || undefined,
        requestedPriority: requestedPriorityFilter || undefined,
        itPriority: itPriorityFilter || undefined,
        owner: ownerFilter,
        sortBy,
        sortDir,
        page,
        limit,
      };

      const res = await fetchQueueTickets(params);

      if (requestId === latestRequestIdRef.current) {
        setTickets(res.data || []);
        setPagination(
          res.pagination || { total: res.data?.length || 0, page, limit, totalPages: 1 }
        );
      }
    } catch (err: any) {
      if (requestId === latestRequestIdRef.current) {
        if (err?.status === 403 || err?.data?.error === "FORBIDDEN") {
          setForbidden(true);
        } else {
          setError(err?.data?.error?.message || err?.message || "Failed to load ticket queue.");
        }
        setTickets([]);
      }
    } finally {
      if (requestId === latestRequestIdRef.current) {
        setLoading(false);
      }
    }
  }

  function handleClearFilters() {
    setQ("");
    setStatusFilter("");
    setRequestedPriorityFilter("");
    setItPriorityFilter("");
    setOwnerFilter("all");
    setSortBy("createdAt");
    setSortDir("desc");
    setPage(1);
  }

  function handleSort(column: "createdAt" | "itPriority" | "updatedAt" | "ticketNumber") {
    if (sortBy === column) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortDir("desc");
    }
    setPage(1);
  }

  const isFilterActive =
    q.trim() !== "" ||
    statusFilter !== "" ||
    requestedPriorityFilter !== "" ||
    itPriorityFilter !== "" ||
    ownerFilter !== "all";

  return (
    <div className="container py-2" data-testid="staff-queue-page">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="h4 fw-bold text-success mb-0">IT Staff Ticket Queue</h2>
        {currentUser && (
          <span className="text-muted small">
            Logged in as: <strong>{currentUser.name}</strong> ({currentUser.role})
          </span>
        )}
      </div>

      {/* Owner Tab Navigation Pills */}
      <ul className="nav nav-pills mb-3">
        <li className="nav-item">
          <button
            type="button"
            data-testid="queue-owner-all"
            className={`nav-link ${ownerFilter === "all" ? "active bg-success" : "text-dark"}`}
            onClick={() => {
              setOwnerFilter("all");
              setPage(1);
            }}
          >
            All Tickets
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            data-testid="queue-owner-my"
            className={`nav-link ${ownerFilter === "my_queue" ? "active bg-success" : "text-dark"}`}
            onClick={() => {
              setOwnerFilter("my_queue");
              setPage(1);
            }}
          >
            My Queue
          </button>
        </li>
        <li className="nav-item">
          <button
            type="button"
            data-testid="queue-owner-unassigned"
            className={`nav-link ${ownerFilter === "unassigned" ? "active bg-success" : "text-dark"}`}
            onClick={() => {
              setOwnerFilter("unassigned");
              setPage(1);
            }}
          >
            Unassigned
          </button>
        </li>
      </ul>

      {/* Filter & Search Bar */}
      <div className="card shadow-sm p-3 mb-4 bg-light">
        <div className="row g-2 align-items-center">
          <div className="col-12 col-md-3">
            <input
              type="text"
              data-testid="queue-search-input"
              className="form-control form-control-sm"
              placeholder="Search ticket #, summary, desc…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="col-6 col-md-2">
            <select
              data-testid="queue-status-filter"
              className="form-select form-select-sm"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="OPEN">OPEN</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="WAITING_FOR_REQUESTER">WAITING_FOR_REQUESTER</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
              <option value="REOPENED">REOPENED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              data-testid="queue-requested-priority-filter"
              className="form-select form-select-sm"
              value={requestedPriorityFilter}
              onChange={(e) => {
                setRequestedPriorityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Req. Priority</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
          <div className="col-6 col-md-2">
            <select
              data-testid="queue-it-priority-filter"
              className="form-select form-select-sm"
              value={itPriorityFilter}
              onChange={(e) => {
                setItPriorityFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">IT Priority</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>
          <div className="col-6 col-md-3 text-end">
            {isFilterActive && (
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 403 Forbidden Feedback State */}
      {forbidden && (
        <div className="alert alert-warning card shadow-sm p-4 text-center mb-4" role="alert">
          <h4 className="h5 fw-bold text-dark">Access Denied (403 Forbidden)</h4>
          <p className="text-muted mb-0">
            You do not have permission to view the IT Staff Queue. This area is reserved for IT Staff members.
          </p>
        </div>
      )}

      {/* API Failure Error Feedback State with Retry Button */}
      {error && !forbidden && (
        <div className="alert alert-danger shadow-sm d-flex justify-content-between align-items-center mb-4" role="alert">
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button type="button" className="btn btn-outline-danger btn-sm" onClick={loadQueue}>
            Retry
          </button>
        </div>
      )}

      {/* Loading Feedback State */}
      {loading && (
        <div className="text-center py-5" role="status">
          <div className="spinner-border text-success mb-2" style={{ width: "2.5rem", height: "2.5rem" }}>
            <span className="visually-hidden">Loading queue…</span>
          </div>
          <div className="text-muted">Loading ticket queue…</div>
        </div>
      )}

      {/* Queue Views (when not loading, not forbidden, and no fatal error) */}
      {!loading && !forbidden && !error && (
        <>
          {/* Empty / No Results Feedback States */}
          {tickets.length === 0 ? (
            <div className="card shadow-sm p-5 text-center bg-light border-0 mb-4">
              {isFilterActive ? (
                <div>
                  <h3 className="h6 fw-semibold text-muted mb-1">No matching tickets found</h3>
                  <p className="small text-muted mb-3">No tickets match your search or filter criteria.</p>
                  <button type="button" className="btn btn-outline-success btn-sm" onClick={handleClearFilters}>
                    Clear Filters
                  </button>
                </div>
              ) : (
                <div>
                  <h3 className="h6 fw-semibold text-muted mb-1">Queue is empty</h3>
                  <p className="small text-muted mb-0">There are currently no tickets in the system queue.</p>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table View (>= 768px) */}
              <div className="table-responsive d-none d-md-block mb-4">
                <table className="table table-hover align-middle shadow-sm bg-white rounded border">
                  <thead className="table-success text-dark">
                    <tr>
                      <th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("ticketNumber")}
                      >
                        Ticket # {sortBy === "ticketNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th>Summary</th>
                      <th>Req. Priority</th>
                      <th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("itPriority")}
                      >
                        IT Priority {sortBy === "itPriority" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th>Status</th>
                      <th>Requester</th>
                      <th>Owner</th>
                      <th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("createdAt")}
                      >
                        Created {sortBy === "createdAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                      <th
                        style={{ cursor: "pointer" }}
                        onClick={() => handleSort("updatedAt")}
                      >
                        Updated {sortBy === "updatedAt" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tickets.map((ticket) => (
                      <tr
                        key={ticket.id}
                        data-testid={`ticket-item-${ticket.id}`}
                        style={{ cursor: "pointer" }}
                        onClick={() => onSelectTicket(ticket.id)}
                      >
                        <td className="fw-bold text-success">{ticket.ticketNumber}</td>
                        <td className="text-truncate" style={{ maxWidth: 200 }}>
                          {ticket.summary}
                        </td>
                        <td>{renderPriorityBadge(ticket.requestedPriority)}</td>
                        <td>{renderPriorityBadge(ticket.itPriority)}</td>
                        <td>{renderStatusBadge(ticket.currentStatus)}</td>
                        <td>{ticket.requester?.name || "N/A"}</td>
                        <td>{ticket.owner?.name || <span className="text-muted italic">Unassigned</span>}</td>
                        <td className="small text-muted">{formatDate(ticket.createdAt)}</td>
                        <td className="small text-muted">{formatDate(ticket.updatedAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View (< 768px) */}
              <div className="d-block d-md-none mb-4">
                {tickets.map((ticket) => (
                  <div
                    key={ticket.id}
                    data-testid={`ticket-item-${ticket.id}`}
                    className="card shadow-sm mb-3 cursor-pointer border-start border-4 border-success"
                    onClick={() => onSelectTicket(ticket.id)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span className="fw-bold text-success">{ticket.ticketNumber}</span>
                        {renderStatusBadge(ticket.currentStatus)}
                      </div>
                      <h6 className="card-title text-dark mb-2">{ticket.summary}</h6>
                      <div className="d-flex gap-2 mb-2">
                        <span className="small text-muted">Req: {renderPriorityBadge(ticket.requestedPriority)}</span>
                        <span className="small text-muted">IT: {renderPriorityBadge(ticket.itPriority)}</span>
                      </div>
                      <div className="d-flex justify-content-between text-muted small">
                        <span>Req: {ticket.requester?.name || "N/A"}</span>
                        <span>Owner: {ticket.owner?.name || "Unassigned"}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls Bar */}
              <div
                data-testid="queue-pagination"
                className="d-flex flex-column flex-sm-row justify-content-between align-items-center gap-2 py-2"
              >
                <div className="text-muted small">
                  Showing <strong>{tickets.length}</strong> of <strong>{pagination.total}</strong> tickets (Page {pagination.page} of {pagination.totalPages || 1})
                </div>

                <div className="d-flex align-items-center gap-2">
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto" }}
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setPage(1);
                    }}
                  >
                    <option value={10}>10 per page</option>
                    <option value={20}>20 per page</option>
                    <option value={50}>50 per page</option>
                  </select>

                  <div className="btn-group btn-group-sm">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      disabled={page >= pagination.totalPages || pagination.totalPages === 0}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
