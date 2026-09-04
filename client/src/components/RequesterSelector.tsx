import React, { useState } from "react";
import { useRequester } from "../context/RequesterContext.js";

export const RequesterSelector: React.FC = () => {
  const { requesters, loading, error, selectRequester, refetchRequesters } = useRequester();
  const [selectedId, setSelectedId] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) return;
    const user = requesters.find((r) => r.id === Number(selectedId));
    if (user) {
      selectRequester(user);
    }
  };

  const formatErrorMessage = (msg: string) => {
    const lower = msg.toLowerCase();
    if (
      lower.includes("failed to fetch") ||
      lower.includes("fetch failed") ||
      lower.includes("networkerror") ||
      lower.includes("load failed") ||
      lower.includes("econnrefused")
    ) {
      return "Unable to connect to the backend server. The server may be offline or unreachable. Please verify that the backend is running.";
    }
    return msg;
  };

  return (
    <div className="container d-flex justify-content-center align-items-center min-vh-100 py-5">
      <div className="zen-card p-4 shadow-sm w-100" style={{ maxWidth: 480 }}>
        {/* Brand Header */}
        <div className="text-center mb-4">
          <div className="d-inline-flex align-items-center justify-content-center bg-light text-success rounded-circle p-3 mb-2" style={{ width: 64, height: 64 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <h1 className="h4 fw-bold mb-1" style={{ color: "var(--color-primary-green)" }}>
            TokTickIT
          </h1>
          <p className="text-muted small">Development Requester Selector</p>
        </div>

        {/* Amber Notice Callout */}
        <div className="alert zen-alert-warning p-3 mb-4 small" role="alert">
          <div className="d-flex align-items-start">
            <svg className="me-2 flex-shrink-0 mt-1" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-warning-badge)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <div>
              <strong>Testing Mode:</strong> Select a Development Requester to test requester-specific ticket behavior. This is a testing mechanism for Lab 2, not secure authentication.
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-4">
            <div className="spinner-border text-success mb-2" role="status">
              <span className="visually-hidden">Loading requesters...</span>
            </div>
            <p className="text-muted small">Loading available requesters...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="alert zen-alert-danger p-3 mb-4 small" role="alert">
            <div className="d-flex align-items-start mb-2">
              <svg
                className="me-2 flex-shrink-0 mt-1"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--color-error-text)"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <div>
                <strong>Server Connection Error:</strong>
                <p className="mb-0 mt-1">{formatErrorMessage(error)}</p>
              </div>
            </div>
            <div className="mt-2 text-end">
              <button className="btn btn-sm btn-outline-danger" onClick={refetchRequesters}>
                Retry Connection
              </button>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && requesters.length === 0 && (
          <div className="alert alert-secondary p-3 mb-4 text-center small" role="alert">
            No active development requesters found in database.
          </div>
        )}

        {/* Selection Form */}
        {!loading && !error && requesters.length > 0 && (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="requester-select" className="form-label fw-medium small mb-2">
                Development Requester <span className="required-asterisk">*</span>
              </label>
              <select
                id="requester-select"
                className="form-select"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
                required
              >
                <option value="">-- Select Requester Identity --</option>
                {requesters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.email})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-zen-primary w-100 py-2"
              disabled={!selectedId}
            >
              Continue
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
