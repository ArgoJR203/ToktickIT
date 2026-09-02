import React, { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { Header } from "./components/Header.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { Ticket } from "./api.js";

type NavTab = "my-tickets" | "create-ticket";

function MainContent() {
  const { currentRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<NavTab>("my-tickets");
  const [createdTicketNotice, setCreatedTicketNotice] = useState<string | null>(null);

  // Route Guard: If no requester context is selected, force Dev Requester Selector
  if (!currentRequester) {
    return <RequesterSelector />;
  }

  const handleTicketCreated = (ticket: Ticket) => {
    setCreatedTicketNotice(`Ticket ${ticket.ticketNumber} created successfully.`);
    setActiveTab("my-tickets");
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-bg-quiet)" }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container py-4 flex-grow-1">
        {/* Success Banner when Ticket is Created */}
        {createdTicketNotice && activeTab === "my-tickets" && (
          <div
            className="alert zen-alert-success mb-4 d-flex justify-content-between align-items-center"
            role="alert"
          >
            <div className="d-flex align-items-center me-2">
              <svg className="me-2 flex-shrink-0" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2E7D32" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
              <span>{createdTicketNotice}</span>
            </div>
            <button
              type="button"
              className="btn-close"
              onClick={() => setCreatedTicketNotice(null)}
              aria-label="Close"
            ></button>
          </div>
        )}

        {activeTab === "my-tickets" && (
          <div className="zen-card p-4">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h2 className="h4 fw-bold mb-1" style={{ color: "var(--color-text-main)" }}>
                  My Tickets
                </h2>
                <p className="text-muted small mb-0">
                  Showing IT support tickets submitted by <strong>{currentRequester.name}</strong> ({currentRequester.email})
                </p>
              </div>
              <button
                className="btn btn-zen-primary"
                onClick={() => {
                  setCreatedTicketNotice(null);
                  setActiveTab("create-ticket");
                }}
              >
                + Create Ticket
              </button>
            </div>

            {/* Dashboard placeholder until Issue #2-6 */}
            <div className="alert zen-alert-success p-4 text-center">
              <h3 className="h5 fw-semibold mb-2">Requester Context Established!</h3>
              <p className="mb-0 small text-muted">
                Active Requester: <strong>{currentRequester.name}</strong> (ID: {currentRequester.id})
              </p>
              <p className="mt-2 mb-0 small">
                The My Tickets dashboard table will be loaded in Issue #2-6. Click <strong>+ Create Ticket</strong> above to test ticket submission.
              </p>
            </div>
          </div>
        )}

        {activeTab === "create-ticket" && (
          <CreateTicket
            onSuccess={handleTicketCreated}
            onCancel={() => setActiveTab("my-tickets")}
          />
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <RequesterProvider>
      <MainContent />
    </RequesterProvider>
  );
}

