import React, { useState, useEffect } from "react";
import {
  User,
  fetchRequesterDashboard,
  RequesterDashboardResponse,
  RequesterRecentTicket,
  RequesterAttentionTicket,
} from "../api";

export interface RequesterDashboardProps {
  currentUser: User;
  onNavigateToMyTickets: (status?: string) => void;
  onSelectTicket: (ticketId: string) => void;
  onCreateTicket?: () => void;
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

export default function RequesterDashboard({
  currentUser,
  onNavigateToMyTickets,
  onSelectTicket,
  onCreateTicket,
}: RequesterDashboardProps) {
  const [data, setData] = useState<RequesterDashboardResponse | null>(null);
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
      const res = await fetchRequesterDashboard();
      if (res && res.metrics && typeof res.metrics === "object") {
        setData(res);
      } else {
        setData({
          metrics: {
            openTicketsCount: 0,
            waitingForRequesterCount: 0,
            inProgressCount: 0,
            recentlyResolvedCount: 0,
          },
          attentionRequiredTickets: [],
          recentTickets: [],
        });
      }
    } catch (err: any) {
      if (err?.status === 403 || err?.data?.error === "FORBIDDEN" || err?.data?.error?.code === "FORBIDDEN") {
        setIsForbidden(true);
      } else {
        setError(
          err?.data?.error?.message ||
            err?.message ||
            "Failed to load Requester Dashboard. Please check network connection."
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
    <div className="container py-3" data-testid="requester-dashboard-page">
      {/* Welcome Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h1 className="h3 fw-bold text-success mb-1" data-testid="dashboard-welcome-heading">
            Welcome back, {currentUser.name}! Here's the status of your requests.
          </h1>
          <p className="text-muted small mb-0">
            Support & Request Overview &bull; {currentDateFormatted}
          </p>
        </div>
        <div className="d-flex align-items-center gap-2 mt-2 mt-sm-0">
          <span className="badge bg-light text-dark border px-3 py-2">
            Role: <strong>{currentUser.role}</strong>
          </span>
          {onCreateTicket && (
            <button
              type="button"
              className="btn btn-success btn-sm px-3 shadow-sm"
              onClick={onCreateTicket}
              data-testid="create-ticket-action"
            >
              + Create Ticket
            </button>
          )}
        </div>
      </div>

      {/* Forbidden 403 State */}
      {isForbidden && (
        <div className="alert alert-danger py-4 text-center shadow-sm mb-4" data-testid="requester-dashboard-forbidden">
          <h4 className="alert-heading fw-bold">Access Denied (403 Forbidden)</h4>
          <p className="mb-0">You do not have permission to access the Requester Dashboard.</p>
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
      {!loading && data && data.metrics && (
        <>
          {/* 4 Operational Metric Cards Grid */}
          <div className="row g-3 mb-4" data-testid="metric-cards-grid">
            {/* Card 1: My Open Tickets */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card h-100 shadow-sm border-0 border-start border-4 border-primary bg-white"
                style={{ cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
                role="button"
                tabIndex={0}
                data-testid="requester-metric-open"
                onClick={() => onNavigateToMyTickets("open")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToMyTickets("open");
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="text-muted small fw-semibold text-uppercase tracking-wider">
                    My Open Tickets
                  </div>
                  <div
                    className="display-6 fw-bold text-primary my-1"
                    data-testid="metric-open-count"
                  >
                    {data.metrics?.openTicketsCount ?? 0}
                  </div>
                  <div className="text-muted small">
                    Click to view open tickets &rarr;
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Waiting for My Response */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card h-100 shadow-sm border-0 border-start border-4 border-warning bg-white"
                style={{ cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
                role="button"
                tabIndex={0}
                data-testid="requester-metric-waiting"
                onClick={() => onNavigateToMyTickets("WAITING_FOR_REQUESTER")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToMyTickets("WAITING_FOR_REQUESTER");
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="text-muted small fw-semibold text-uppercase tracking-wider">
                    Waiting for My Response
                  </div>
                  <div
                    className="display-6 fw-bold text-warning my-1"
                    data-testid="metric-waiting-count"
                  >
                    {data.metrics?.waitingForRequesterCount ?? 0}
                  </div>
                  <div className="text-muted small">
                    Requires your response &rarr;
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: In Progress */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card h-100 shadow-sm border-0 border-start border-4 border-info bg-white"
                style={{ cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
                role="button"
                tabIndex={0}
                data-testid="requester-metric-inprogress"
                onClick={() => onNavigateToMyTickets("IN_PROGRESS")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToMyTickets("IN_PROGRESS");
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="text-muted small fw-semibold text-uppercase tracking-wider">
                    In Progress
                  </div>
                  <div
                    className="display-6 fw-bold text-info my-1"
                    data-testid="metric-inprogress-count"
                  >
                    {data.metrics?.inProgressCount ?? 0}
                  </div>
                  <div className="text-muted small">
                    Under active investigation &rarr;
                  </div>
                </div>
              </div>
            </div>

            {/* Card 4: Recently Resolved */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card h-100 shadow-sm border-0 border-start border-4 border-success bg-white"
                style={{ cursor: "pointer", transition: "transform 0.15s ease-in-out" }}
                role="button"
                tabIndex={0}
                data-testid="requester-metric-resolved"
                onClick={() => onNavigateToMyTickets("RESOLVED")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onNavigateToMyTickets("RESOLVED");
                  }
                }}
              >
                <div className="card-body p-3">
                  <div className="text-muted small fw-semibold text-uppercase tracking-wider">
                    Recently Resolved
                  </div>
                  <div
                    className="display-6 fw-bold text-success my-1"
                    data-testid="metric-resolved-count"
                  >
                    {data.metrics?.recentlyResolvedCount ?? 0}
                  </div>
                  <div className="text-muted small">
                    Resolved in past 30 days &rarr;
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content: Left Column (Attention Required) & Right Column (Recent Tickets) */}
          <div className="row g-4">
            {/* Attention Required Section */}
            <div className="col-12 col-lg-6" data-testid="attention-required-section">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="h5 fw-bold text-dark mb-0">Attention Required</h2>
                    <span className="text-muted small">Tickets waiting for your response or clarification</span>
                  </div>
                  <span className="badge bg-warning text-dark">
                    {(data.attentionRequiredTickets || []).length} Pending
                  </span>
                </div>
                <div className="card-body p-0">
                  {(!data.attentionRequiredTickets || data.attentionRequiredTickets.length === 0) ? (
                    <div
                      className="p-5 text-center text-muted"
                      data-testid="empty-attention-tickets"
                    >
                      <p className="mb-0 fw-semibold">No tickets require your attention at this time</p>
                      <small>All your tickets are being handled or currently have no pending questions.</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th scope="col" style={{ width: "25%" }}>Ticket</th>
                            <th scope="col" style={{ width: "45%" }}>Summary</th>
                            <th scope="col" style={{ width: "15%" }}>Priority</th>
                            <th scope="col" style={{ width: "15%" }} className="text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.attentionRequiredTickets.map((t: RequesterAttentionTicket) => (
                            <tr
                              key={t.id}
                              style={{ cursor: "pointer" }}
                              data-testid={`attention-ticket-row-${t.id}`}
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
                                <span className="fw-semibold text-success font-monospace">
                                  {t.ticketNumber}
                                </span>
                              </td>
                              <td>
                                <div className="text-truncate" style={{ maxWidth: "240px" }} title={t.summary}>
                                  {t.summary}
                                </div>
                                <small className="text-muted d-block">
                                  Updated: {formatDateTime(t.updatedAt)}
                                </small>
                              </td>
                              <td>
                                {renderPriorityBadge(t.requestedPriority)}
                              </td>
                              <td className="text-end">
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-warning"
                                  data-testid={`attention-ticket-btn-${t.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSelectTicket(t.id);
                                  }}
                                >
                                  Respond
                                </button>
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

            {/* Recent Tickets Section */}
            <div className="col-12 col-lg-6" data-testid="recent-tickets-section">
              <div className="card shadow-sm border-0 h-100">
                <div className="card-header bg-white py-3 border-bottom d-flex justify-content-between align-items-center">
                  <div>
                    <h2 className="h5 fw-bold text-dark mb-0">Recent Tickets</h2>
                    <span className="text-muted small">Your latest submitted requests</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-success"
                    onClick={() => onNavigateToMyTickets()}
                  >
                    View All
                  </button>
                </div>
                <div className="card-body p-0">
                  {(!data.recentTickets || data.recentTickets.length === 0) ? (
                    <div
                      className="p-5 text-center text-muted"
                      data-testid="empty-recent-tickets"
                    >
                      <p className="mb-0 fw-semibold">No recent tickets</p>
                      <small>You have not submitted any tickets yet.</small>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                          <tr>
                            <th scope="col" style={{ width: "25%" }}>Ticket</th>
                            <th scope="col" style={{ width: "40%" }}>Summary</th>
                            <th scope="col" style={{ width: "20%" }}>Status / Priority</th>
                            <th scope="col" style={{ width: "15%" }}>Updated</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.recentTickets.map((t: RequesterRecentTicket) => (
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
                                <span className="fw-semibold text-success font-monospace">
                                  {t.ticketNumber}
                                </span>
                              </td>
                              <td>
                                <div className="text-truncate" style={{ maxWidth: "200px" }} title={t.summary}>
                                  {t.summary}
                                </div>
                              </td>
                              <td>
                                <div className="d-flex flex-column gap-1 align-items-start">
                                  {renderStatusBadge(t.currentStatus)}
                                  {renderPriorityBadge(t.requestedPriority)}
                                </div>
                              </td>
                              <td className="small text-muted">
                                {formatDateTime(t.updatedAt)}
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
          </div>
        </>
      )}
    </div>
  );
}
