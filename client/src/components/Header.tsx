import React from "react";
import { useRequester } from "../context/RequesterContext.js";

interface HeaderProps {
  activeTab: "my-tickets" | "create-ticket";
  onTabChange: (tab: "my-tickets" | "create-ticket") => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, onTabChange }) => {
  const { currentRequester, changeRequester } = useRequester();

  return (
    <header
      className="navbar navbar-expand px-4 text-white shadow-sm"
      style={{
        backgroundColor: "var(--color-primary-green)",
        minHeight: "60px",
      }}
    >
      <div className="container-fluid px-0 d-flex justify-content-between align-items-center">
        {/* Left: Brand + Nav Links */}
        <div className="d-flex align-items-center">
          <a
            href="#"
            className="navbar-brand text-white fw-bold d-flex align-items-center me-4"
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
            <span>TokTickIT</span>
          </a>

          {/* Navigation Links */}
          <nav className="d-flex">
            <button
              className={`btn btn-link text-white text-decoration-none me-2 px-3 py-1 rounded ${
                activeTab === "my-tickets" ? "fw-semibold" : "opacity-75"
              }`}
              style={{
                backgroundColor: activeTab === "my-tickets" ? "var(--color-secondary-green)" : "transparent",
              }}
              onClick={() => onTabChange("my-tickets")}
            >
              My Tickets
            </button>
            <button
              className={`btn btn-link text-white text-decoration-none px-3 py-1 rounded ${
                activeTab === "create-ticket" ? "fw-semibold" : "opacity-75"
              }`}
              style={{
                backgroundColor: activeTab === "create-ticket" ? "var(--color-secondary-green)" : "transparent",
              }}
              onClick={() => onTabChange("create-ticket")}
            >
              Create Ticket
            </button>
          </nav>
        </div>

        {/* Right: User Identity Badge + Change Requester Action */}
        {currentRequester && (
          <div className="d-flex align-items-center">
            <div className="d-flex align-items-center me-3 px-3 py-1 rounded bg-black bg-opacity-25 text-white small">
              <svg
                className="me-2"
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
              <span>{currentRequester.name}</span>
            </div>
            <button
              className="btn btn-sm btn-outline-light"
              onClick={changeRequester}
              title="Switch to another development requester"
            >
              Change Requester
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
