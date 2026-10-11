import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext.js";
import {
  fetchStaffDashboard,
  StaffDashboardData,
  StaffRecentTicket,
} from "../api.js";

interface StaffDashboardProps {
  onCreateClick: () => void;
  onSearchClick: () => void;
  onMyQueueClick: () => void;
  onSelectTicket: (ticketId: number) => void;
  onDrillDown: (filters: { ownerFilter?: string; statusFilter?: string }) => void;
}

export const StaffDashboard: React.FC<StaffDashboardProps> = ({
  onCreateClick,
  onSearchClick,
  onMyQueueClick,
  onSelectTicket,
  onDrillDown,
}) => {
  const { currentUser } = useAuth();
  const [data, setData] = useState<StaffDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetchStaffDashboard();
      setData(res);
    } catch (err: any) {
      setError(err.message || "Failed to load staff dashboard.");
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
        return <span className="badge rounded-pill bg-secondary">Waiting Req</span>;
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

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="badge bg-danger">Urgent</span>;
      case "HIGH":
        return <span className="badge bg-warning text-dark">High</span>;
      case "MEDIUM":
        return <span className="badge bg-info text-dark">Medium</span>;
      case "LOW":
        return <span className="badge bg-light text-muted border">Low</span>;
      default:
        return <span className="badge bg-secondary">{priority}</span>;
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

  const parseStaffDrillDownUrl = (url?: string): { ownerFilter?: string; statusFilter?: string } => {
    if (!url) return {};
    try {
      const searchPart = url.includes("?") ? url.split("?")[1] : url;
      const params = new URLSearchParams(searchPart);
      return {
        ownerFilter: params.get("ownerId") || undefined,
        statusFilter: params.get("currentStatus") || undefined,
      };
    } catch {
      return {};
    }
  };

  const userName = currentUser?.name ? currentUser.name.split(" ")[0] : "Staff";

  return (
    <div className="container-fluid px-0" data-testid="staff-dashboard-view">
      {/* Greeting Banner */}
      <div className="card zen-card p-4 mb-4 shadow-sm border-0">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center">
          <div>
            <h1 className="h3 fw-bold mb-1" style={{ color: "var(--color-primary-green, #006B3C)" }}>
              Welcome back, {userName}!
            </h1>
            <p className="text-muted mb-0">Here's what's happening with your queue today.</p>
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
          {/* 5 Operational Metric Cards Grid (AC-10, BR-16, BR-19) */}
          <div className="row g-3 mb-4">
            {/* 1. Unassigned */}
            <div className="col-12 col-sm-6 col-lg">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-unassigned"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">Unassigned</span>
                  <div className="display-6 fw-bold mt-2" style={{ color: "var(--color-error-text, #D32F2F)" }}>
                    {data?.metrics.unassignedCount ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "var(--color-error-text, #D32F2F)" }}
                    data-testid="drilldown-unassigned"
                    onClick={() => {
                      const parsed = parseStaffDrillDownUrl(data?.drillDownUrls?.unassigned);
                      onDrillDown(Object.keys(parsed).length > 0 ? parsed : { ownerFilter: "unassigned" });
                    }}
                  >
                    View queue &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* 2. Open */}
            <div className="col-12 col-sm-6 col-lg">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-open"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">Open</span>
                  <div className="display-6 fw-bold mt-2 text-primary">
                    {data?.metrics.countsByStatus.OPEN ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold text-primary"
                    data-testid="drilldown-open"
                    onClick={() => {
                      const parsed = parseStaffDrillDownUrl(data?.drillDownUrls?.open);
                      onDrillDown(Object.keys(parsed).length > 0 ? parsed : { statusFilter: "OPEN" });
                    }}
                  >
                    View open &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* 3. In Progress */}
            <div className="col-12 col-sm-6 col-lg">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-in-progress"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">In Progress</span>
                  <div className="display-6 fw-bold mt-2" style={{ color: "var(--color-warning-badge, #F57C00)" }}>
                    {data?.metrics.countsByStatus.IN_PROGRESS ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "var(--color-warning-badge, #F57C00)" }}
                    data-testid="drilldown-in-progress"
                    onClick={() => {
                      const parsed = parseStaffDrillDownUrl(data?.drillDownUrls?.inProgress);
                      onDrillDown(Object.keys(parsed).length > 0 ? parsed : { statusFilter: "IN_PROGRESS" });
                    }}
                  >
                    View working &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* 4. Waiting Req */}
            <div className="col-12 col-sm-6 col-lg">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-waiting-requester"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">Waiting Req</span>
                  <div className="display-6 fw-bold mt-2 text-secondary">
                    {data?.metrics.countsByStatus.WAITING_FOR_REQUESTER ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold text-secondary"
                    data-testid="drilldown-waiting-requester"
                    onClick={() => {
                      const parsed = parseStaffDrillDownUrl(data?.drillDownUrls?.waitingForRequester);
                      onDrillDown(Object.keys(parsed).length > 0 ? parsed : { statusFilter: "WAITING_FOR_REQUESTER" });
                    }}
                  >
                    View pending &rarr;
                  </button>
                </div>
              </div>
            </div>

            {/* 5. My Assigned */}
            <div className="col-12 col-sm-6 col-lg">
              <div
                className="card zen-card h-100 p-3 shadow-sm border-0 d-flex flex-column justify-content-between"
                data-testid="metric-assigned-to-me"
              >
                <div>
                  <span className="text-muted small text-uppercase fw-semibold">My Assigned</span>
                  <div className="display-6 fw-bold mt-2" style={{ color: "var(--color-primary-green, #006B3C)" }}>
                    {data?.metrics.assignedToMeCount ?? 0}
                  </div>
                </div>
                <div className="mt-3 pt-2 border-top">
                  <button
                    type="button"
                    className="btn btn-link p-0 text-decoration-none small fw-semibold"
                    style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                    data-testid="drilldown-assigned-to-me"
                    onClick={() => {
                      const parsed = parseStaffDrillDownUrl(data?.drillDownUrls?.assignedToMe);
                      onDrillDown(Object.keys(parsed).length > 0 ? parsed : { ownerFilter: "me" });
                    }}
                  >
                    View my queue &rarr;
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Lower Two-Column Section: Recent Queue & Quick Actions / Admin Stats */}
          <div className="row g-4">
            {/* Left Column: Recent Queue Tickets (70% on desktop) */}
            <div className="col-12 col-lg-8">
              <div className="card zen-card h-100 p-3 shadow-sm border-0" data-testid="recent-queue-panel">
                <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                  <h2 className="h5 fw-bold mb-0">Recent Queue Tickets</h2>
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 fw-semibold"
                    style={{ color: "var(--color-secondary-green, #0B7A46)" }}
                    onClick={onSearchClick}
                    data-testid="view-all-queue-link"
                  >
                    View all &rarr;
                  </button>
                </div>

                {(!data?.recentTickets || data.recentTickets.length === 0) ? (
                  <div className="text-center py-4 text-muted" data-testid="empty-recent-queue">
                    <p className="mb-0">No recent queue tickets found.</p>
                  </div>
                ) : (
                  <div className="list-group list-group-flush">
                    {data.recentTickets.map((ticket: StaffRecentTicket) => (
                      <div
                        key={ticket.id}
                        className="list-group-item px-0 py-3 d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center border-bottom"
                        data-testid={`recent-ticket-${ticket.id}`}
                      >
                        <div className="mb-2 mb-sm-0 me-sm-3">
                          <div className="d-flex flex-wrap align-items-center gap-2 mb-1">
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
                            {renderPriorityBadge(ticket.itPriority)}
                          </div>
                          <div className="text-dark fw-medium text-truncate" style={{ maxWidth: "450px" }}>
                            {ticket.summary}
                          </div>
                          <div className="text-muted small mt-1">
                            <span>Requester: {ticket.requester?.name || "Unknown"}</span>
                            <span className="mx-2">&bull;</span>
                            <span>Owner: {ticket.owner ? ticket.owner.name : <em className="text-danger">Unassigned</em>}</span>
                          </div>
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

            {/* Right Column: Quick Actions & Admin Stats (30% on desktop) */}
            <div className="col-12 col-lg-4 d-flex flex-column gap-4">
              {/* Quick Actions Panel */}
              <div className="card zen-card p-3 shadow-sm border-0" data-testid="quick-actions-panel">
                <h2 className="h5 fw-bold mb-3 pb-2 border-bottom">Quick Actions</h2>
                <div className="d-grid gap-2">
                  <button
                    type="button"
                    className="btn btn-zen-primary btn-success py-2 d-flex align-items-center justify-content-center fw-medium"
                    style={{
                      backgroundColor: "var(--color-primary-green, #006B3C)",
                      borderColor: "var(--color-primary-green, #006B3C)",
                    }}
                    data-testid="quick-create-ticket-btn"
                    onClick={onCreateClick}
                  >
                    <svg className="me-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="5" x2="12" y2="19"></line>
                      <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    Create Ticket
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-secondary py-2 d-flex align-items-center justify-content-center fw-medium"
                    data-testid="quick-search-tickets-btn"
                    onClick={onSearchClick}
                  >
                    <svg className="me-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="8"></circle>
                      <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    Search Tickets
                  </button>

                  <button
                    type="button"
                    className="btn btn-outline-success py-2 d-flex align-items-center justify-content-center fw-medium"
                    style={{ color: "var(--color-primary-green, #006B3C)" }}
                    data-testid="quick-my-queue-btn"
                    onClick={onMyQueueClick}
                  >
                    <svg className="me-2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    My Queue
                  </button>
                </div>
              </div>

              {/* Administrator Statistics Card (BR-17, AC-11, Screen 1.1) */}
              {data?.adminStats && (
                <div className="card zen-card p-3 shadow-sm border-0" data-testid="admin-stats-card">
                  <h2 className="h5 fw-bold mb-3 pb-2 border-bottom d-flex align-items-center">
                    <svg className="me-2 text-primary" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                      <circle cx="9" cy="7" r="4"></circle>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                    </svg>
                    Admin Statistics
                  </h2>
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="text-muted">Total Accounts:</span>
                      <span className="fw-bold fs-5">{data.adminStats.totalUsers}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="text-muted">Active Accounts:</span>
                      <span className="badge bg-success">{data.adminStats.activeUsers} Active</span>
                    </div>
                  </div>
                  <div className="pt-2 border-top">
                    <div className="small text-muted mb-2 text-uppercase fw-semibold">Role Breakdown:</div>
                    <div className="d-flex justify-content-between mb-1 small">
                      <span>Requesters:</span>
                      <span className="fw-semibold">{data.adminStats.usersByRole.REQUESTER}</span>
                    </div>
                    <div className="d-flex justify-content-between mb-1 small">
                      <span>IT Staff:</span>
                      <span className="fw-semibold">{data.adminStats.usersByRole.IT_STAFF}</span>
                    </div>
                    <div className="d-flex justify-content-between small">
                      <span>Administrators:</span>
                      <span className="fw-semibold">{data.adminStats.usersByRole.ADMINISTRATOR}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
