import React, { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { Header } from "./components/Header.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
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
          <MyTickets
            onCreateClick={() => {
              setCreatedTicketNotice(null);
              setActiveTab("create-ticket");
            }}
          />
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

