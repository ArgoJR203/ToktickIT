import React from "react";
import { useRequester } from "../context/RequesterContext.js";

export type NavTab = "my-tickets" | "create-ticket" | "ticket-detail";

interface HeaderProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const { currentRequester, changeRequester } = useRequester();

  const isMyTicketsActive = activeTab === "my-tickets" || activeTab === "ticket-detail";

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
            onClick={(e) => {
              e.preventDefault();
              onTabChange("my-tickets");
            }}
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

        {/* Right side: User Identity Badge + Change Requester (Single DOM instance, order-2 on tablet/mobile, order-lg-3 on desktop) */}
        {currentRequester && (
          <div className="d-flex align-items-center order-2 order-lg-3 py-1 ms-auto">
            <div
              className="d-flex align-items-center me-2 me-md-3 px-2 px-md-3 py-1 rounded bg-black bg-opacity-25 text-white small text-truncate header-user-badge"
            >
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
            <button
              className="btn btn-sm btn-outline-light text-nowrap"
              onClick={changeRequester}
              title="Switch to another development requester"
            >
              Change Requester
            </button>
          </div>
        )}

        {/* Navigation Links: Left-aligned next to brand on desktop via me-lg-auto; full width on mobile/tablet via order-3 */}
        <nav className="d-flex gap-2 order-3 order-lg-2 header-nav py-1 mt-1 mt-lg-0 me-lg-auto">
          <button
            className={`btn btn-link text-white text-decoration-none px-3 py-2 rounded flex-fill flex-lg-grow-0 text-center ${
              isMyTicketsActive ? "fw-semibold" : "opacity-75"
            }`}
            style={{
              backgroundColor: isMyTicketsActive ? "var(--color-secondary-green)" : "transparent",
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
              backgroundColor: activeTab === "create-ticket" ? "var(--color-secondary-green)" : "transparent",
              transition: "all 0.15s ease",
            }}
            onClick={() => onTabChange("create-ticket")}
          >
            Create Ticket
          </button>
        </nav>
      </div>
    </header>
  );
};
