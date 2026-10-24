import React, { useState, useEffect } from "react";
import {
  User,
  fetchStaffDashboard,
  StaffDashboardResponse,
  RecentWorkloadTicket,
  RecentStaffAction,
} from "../api";

export interface StaffDashboardProps {
  currentUser: User;
  onNavigateToQueue: (filters?: {
    owner?: "all" | "my_queue" | "unassigned";
    itPriority?: string;
    view?: "today_actions" | "unassigned_active" | "my_queue_active" | "urgent_workload";
  }) => void;
  onSelectTicket: (ticketId: string) => void;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleDateString();
}

function formatDateTime(dateStr?: string): string {
  if (!dateStr) return "N/A";
  const d = new Date(dateStr);
  return isNaN(d.getTime()) ? "N/A" : d.toLocaleString();
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

export default function StaffDashboard({
  currentUser,
  onNavigateToQueue,
  onSelectTicket,
}: StaffDashboardProps) {
  const [data, setData] = useState<StaffDashboardResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isForbidden, setIsForbidden] = useState<boolean>(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError(null);
    setIsForbidden(false);
    try {
      const res = await fetchStaffDashboard();
      setData(res);
    } catch (err: any) {
      if (err?.status === 403 || err?.data?.error === "FORBIDDEN" || err?.data?.error?.code === "FORBIDDEN") {
        setIsForbidden(true);
      } else {
        setError(
          err?.data?.error?.message ||
            err?.message ||
            "Failed to load Staff Dashboard. Please check network connection."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  const currentDateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="container py-3" data-testid="staff-dashboard-page">
      {/* Welcome Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h1 className="h3 fw-bold text-success mb-1" data-testid="dashboard-welcome-heading">
            Welcome back, {currentUser.name}!
          </h1>
          <p className="text-muted small mb-0">
            Operations & Workload Overview &bull; {currentDateFormatted}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
          <span className="badge bg-light text-dark border px-3 py-2">
            Role: <strong>{currentUser.role}</strong>
          </span>
        </div>
      </div>

      {/* Forbidden 403 State */}
      {isForbidden && (
        <div className="alert alert-danger py-4 text-center shadow-sm mb-4" data-testid="staff-dashboard-forbidden">
          <h4 className="alert-heading fw-bold">Access Denied (403 Forbidden)</h4>
          <p className="mb-0">You do not have permission to access the IT Staff Dashboard.</p>
        </div>
      )}

      {/* Failure State Banner with Retry */}
      {error && !isForbidden && (
        <div
          className="alert alert-danger d-flex justify-content-between align-items-center shadow-sm mb-4"
          role="alert"
          data-testid="dashboard-error-alert"
        >
          <div>
            <strong>Error:</strong> {error}
          </div>
          <button
            type="button"
            className="btn btn-sm btn-danger px-3"
            onClick={loadDashboard}
            data-testid="dashboard-retry-button"
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Skeleton / Spinner State */}
      {loading && (
        <div
          className="text-center py-5"
          data-testid="loading-spinner"
          aria-live="polite"
        >
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading dashboard data…</span>
          </div>
          <p className="text-muted mt-3 mb-0">Loading operational metrics…</p>
        </div>
      )}

      {/* Dashboard Main Content */}
      {!loading && data && (
        <>
          {/* 4 Operational Metric Cards Grid */}
          <div className="row g-3 mb-4" data-testid="metric-cards-grid">
            {/* Card 1: Unassigned Tickets */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card h-100 shadow-sm border-0 border-start border-4 border-warning bg-white"
                style={{ cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
                role="button"
                tabIndex={0}
                data-testid="metric-unassigned-card"
                onClick={() => onNavigateToQueue({ view: "unassigned_active", owner: "unassigned" })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToQueue({ view: "unassigned_active", owner: "unassigned" });
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="text-muted small fw-semibold text-uppercase tracking-wider">
                    Unassigned Tickets
                  </div>
                  <div
                    className="display-6 fw-bold text-dark my-1"
                    data-testid="metric-unassigned-count"
                  >
                    {data.metrics.unassignedCount}
                  </div>
                  <div className="text-muted small">
                    Click to view unassigned queue &rarr;
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: My Assigned Tickets */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card h-100 shadow-sm border-0 border-start border-4 border-success bg-white"
                style={{ cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
                role="button"
                tabIndex={0}
                data-testid="metric-my-assigned-card"
                onClick={() => onNavigateToQueue({ view: "my_queue_active", owner: "my_queue" })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToQueue({ view: "my_queue_active", owner: "my_queue" });
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="text-muted small fw-semibold text-uppercase tracking-wider">
                    My Assigned Tickets
                  </div>
                  <div
                    className="display-6 fw-bold text-success my-1"
                    data-testid="metric-my-assigned-count"
                  >
                    {data.metrics.myAssignedCount}
                  </div>
                  <div className="text-muted small">
                    Assigned to you &rarr;
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Today's Actions */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card h-100 shadow-sm border-0 border-start border-4 border-info bg-white"
                style={{ cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
                role="button"
                tabIndex={0}
                data-testid="metric-today-actions-card"
                onClick={() => onNavigateToQueue({ view: "today_actions" })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToQueue({ view: "today_actions" });
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="text-muted small fw-semibold text-uppercase tracking-wider">
                    Today's Actions
                  </div>
                  <div
                    className="display-6 fw-bold text-info my-1"
                    data-testid="metric-today-actions-count"
                  >
                    {data.metrics.todayActionsCount}
                  </div>
                  <div className="text-muted small">
                    Recorded today &rarr;
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Urgent Workload */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card h-100 shadow-sm border-0 border-start border-4 border-danger bg-white"
                style={{ cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
                role="button"
                tabIndex={0}
                data-testid="metric-urgent-workload-card"
                onClick={() => onNavigateToQueue({ view: "urgent_workload", itPriority: "URGENT" })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToQueue({ view: "urgent_workload", itPriority: "URGENT" });
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="text-muted small fw-semibold text-uppercase tracking-wider">
                    Urgent Workload
                  </div>
                  <div
                    className="display-6 fw-bold text-danger my-1"
                    data-testid="metric-urgent-workload-count"
                  >
                    {data.metrics.urgentWorkloadCount}
                  </div>
                  <div className="text-muted small">
                    Urgent workload &rarr;
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content: Left Column (My Recent Workload) & Right Column (Actions & Feed) */}
          <div className="row g-4">
            {/* Left Column: My Recent Workload */}
            <div className="col-12 col-lg-7" data-testid="my-recent-workload-section">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="h5 fw-bold text-dark mb-0">My Recent Workload</h2>
                    <span className="text-muted small">Tickets assigned to you</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => onNavigateToQueue({ owner: "my_queue" })}
                  >
                    View All
                  </button>
                </div>
                <div className="card-body p-0">
                  {data.myRecentTickets.length === 0 ? (
                    <div
                      className="p-5 text-center text-muted"
                      data-testid="empty-recent-tickets"
                    >
                      <p className="mb-0 fw-semibold">No recent tickets</p>
                      <small>You currently have no tickets assigned to your queue.</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th scope="col" style={{ width: "25%" }}>Ticket</th>
                            <th scope="col" style={{ width: "35%" }}>Summary</th>
                            <th scope="col" style={{ width: "20%" }}>Status / Priority</th>
                            <th scope="col" style={{ width: "20%" }}>Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.myRecentTickets.map((t: RecentWorkloadTicket) => (
                            <tr
                              key={t.id}
                              style={{ cursor: "pointer" }}
                              data-testid={`recent-ticket-row-${t.id}`}
                              tabIndex={0}
                              role="button"
                              onClick={() => onSelectTicket(t.id)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault();
                                  onSelectTicket(t.id);
                                }
                              }}
                            >
                              <td>
                                <button
                                  type="button"
                                  className="btn btn-link p-0 text-success text-decoration-none fw-semibold font-monospace"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTicket(t.id);
                                  }}
                                >
                                  {t.ticketNumber}
                                </button>
                              </td>
                              <td>
                                <span className="text-dark text-truncate d-inline-block" style={{ maxWidth: "220px" }}>
                                  {t.summary}
                                </span>
                              </td>
                              <td>
                                <div className="d-flex flex-wrap gap-1 align-items-center">
                                  {renderStatusBadge(t.currentStatus)}
                                  {renderPriorityBadge(t.itPriority || t.requestedPriority)}
                                </div>
                              </td>
                              <td>
                                <span className="text-muted small">
                                  {formatDate(t.updatedAt)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Quick Actions & Recent Actions Log */}
            <div className="col-12 col-lg-5">
              <div className="d-flex flex-column gap-4">
                {/* Quick Actions Panel */}
                <div className="card shadow-sm border-0" data-testid="quick-actions-section">
                  <div className="card-header bg-white py-3 border-bottom">
                    <h2 className="h6 fw-bold text-dark mb-0">Quick Actions</h2>
                  </div>
                  <div className="card-body p-3">
                    <button
                      type="button"
                      className="btn btn-outline-success w-100"
                      data-testid="quick-action-view-queue"
                      onClick={() => onNavigateToQueue()}
                    >
                      View Queue
                    </button>
                  </div>
                </div>

                {/* Recent Actions Log */}
                <div className="card shadow-sm border-0" data-testid="recent-actions-section">
                  <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                    <div>
                      <h2 className="h6 fw-bold text-dark mb-0">Recent Actions Log</h2>
                      <span className="text-muted small">Actions recorded by you</span>
                    </div>
                    <span className="badge bg-light text-muted border">
                      {data.currentStaffActions.length} / 5
                    </span>
                  </div>
                  <div className="card-body p-3">
                    {data.currentStaffActions.length === 0 ? (
                      <div
                        className="p-4 text-center text-muted"
                        data-testid="empty-recent-actions"
                      >
                        <p className="mb-0 fw-semibold">No recent actions recorded</p>
                        <small>Actions you record on tickets will appear in this feed.</small>
                      </div>
                    ) : (
                      <div className="d-flex flex-column gap-3">
                        {data.currentStaffActions.map((a: RecentStaffAction) => (
                          <div
                            key={a.id}
                            className="p-2 border rounded bg-light"
                            style={{ cursor: "pointer" }}
                            data-testid={`recent-action-row-${a.id}`}
                            tabIndex={0}
                            role="button"
                            onClick={() => onSelectTicket(a.ticketId)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                onSelectTicket(a.ticketId);
                              }
                            }}
                          >
                            <div className="d-flex justify-content-between align-items-center mb-1">
                              <span className="badge bg-success-subtle text-success border border-success font-monospace">
                                {a.ticketNumber}
                              </span>
                              <span className="text-muted small">
                                {formatDateTime(a.createdAt)}
                              </span>
                            </div>
                            <div className="text-dark small fw-semibold text-truncate">
                              {a.description}
                            </div>
                            <div className="text-muted small text-truncate">
                              <em>Result:</em> {a.result}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
