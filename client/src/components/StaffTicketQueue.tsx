import React, { useState, useEffect, useCallback } from "react";
import {
  fetchCategories,
  fetchStaffTickets,
  Category,
  StaffTicketItem,
  PaginatedStaffTicketsResponse,
} from "../api.js";

interface StaffTicketQueueProps {
  onSelectTicket?: (ticketId: number) => void;
}

export const StaffTicketQueue: React.FC<StaffTicketQueueProps> = ({ onSelectTicket }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  // Filter and Search States
  const [search, setSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");

  // Sorting & Pagination States
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);

  // Status & Error
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch categories for filter dropdown on mount
  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data))
      .catch((err) => console.error("Failed to load categories:", err));
  }, []);

  // 2. Fetch staff ticket queue
  const loadTickets = useCallback(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchStaffTickets({
      search,
      categoryId: selectedCategory,
      status: selectedStatus,
      itPriority: selectedPriority,
      ownerId: selectedAssignment,
      sortBy,
      sortOrder,
      page,
      pageSize: 10,
    })
      .then((res: PaginatedStaffTicketsResponse) => {
        if (isMounted) {
          setTickets(res.data);
          setPagination(res.pagination);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load ticket queue.");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    search,
    selectedCategory,
    selectedStatus,
    selectedPriority,
    selectedAssignment,
    sortBy,
    sortOrder,
    page,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Handlers for search & filters (reset to page 1)
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setPage(1);
  };

  const handlePriorityChange = (val: string) => {
    setSelectedPriority(val);
    setPage(1);
  };

  const handleAssignmentChange = (val: string) => {
    setSelectedAssignment(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedStatus("");
    setSelectedPriority("");
    setSelectedAssignment("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters = Boolean(
    search || selectedCategory || selectedStatus || selectedPriority || selectedAssignment
  );

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Badge renderers matching MyTickets and RequesterTicketDetail
  const renderStatusBadge = (status: string) => {
    const s = status.toUpperCase();
    const testId = `status-badge-${s.toLowerCase()}`;

    switch (s) {
      case "NEW":
        return (
          <span
            className="badge"
            style={{
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
              border: "1px solid var(--color-secondary-green)",
            }}
            data-testid={testId}
          >
            NEW
          </span>
        );
      case "OPEN":
        return (
          <span className="badge bg-success" data-testid={testId}>
            OPEN
          </span>
        );
      case "IN_PROGRESS":
        return (
          <span className="badge bg-primary" data-testid={testId}>
            IN PROGRESS
          </span>
        );
      case "WAITING_FOR_REQUESTER":
      case "PENDING":
        return (
          <span className="badge bg-warning text-dark" data-testid={testId}>
            WAITING FOR REQUESTER
          </span>
        );
      case "RESOLVED":
        return (
          <span className="badge bg-success" data-testid={testId}>
            RESOLVED
          </span>
        );
      case "CLOSED":
        return (
          <span className="badge bg-dark" data-testid={testId}>
            CLOSED
          </span>
        );
      case "REOPENED":
        return (
          <span className="badge bg-info text-dark" data-testid={testId}>
            REOPENED
          </span>
        );
      case "CANCELLED":
        return (
          <span className="badge bg-danger" data-testid={testId}>
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="badge bg-light text-dark" data-testid={testId}>
            {status}
          </span>
        );
    }
  };

  const renderPriorityBadge = (priority: string) => {
    const p = priority.toUpperCase();
    const testId = `priority-badge-${p.toLowerCase()}`;

    switch (p) {
      case "URGENT":
        return (
          <span className="badge bg-danger" data-testid={testId}>
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="badge bg-warning text-dark" data-testid={testId}>
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="badge bg-info text-dark" data-testid={testId}>
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="badge bg-secondary" data-testid={testId}>
            LOW
          </span>
        );
      default:
        return (
          <span className="badge bg-light text-dark" data-testid={testId}>
            {priority}
          </span>
        );
    }
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return <span className="text-muted opacity-25 ms-1">↕</span>;
    return <span className="ms-1">{sortOrder === "asc" ? "▲" : "▼"}</span>;
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  // Pagination buttons builder
  const renderPaginationButtons = () => {
    const total = pagination.totalPages;
    const current = pagination.page;
    const pages: (number | string)[] = [];

    if (total <= 7) {
      for (let i = 1; i <= total; i++) pages.push(i);
    } else {
      pages.push(1);
      if (current > 3) pages.push("ellipsis-1");
      const start = Math.max(2, current - 1);
      const end = Math.min(total - 1, current + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (current < total - 2) pages.push("ellipsis-2");
      pages.push(total);
    }

    return pages.map((p, idx) => {
      if (typeof p === "string") {
        return (
          <li key={`${p}-${idx}`} className="page-item disabled">
            <span className="page-link border-0 bg-transparent text-muted px-2">...</span>
          </li>
        );
      }
      return (
        <li key={p} className={`page-item ${pagination.page === p ? "active" : ""}`}>
          <button
            className="page-link"
            style={{
              backgroundColor: pagination.page === p ? "var(--color-primary-green)" : undefined,
              borderColor: pagination.page === p ? "var(--color-primary-green)" : undefined,
            }}
            onClick={() => setPage(p)}
          >
            {p}
          </button>
        </li>
      );
    });
  };

  const startItem = pagination.totalItems === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="staff-queue-container">
      {/* Header & Item Count */}
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-2">
        <div>
          <h1 className="h3 fw-bold text-main mb-1" data-testid="queue-title">
            Ticket Queue
          </h1>
          <p className="text-muted small mb-0" data-testid="queue-summary-count">
            {pagination.totalItems === 0
              ? "No tickets found"
              : `Showing ${startItem} to ${endItem} of ${pagination.totalItems} tickets`}
          </p>
        </div>
      </div>

      {/* Filter and Search Controls Bar */}
      <div className="card zen-card p-3 mb-4 shadow-sm">
        <div className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-lg-4">
            <div className="input-group">
              <span className="input-group-text bg-white border-end-0 text-muted">
                🔍
              </span>
              <input
                type="text"
                className="form-control border-start-0"
                placeholder="Search ticket # or summary..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                data-testid="search-input"
              />
              {search && (
                <button
                  className="btn btn-outline-secondary border-start-0"
                  type="button"
                  onClick={() => handleSearchChange("")}
                  title="Clear search"
                  data-testid="clear-search-btn"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Select */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              data-testid="category-filter"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Select */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
              data-testid="status-filter"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_REQUESTER">Waiting for Requester</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
              <option value="REOPENED">Reopened</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {/* IT Priority Select */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select"
              value={selectedPriority}
              onChange={(e) => handlePriorityChange(e.target.value)}
              data-testid="priority-filter"
            >
              <option value="">All Priorities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>

          {/* Assignment Select */}
          <div className="col-6 col-md-3 col-lg-2">
            <select
              className="form-select"
              value={selectedAssignment}
              onChange={(e) => handleAssignmentChange(e.target.value)}
              data-testid="assignment-filter"
            >
              <option value="">All Assignments</option>
              <option value="unassigned">Unassigned</option>
              <option value="me">Assigned to Me</option>
            </select>
          </div>
        </div>

        {/* Active Filters Clear Button */}
        {hasActiveFilters && (
          <div className="mt-3 pt-2 border-top d-flex align-items-center justify-content-between">
            <span className="small text-muted">Active filters applied</span>
            <button
              className="btn btn-sm btn-link text-decoration-none text-danger p-0"
              onClick={handleClearFilters}
              data-testid="clear-filters-btn"
            >
              Clear all filters
            </button>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger d-flex align-items-center justify-content-between" role="alert">
          <div>
            <strong>Error: </strong> {error}
          </div>
          <button className="btn btn-sm btn-outline-danger" onClick={loadTickets}>
            Retry
          </button>
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="card zen-card p-5 text-center my-4" data-testid="queue-loading">
          <div className="spinner-border text-success mx-auto mb-3" role="status">
            <span className="visually-hidden">Loading ticket queue...</span>
          </div>
          <p className="text-muted mb-0">Loading ticket queue...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty State */
        <div className="card zen-card p-5 text-center my-4" data-testid="queue-empty-state">
          <div className="fs-1 text-muted mb-2">📋</div>
          <h3 className="h5 fw-bold mb-2">No tickets found</h3>
          <p className="text-muted mb-3">
            {hasActiveFilters
              ? "No tickets match your filter criteria. Try adjusting or clearing your filters."
              : "There are currently no tickets in the shared queue."}
          </p>
          {hasActiveFilters && (
            <div>
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={handleClearFilters}
                data-testid="empty-clear-filters-btn"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (≥768px) */}
          <div className="d-none d-md-block card zen-card shadow-sm overflow-hidden mb-4">
            <div className="table-responsive">
              <table className="table queue-table mb-0 align-middle">
                <thead>
                  <tr>
                    <th
                      style={{ cursor: "pointer", width: "160px" }}
                      onClick={() => handleSort("ticketNumber")}
                      data-testid="sort-ticket-number"
                    >
                      Ticket No. {renderSortIndicator("ticketNumber")}
                    </th>
                    <th
                      style={{ cursor: "pointer", width: "170px" }}
                      onClick={() => handleSort("createdAt")}
                      data-testid="sort-created-at"
                    >
                      Created Date {renderSortIndicator("createdAt")}
                    </th>
                    <th>Summary</th>
                    <th style={{ width: "140px" }}>Category</th>
                    <th style={{ width: "110px" }}>Req. Priority</th>
                    <th
                      style={{ cursor: "pointer", width: "110px" }}
                      onClick={() => handleSort("itPriority")}
                      data-testid="sort-it-priority"
                    >
                      IT Priority {renderSortIndicator("itPriority")}
                    </th>
                    <th
                      style={{ cursor: "pointer", width: "140px" }}
                      onClick={() => handleSort("currentStatus")}
                      data-testid="sort-status"
                    >
                      Status {renderSortIndicator("currentStatus")}
                    </th>
                    <th style={{ width: "150px" }}>Owner</th>
                    <th style={{ width: "110px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr
                      key={ticket.id}
                      onClick={() => onSelectTicket?.(ticket.id)}
                      data-testid={`queue-row-${ticket.id}`}
                    >
                      <td>
                        <button
                          type="button"
                          className="btn btn-link p-0 ticket-number-mono"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket?.(ticket.id);
                          }}
                          data-testid="ticket-number-link"
                        >
                          {ticket.ticketNumber}
                        </button>
                      </td>
                      <td className="small text-muted">
                        {formatDate(ticket.createdAt)}
                      </td>
                      <td>
                        <div className="summary-cell" title={ticket.summary}>
                          {ticket.summary}
                        </div>
                      </td>
                      <td className="small text-muted">
                        {ticket.category?.name || "—"}
                      </td>
                      <td>{renderPriorityBadge(ticket.requestedPriority)}</td>
                      <td>{renderPriorityBadge(ticket.itPriority)}</td>
                      <td>{renderStatusBadge(ticket.currentStatus)}</td>
                      <td className="small">
                        {ticket.owner ? (
                          <span className="fw-medium text-main">{ticket.owner.name}</span>
                        ) : (
                          <span className="text-muted fst-italic">Unassigned</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTicket?.(ticket.id);
                          }}
                          data-testid="view-details-btn"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card View (<768px) */}
          <div className="d-md-none mobile-card-container mb-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="card zen-card mobile-ticket-card p-3 mb-3 shadow-sm"
                data-testid={`queue-card-${ticket.id}`}
              >
                {/* Header: Ticket No & Status */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="ticket-number-mono">{ticket.ticketNumber}</span>
                  {renderStatusBadge(ticket.currentStatus)}
                </div>

                {/* Title / Summary */}
                <h2 className="h6 fw-bold text-main mb-2">
                  {ticket.summary}
                </h2>

                {/* Grid Metadata */}
                <div className="row g-2 small text-muted mb-3">
                  <div className="col-6">
                    <span className="d-block text-muted opacity-75">Requester:</span>
                    <span className="text-main fw-medium">{ticket.requester?.name || "—"}</span>
                  </div>
                  <div className="col-6">
                    <span className="d-block text-muted opacity-75">IT Priority:</span>
                    {renderPriorityBadge(ticket.itPriority)}
                  </div>
                  <div className="col-6">
                    <span className="d-block text-muted opacity-75">Owner:</span>
                    {ticket.owner ? (
                      <span className="text-main fw-medium">{ticket.owner.name}</span>
                    ) : (
                      <span className="text-muted fst-italic">Unassigned</span>
                    )}
                  </div>
                  <div className="col-6">
                    <span className="d-block text-muted opacity-75">Created:</span>
                    <span>{formatDate(ticket.createdAt)}</span>
                  </div>
                </div>

                {/* Action Footer: Touch target >= 44px */}
                <button
                  type="button"
                  className="btn btn-zen-primary w-100 btn-touch-target"
                  onClick={() => onSelectTicket?.(ticket.id)}
                  data-testid="mobile-open-detail-btn"
                >
                  Open Ticket Detail
                </button>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="d-flex justify-content-center align-items-center my-3" data-testid="pagination-controls">
              <nav aria-label="Ticket Queue Pagination">
                <ul className="pagination mb-0">
                  <li className={`page-item ${pagination.page <= 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(pagination.page - 1)}
                      disabled={pagination.page <= 1}
                      data-testid="pagination-prev"
                    >
                      &laquo; Previous
                    </button>
                  </li>
                  {renderPaginationButtons()}
                  <li className={`page-item ${pagination.page >= pagination.totalPages ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage(pagination.page + 1)}
                      disabled={pagination.page >= pagination.totalPages}
                      data-testid="pagination-next"
                    >
                      Next &raquo;
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </>
      )}
    </div>
  );
};
