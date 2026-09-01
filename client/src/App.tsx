import React, { useState } from "react";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { Header } from "./components/Header.js";

type NavTab = "my-tickets" | "create-ticket";

function MainContent() {
  const { currentRequester } = useRequester();
  const [activeTab, setActiveTab] = useState<NavTab>("my-tickets");

  // Route Guard: If no requester context is selected, force Dev Requester Selector
  if (!currentRequester) {
    return <RequesterSelector />;
  }

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-bg-quiet)" }}>
      <Header activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="container py-4 flex-grow-1">
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
                onClick={() => setActiveTab("create-ticket")}
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
                The My Tickets dashboard and Create Ticket workflows will be loaded in the upcoming feature steps.
              </p>
            </div>
          </div>
        )}

        {activeTab === "create-ticket" && (
          <div className="zen-card p-4" style={{ maxWidth: 900, margin: "0 auto" }}>
            <div className="mb-4">
              <h2 className="h4 fw-bold mb-1">Create IT Support Ticket</h2>
              <p className="text-muted small">Submit a new request for IT assistance</p>
            </div>

            {/* Form placeholder until Issue #2-5 */}
            <div className="alert alert-light border p-4 text-center">
              <p className="mb-0 text-muted">
                Create Ticket form workflow is assigned to Feature #2-5.
              </p>
            </div>
          </div>
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
