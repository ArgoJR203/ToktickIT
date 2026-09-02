import React, { useState, useEffect } from "react";
import { useRequester } from "../context/RequesterContext.js";
import {
  fetchCategories,
  fetchTickets,
  Category,
  TicketItem,
  PaginatedTicketsResponse,
} from "../api.js";

interface MyTicketsProps {
  onCreateClick: () => void;
  onSelectTicket?: (ticketId: number) => void;
}

export const MyTickets: React.FC<MyTicketsProps> = ({ onCreateClick, onSelectTicket }) => {
  const { currentRequester } = useRequester();

  const [categories, setCategories] = useState<Category[]>([]);
  const [tickets, setTickets] = useState<TicketItem[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    totalItems: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState<number>(1);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Categories for filter dropdown
  useEffect(() => {
    fetchCategories()
      .then((data) => setCategories(data))
      .catch((err) => console.error("Failed to load categories for filter:", err));
  }, []);

  // Reset to Page 1 whenever search or filter selections change
  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleCategoryChange = (val: string) => {
    setSelectedCategory(val);
    setPage(1);
  };

  const handlePriorityChange = (val: string) => {
    setSelectedPriority(val);
    setPage(1);
  };

  const handleStatusChange = (val: string) => {
    setSelectedStatus(val);
    setPage(1);
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedCategory("");
    setSelectedPriority("");
    setSelectedStatus("");
    setSortBy("createdAt");
    setSortOrder("desc");
    setPage(1);
  };

  const hasActiveFilters = Boolean(search || selectedCategory || selectedPriority || selectedStatus);

  // Toggle sort order or field
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  };

  // Fetch ticket list
  useEffect(() => {
    if (!currentRequester) return;

    let isMounted = true;
    setIsLoading(true);
    setError(null);

    fetchTickets(
      {
        search,
        categoryId: selectedCategory,
        requestedPriority: selectedPriority,
        currentStatus: selectedStatus,
        sortBy,
        sortOrder,
        page,
        pageSize: 10,
      },
      currentRequester.id
    )
      .then((res: PaginatedTicketsResponse) => {
        if (isMounted) {
          setTickets(res.data);
          setPagination(res.pagination);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load tickets.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [
    currentRequester,
    search,
    selectedCategory,
    selectedPriority,
    selectedStatus,
    sortBy,
    sortOrder,
    page,
  ]);

  const renderPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <span className="badge bg-danger">URGENT</span>;
      case "HIGH":
        return <span className="badge bg-warning text-dark">HIGH</span>;
      case "MEDIUM":
        return <span className="badge bg-info text-dark">MEDIUM</span>;
      case "LOW":
        return <span className="badge bg-secondary">LOW</span>;
      default:
        return <span className="badge bg-light text-dark">{priority}</span>;
    }
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span
            className="badge"
            style={{
              backgroundColor: "var(--color-pale-green)",
              color: "var(--color-primary-green)",
              border: "1px solid var(--color-secondary-green)",
            }}
          >
            NEW
          </span>
        );
      case "IN_PROGRESS":
        return <span className="badge bg-primary">IN PROGRESS</span>;
      case "PENDING":
        return <span className="badge bg-warning text-dark">PENDING</span>;
      case "RESOLVED":
        return <span className="badge bg-success">RESOLVED</span>;
      case "CLOSED":
        return <span className="badge bg-dark">CLOSED</span>;
      default:
        return <span className="badge bg-light text-dark">{status}</span>;
    }
  };

  const renderSortIndicator = (field: string) => {
    if (sortBy !== field) return <span className="text-muted opacity-25 ms-1">↕</span>;
    return <span className="ms-1">{sortOrder === "asc" ? "▲" : "▼"}</span>;
  };

  const startItem = (pagination.page - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);

  return (
    <div className="zen-card p-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
        <div>
          <h2 className="h4 fw-bold mb-1" style={{ color: "var(--color-text-main)" }}>
            My Tickets
          </h2>
          <p className="text-muted small mb-0">
            Showing IT support tickets submitted by <strong>{currentRequester?.name}</strong> (
            {currentRequester?.email})
          </p>
        </div>
        <button className="btn btn-zen-primary" onClick={onCreateClick}>
          + Create Ticket
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert zen-alert-danger mb-4 small d-flex justify-content-between" role="alert">
          <span>{error}</span>
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-3 mb-4 rounded border bg-light">
        <div className="row g-2 align-items-center">
          {/* Search Input */}
          <div className="col-12 col-md-4">
            <div className="input-group input-group-sm">
              <span className="input-group-text bg-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search ticket # or summary..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
          </div>

          {/* Category Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={selectedPriority}
              onChange={(e) => handlePriorityChange(e.target.value)}
            >
              <option value="">All Priorities</option>
              <option value="LOW">LOW</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HIGH">HIGH</option>
              <option value="URGENT">URGENT</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="col-6 col-md-2">
            <select
              className="form-select form-select-sm"
              value={selectedStatus}
              onChange={(e) => handleStatusChange(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="NEW">NEW</option>
              <option value="IN_PROGRESS">IN PROGRESS</option>
              <option value="PENDING">PENDING</option>
              <option value="RESOLVED">RESOLVED</option>
              <option value="CLOSED">CLOSED</option>
            </select>
          </div>

          {/* Clear Filters */}
          <div className="col-6 col-md-2 text-end">
            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-sm btn-link text-decoration-none text-muted p-0 small"
                onClick={handleClearFilters}
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-success" role="status">
            <span className="visually-hidden">Loading tickets...</span>
          </div>
          <p className="text-muted small mt-2">Loading ticket list...</p>
        </div>
      ) : tickets.length === 0 ? (
        /* Empty / No-Results States */
        <div className="text-center py-5 border rounded bg-white my-3 p-4">
          <svg className="mb-3 text-muted opacity-50" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
            <line x1="9" y1="15" x2="15" y2="15"></line>
          </svg>
          {hasActiveFilters ? (
            <div>
              <h3 className="h6 fw-semibold text-dark mb-1">No matching tickets found</h3>
              <p className="text-muted small mb-3">No tickets matched your search criteria. Try clearing your search or filters.</p>
              <button className="btn btn-sm btn-outline-secondary" onClick={handleClearFilters}>
                Clear Filters
              </button>
            </div>
          ) : (
            <div>
              <h3 className="h6 fw-semibold text-dark mb-1">No tickets submitted yet</h3>
              <p className="text-muted small mb-3">You haven't submitted any IT support tickets yet. Click below to get started.</p>
              <button className="btn btn-zen-primary btn-sm" onClick={onCreateClick}>
                + Create Ticket
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          {/* Desktop Table View (>=768px) */}
          <div className="table-responsive d-none d-md-block mb-4">
            <table className="table table-hover align-middle mb-0 border">
              <thead style={{ backgroundColor: "var(--color-primary-green)", color: "#FFFFFF" }}>
                <tr>
                  <th
                    className="user-select-none cursor-pointer text-white"
                    onClick={() => handleSort("ticketNumber")}
                    style={{ width: "16%" }}
                  >
                    Ticket No. {renderSortIndicator("ticketNumber")}
                  </th>
                  <th
                    className="user-select-none cursor-pointer text-white"
                    onClick={() => handleSort("createdAt")}
                    style={{ width: "16%" }}
                  >
                    Created Date {renderSortIndicator("createdAt")}
                  </th>
                  <th className="text-white" style={{ width: "32%" }}>
                    Summary
                  </th>
                  <th className="text-white" style={{ width: "16%" }}>
                    Category
                  </th>
                  <th
                    className="user-select-none cursor-pointer text-white"
                    onClick={() => handleSort("requestedPriority")}
                    style={{ width: "10%" }}
                  >
                    Priority {renderSortIndicator("requestedPriority")}
                  </th>
                  <th
                    className="user-select-none cursor-pointer text-white text-center"
                    onClick={() => handleSort("currentStatus")}
                    style={{ width: "10%" }}
                  >
                    Status {renderSortIndicator("currentStatus")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    className="cursor-pointer"
                    onClick={() => onSelectTicket && onSelectTicket(ticket.id)}
                    style={{ transition: "background-color 0.15s ease" }}
                  >
                    <td className="fw-semibold font-monospace small" style={{ color: "var(--color-primary-green)" }}>
                      {ticket.ticketNumber}
                    </td>
                    <td className="small text-muted">
                      {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="fw-medium text-dark text-truncate" style={{ maxWidth: 300 }}>
                      {ticket.summary}
                    </td>
                    <td className="small text-muted">{ticket.category?.name || "Uncategorized"}</td>
                    <td>{renderPriorityBadge(ticket.requestedPriority)}</td>
                    <td className="text-center">{renderStatusBadge(ticket.currentStatus)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List View (<768px, AC-09) */}
          <div className="d-md-none mb-4">
            {tickets.map((ticket) => (
              <div
                key={ticket.id}
                className="card mb-3 shadow-sm border cursor-pointer"
                onClick={() => onSelectTicket && onSelectTicket(ticket.id)}
                style={{ backgroundColor: "#FFFFFF" }}
              >
                <div className="card-body p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span className="fw-bold font-monospace small" style={{ color: "var(--color-primary-green)" }}>
                      {ticket.ticketNumber}
                    </span>
                    {renderStatusBadge(ticket.currentStatus)}
                  </div>
                  <h3 className="h6 fw-bold text-dark mb-2">{ticket.summary}</h3>
                  <div className="d-flex justify-content-between align-items-center text-muted extra-small pt-2 border-top">
                    <span>
                      {ticket.category?.name} • {renderPriorityBadge(ticket.requestedPriority)}
                    </span>
                    <span>
                      {new Date(ticket.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-center pt-2">
            <div className="text-muted small mb-2 mb-md-0">
              Showing <strong>{startItem}</strong>–<strong>{endItem}</strong> of{" "}
              <strong>{pagination.totalItems}</strong> tickets
            </div>
            {pagination.totalPages > 1 && (
              <nav aria-label="Ticket list pagination">
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${pagination.page === 1 ? "disabled" : ""}`}>
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={pagination.page === 1}
                    >
                      Previous
                    </button>
                  </li>
                  {Array.from({ length: pagination.totalPages }).map((_, idx) => {
                    const pageNum = idx + 1;
                    return (
                      <li
                        key={pageNum}
                        className={`page-item ${pagination.page === pageNum ? "active" : ""}`}
                      >
                        <button
                          className="page-link"
                          style={{
                            backgroundColor:
                              pagination.page === pageNum ? "var(--color-primary-green)" : undefined,
                            borderColor:
                              pagination.page === pageNum ? "var(--color-primary-green)" : undefined,
                          }}
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </button>
                      </li>
                    );
                  })}
                  <li
                    className={`page-item ${
                      pagination.page === pagination.totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      className="page-link"
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={pagination.page === pagination.totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </>
      )}
    </div>
  );
};
