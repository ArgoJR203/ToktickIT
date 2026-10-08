import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchRequesterDashboard,
  RequesterDashboardData,
  RequesterRecentTicket,
} from "../api.js";

interface RequesterDashboardProps {
  onCreateClick: () => void;
  onViewMyTickets: () => void;
  onSelectTicket: (ticketId: number) => void;
  onDrillDown: (filters: { statusGroup?: "open" | "resolved"; currentStatus?: string }) => void;
}

export const RequesterDashboard: React.FC<RequesterDashboardProps> = ({
  onCreateClick,
  onViewMyTickets,
  onSelectTicket,
  onDrillDown,
}) => {
  const { currentUser } = useAuth();
  const [data, setData] = useState<RequesterDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchRequesterDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load requester dashboard.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return <span className="badge rounded-pill bg-info text-dark">New</span>;
      case "OPEN":
        return <span className="badge rounded-pill bg-primary">Open</span>;
      case "IN_PROGRESS":
        return <span className="badge rounded-pill bg-warning text-dark">In Progress</span>;
      case "WAITING_FOR_REQUESTER":
        return <span className="badge rounded-pill bg-secondary">Waiting on Me</span>;
      case "RESOLVED":
        return <span className="badge rounded-pill bg-success">Resolved</span>;
      case "CLOSED":
        return <span className="badge rounded-pill bg-dark">Closed</span>;
      case "REOPENED":
        return <span className="badge rounded-pill bg-danger">Reopened</span>;
      case "CANCELLED":
        return <span className="badge rounded-pill bg-light text-muted border">Cancelled</span>;
      default:
        return <span className="badge rounded-pill bg-secondary">{status}</span>;
    }
  };

  const formatDate = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return isoString;
    }
  };

  const userName = currentUser?.name ? currentUser.name.split(" ")[0] : "there";

  return (
    <div className="container-fluid px-0" data-testid="requester-dashboard-view">
      {/* Greeting Banner */}
      <div className="card zen-card p-4 mb-4 shadow-sm border-0">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
          <div>
            <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-primary-green, #006B3C)" }}>
              Welcome, {userName}!
            </h1>
            <p className="text-muted mb-0">Here's the latest on your requests.</p>
          </div>
          <button
            type="button"
            className="btn btn-sm btn-outline-success mt-3 mt-sm-0 align-self-start align-self-sm-center d-flex align-items-center"
            data-testid="refresh-dashboard-btn"
            onClick={loadDashboard}
            disabled={isLoading}
          >
            <svg
              className={`me-1 ${isLoading ? "spin-icon" : ""}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="23 4 23 10 17 10"></polyline>
              <polyline points="1 20 1 14 7 14"></polyline>
              <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mb-4 shadow-sm" role="alert" data-testid="dashboard-error-banner">
          {error}
        </div>
      )}

      {isLoading && !data ? (
        <div className="text-center py-5" data-testid="dashboard-loading-spinner">
          <div className="spinner-border" style={{ color: "var(--color-primary-green, #006B3C)" }} role="status">
            <span className="visually-hidden">Loading dashboard...</span>
          </div>
        </div>
      ) : (
        <>
          {/* 4 Metric Cards Row (AC-02, BR-15, BR-19) */}
          <div className="row g-3 mb-4">
            {/* Card 1: Total Open */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-total-open"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">My Open Tickets</span>
                  <div className="display-6 fw-bold mt-2" style={{ color: "var(--color-primary-green, #006B3C)" }}>
                    {data?.metrics.totalOpen ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                    data-testid="drilldown-total-open"
                    onClick={() => onDrillDown({ statusGroup: "open" })}
                  >
                    View active requests &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Waiting for Requester */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-waiting-requester"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">Waiting on Me</span>
                  <div className="display-6 fw-bold mt-2" style={{ color: "#E65100" }}>
                    {data?.metrics.waitingForRequester ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "#E65100" }}
                    data-testid="drilldown-waiting-requester"
                    onClick={() => onDrillDown({ currentStatus: "WAITING_FOR_REQUESTER" })}
                  >
                    Action required &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Card 3: Resolved */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-resolved"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">Resolved</span>
                  <div className="display-6 fw-bold mt-2 text-success">
                    {data?.metrics.resolvedCount ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold text-success"
                    data-testid="drilldown-resolved"
                    onClick={() => onDrillDown({ currentStatus: "RESOLVED" })}
                  >
                    View resolved &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* Card 4: Closed */}
            <div className="col-12 col-sm-6 col-lg-3">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-closed"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">Closed</span>
                  <div className="display-6 fw-bold mt-2 text-secondary">
                    {data?.metrics.closedCount ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold text-secondary"
                    data-testid="drilldown-closed"
                    onClick={() => onDrillDown({ currentStatus: "CLOSED" })}
                  >
                    View closed &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Two-Column Section: Recent Tickets & Quick Actions */}
          <div className="row g-4">
            {/* Left Column: Recent Tickets (70% on desktop) */}
            <div className="col-12 col-lg-8">
              <div className="card zen-card h-100 p-3 shadow-sm border-0" data-testid="recent-tickets-panel">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h2 className="h5 fw-bold mb-0">My Recent Tickets</h2>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                    style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                    onClick={onViewMyTickets}
                    data-testid="view-all-tickets-link"
                  >
                    View all &rarr;
                  </button>
                </div>

                {(!data?.recentTickets || data.recentTickets.length === 0) ? (
                  <div className="text-center py-4 text-muted" data-testid="empty-recent-tickets">
                    <p className="mb-2">No recent requests found.</p>
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-success"
                      onClick={onCreateClick}
                    >
                      Create your first ticket
                    </button>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {data.recentTickets.map((ticket: RequesterRecentTicket) => (
                      <div
                        key={ticket.id}
                        className="list-group-item px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center border-bottom"
                        data-testid={`recent-ticket-${ticket.id}`}
                      >
                        <div className="mb-2 mb-sm-0 me-sm-3">
                          <div className="d-flex align-items-center gap-2 mb-1">
                            <button
                              type="button"
                              className="btn btn-link p-0 fw-bold font-monospace text-decoration-none"
                              style={{ color: "var(--color-primary-green, #006B3C)" }}
                              data-testid={`ticket-link-${ticket.id}`}
                              onClick={() => onSelectTicket(ticket.id)}
                            >
                              {ticket.ticketNumber}
                            </button>
                            {renderStatusBadge(ticket.currentStatus)}
                          </div>
                          <div className="text-dark fw-medium text-truncate" style={{ maxWidth: "450px" }}>
                            {ticket.summary}
                          </div>
                          {ticket.category && (
                            <small className="text-muted">{ticket.category.name}</small>
                          )}
                        </div>
                        <div className="text-sm-end text-muted small flex-shrink-0">
                          {formatDate(ticket.updatedAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Quick Actions (30% on desktop) */}
            <div className="col-12 col-lg-4">
              <div className="card zen-card p-3 shadow-sm border-0" data-testid="quick-actions-panel">
                <h2 className="h5 fw-bold mb-3 pb-2 border-bottom">Quick Actions</h2>
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-success py-2 d-flex align-items-center justify-content-center fw-medium"
                    style={{
                      backgroundColor: "var(--color-primary-green, #006B3C)",
                      borderColor: "var(--color-primary-green, #006B3C)",
                    }}
                    data-testid="quick-create-ticket-btn"
                    onClick={onCreateClick}
                  >
                    <svg
                      className="me-2"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create Ticket
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary py-2 d-flex align-items-center justify-content-center fw-medium"
                    data-testid="quick-view-tickets-btn"
                    onClick={onViewMyTickets}
                  >
                    <svg
                      className="me-2"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                    </svg>
                    View My Tickets
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
