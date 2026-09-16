import React, { useContext } from "react";
import { useAuth } from "../context/AuthContext.js";
import { RequesterContext } from "../context/RequesterContext.js";

export type NavTab =
  | "my-tickets"
  | "create-ticket"
  | "ticket-detail"
  | "ticket-queue"
  | "user-management";

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onSwitchToLogin?: () => void;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return (name[0] || "U").toUpperCase();
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange, onSwitchToLogin }) => {
  const { currentUser, logout } = useAuth();
  const requesterCtx = useContext(RequesterContext);
  const currentRequester = requesterCtx?.currentRequester;
  const changeRequester = requesterCtx?.changeRequester;

  const isMyTicketsActive = activeTab === "my-tickets" || activeTab === "ticket-detail";
  const isQueueActive = activeTab === "ticket-queue" || activeTab === "ticket-detail";

  const handleBrandClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentUser?.role === "ADMINISTRATOR") {
      onTabChange("user-management");
    } else if (currentUser?.role === "IT_STAFF") {
      onTabChange("ticket-queue");
    } else {
      onTabChange("my-tickets");
    }
  };

  return (
    <header
      className="text-white shadow-sm"
      style={{
        backgroundColor: "var(--color-primary-green)",
        minHeight: "60px",
      }}
    >
      <div
        className="container py-2 py-md-0 d-flex flex-wrap justify-content-between align-items-center"
        style={{ minHeight: "60px" }}
      >
        {/* Left: Brand */}
        <div className="d-flex align-items-center py-1 order-1 me-lg-3">
          <a
            href="#"
            className="navbar-brand text-white fw-bold d-flex align-items-center me-3 text-decoration-none"
            onClick={handleBrandClick}
          >
            <svg
              className="me-2"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            <span className="fs-5">TokTickIT</span>
          </a>
        </div>

        {/* Right side: User Profile Controls & Logout (Single DOM instance, order-2 on tablet/mobile, order-lg-3 on desktop) */}
        {currentUser ? (
          <div className="d-flex align-items-center order-2 order-lg-3 py-1 ms-auto">
            {/* Avatar with initials */}
            <div
              className="rounded-circle d-flex align-items-center justify-content-center fw-bold me-2 flex-shrink-0"
              style={{
                width: "32px",
                height: "32px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "#ffffff",
                fontSize: "0.8rem",
                border: "1px solid rgba(255, 255, 255, 0.3)",
              }}
              aria-hidden="true"
            >
              {getInitials(currentUser.name)}
            </div>

            {/* Name + Role Badge */}
            <div className="d-flex align-items-center me-2 me-md-3 px-2 px-md-3 py-1 rounded bg-black bg-opacity-25 text-white small header-user-badge">
              <span className="text-truncate me-2 fw-medium">{currentUser.name}</span>
              {currentUser.role === "REQUESTER" && (
                <span className="badge-role badge-role-requester" data-testid="role-badge">
                  Requester
                </span>
              )}
              {currentUser.role === "IT_STAFF" && (
                <span className="badge-role badge-role-it-staff" data-testid="role-badge">
                  IT Staff
                </span>
              )}
              {currentUser.role === "ADMINISTRATOR" && (
                <span className="badge-role badge-role-admin" data-testid="role-badge">
                  Administrator
                </span>
              )}
            </div>

            {/* Logout Button */}
            <button
              className="btn btn-sm btn-outline-light d-flex align-items-center text-nowrap"
              onClick={logout}
              title="Sign out of TokTickIT"
              aria-label="Logout"
            >
              <svg
                className="me-1"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Logout</span>
            </button>
          </div>
        ) : currentRequester ? (
          /* Legacy Dev Requester display for backwards compatibility during Lab 2 tests */
          <div className="d-flex align-items-center order-2 order-lg-3 py-1 ms-auto">
            <div className="d-flex align-items-center me-2 me-md-3 px-2 px-md-3 py-1 rounded bg-black bg-opacity-25 text-white small text-truncate header-user-badge">
              <svg
                className="me-1 me-md-2 flex-shrink-0"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              <span className="text-truncate">{currentRequester.name}</span>
            </div>
            {changeRequester && (
              <button
                className="btn btn-sm btn-outline-light text-nowrap me-2"
                onClick={changeRequester}
                title="Switch to another development requester"
              >
                Change Requester
              </button>
            )}
            {onSwitchToLogin && (
              <button
                className="btn btn-sm btn-outline-light text-nowrap"
                onClick={onSwitchToLogin}
                title="Exit development mode and return to Sign In"
              >
                Sign In (Lab 3)
              </button>
            )}
          </div>
        ) : null}

        {/* Navigation Links: Role-Tailored (UI Spec §3.1, FR-06) */}
        <nav className="d-flex gap-2 order-3 order-lg-2 header-nav py-1 mt-1 mt-lg-0 me-lg-auto">
          {currentUser?.role === "ADMINISTRATOR" ? (
            <>
              {/* Administrator Navigation */}
              <button
                className={`btn btn-link text-white text-decoration-none px-3 py-2 rounded flex-fill flex-lg-grow-0 text-center ${
                  activeTab === "user-management" ? "fw-semibold" : "opacity-75"
                }`}
                style={{
                  backgroundColor:
                    activeTab === "user-management"
                      ? "var(--color-secondary-green)"
                      : "transparent",
                  transition: "all 0.15s ease",
                }}
                onClick={() => onTabChange("user-management")}
              >
                User Management
              </button>
              <button
                className={`btn btn-link text-white text-decoration-none px-3 py-2 rounded flex-fill flex-lg-grow-0 text-center ${
                  isQueueActive ? "fw-semibold" : "opacity-75"
                }`}
                style={{
                  backgroundColor: isQueueActive
                    ? "var(--color-secondary-green)"
                    : "transparent",
                  transition: "all 0.15s ease",
                }}
                onClick={() => onTabChange("ticket-queue")}
              >
                Ticket Queue
              </button>
            </>
          ) : currentUser?.role === "IT_STAFF" ? (
            <>
              {/* IT Staff Navigation */}
              <button
                className={`btn btn-link text-white text-decoration-none px-3 py-2 rounded flex-fill flex-lg-grow-0 text-center ${
                  isQueueActive ? "fw-semibold" : "opacity-75"
                }`}
                style={{
                  backgroundColor: isQueueActive
                    ? "var(--color-secondary-green)"
                    : "transparent",
                  transition: "all 0.15s ease",
                }}
                onClick={() => onTabChange("ticket-queue")}
              >
                Ticket Queue
              </button>
              <button
                className={`btn btn-link text-white text-decoration-none px-3 py-2 rounded flex-fill flex-lg-grow-0 text-center ${
                  activeTab === "create-ticket" ? "fw-semibold" : "opacity-75"
                }`}
                style={{
                  backgroundColor:
                    activeTab === "create-ticket"
                      ? "var(--color-secondary-green)"
                      : "transparent",
                  transition: "all 0.15s ease",
                }}
                onClick={() => onTabChange("create-ticket")}
              >
                Create Ticket
              </button>
            </>
          ) : (
            <>
              {/* Requester Navigation (Default & Fallback) */}
              <button
                className={`btn btn-link text-white text-decoration-none px-3 py-2 rounded flex-fill flex-lg-grow-0 text-center ${
                  isMyTicketsActive ? "fw-semibold" : "opacity-75"
                }`}
                style={{
                  backgroundColor: isMyTicketsActive
                    ? "var(--color-secondary-green)"
                    : "transparent",
                  transition: "all 0.15s ease",
                }}
                onClick={() => onTabChange("my-tickets")}
              >
                My Tickets
              </button>
              <button
                className={`btn btn-link text-white text-decoration-none px-3 py-2 rounded flex-fill flex-lg-grow-0 text-center ${
                  activeTab === "create-ticket" ? "fw-semibold" : "opacity-75"
                }`}
                style={{
                  backgroundColor:
                    activeTab === "create-ticket"
                      ? "var(--color-secondary-green)"
                      : "transparent",
                  transition: "all 0.15s ease",
                }}
                onClick={() => onTabChange("create-ticket")}
              >
                Create Ticket
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
