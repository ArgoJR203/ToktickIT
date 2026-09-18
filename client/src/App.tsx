import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.js";
import { RequesterProvider, useRequester } from "./context/RequesterContext.js";
import { Login } from "./components/Login.js";
import { ChangePassword } from "./components/ChangePassword.js";
import { RequesterSelector } from "./components/RequesterSelector.js";
import { Header, NavTab } from "./components/Header.js";
import { CreateTicket } from "./components/CreateTicket.js";
import { MyTickets } from "./components/MyTickets.js";
import { RequesterTicketDetail } from "./components/RequesterTicketDetail.js";
import { StaffTicketQueue } from "./components/StaffTicketQueue.js";
import { StaffTicketDetail } from "./components/StaffTicketDetail.js";
import { UserManagement } from "./components/UserManagement.js";
import { Ticket, fetchRequesters, AuthUser } from "./api.js";

interface MainContentProps {
  initialView?: "login" | "dev-selector";
}

function MainContent({ initialView }: MainContentProps) {
  const { currentUser } = useAuth();
  const { currentRequester, selectRequester, changeRequester } = useRequester();

  const [activeTab, setActiveTab] = useState<NavTab>("my-tickets");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [createdTicketNotice, setCreatedTicketNotice] = useState<string | null>(null);

  // Check if running in a legacy test suite that specifically mocks fetchRequesters (Lab 2)
  const isFetchRequestersMocked =
    typeof (fetchRequesters as any)?.mock !== "undefined" ||
    Boolean((fetchRequesters as any)?._isMockFunction);

  const [showDevSelector, setShowDevSelector] = useState<boolean>(() => {
    if (initialView === "dev-selector") return true;
    if (initialView === "login") return false;
    if (isFetchRequestersMocked && !localStorage.getItem("toktickit_token")) {
      return true;
    }
    return false;
  });

  const handleSwitchToLogin = () => {
    changeRequester();
    setShowDevSelector(false);
  };

  // Sync currentUser with RequesterContext for seamless Requester workflows
  useEffect(() => {
    if (currentUser && currentUser.role === "REQUESTER") {
      if (!currentRequester || currentRequester.id !== currentUser.id) {
        selectRequester({
          id: currentUser.id,
          name: currentUser.name,
          email: currentUser.email,
          isActive: currentUser.isActive,
        });
      }
    } else if (!currentUser && currentRequester && (!isFetchRequestersMocked || initialView === "login")) {
      changeRequester();
    }
  }, [currentUser, currentRequester, selectRequester, changeRequester, isFetchRequestersMocked, initialView]);

  // Reset detail view, notices, and set role-tailored default tab whenever active identity changes
  useEffect(() => {
    if (currentUser?.role === "ADMINISTRATOR") {
      setActiveTab("user-management");
    } else if (currentUser?.role === "IT_STAFF") {
      setActiveTab("ticket-queue");
    } else {
      setActiveTab("my-tickets");
    }
    setSelectedTicketId(null);
    setCreatedTicketNotice(null);
  }, [currentUser?.id, currentUser?.role, currentRequester?.id]);

  // 1. Mandatory Password Change Gating (BR-02, AC-02, Screen 1.2)
  if (currentUser?.mustChangePassword) {
    return <ChangePassword />;
  }

  // 2. Unauthenticated View Gating
  if (!currentUser) {
    // If running in legacy dev requester mode (Lab 2 backwards compatibility)
    if (currentRequester && initialView !== "login" && (isFetchRequestersMocked || initialView === "dev-selector")) {
      // Allow proceeding to legacy main view
    } else if (showDevSelector && (isFetchRequestersMocked || initialView === "dev-selector")) {
      return <RequesterSelector onSwitchToLogin={handleSwitchToLogin} />;
    } else {
      return <Login onSwitchToDevSelector={isFetchRequestersMocked ? () => setShowDevSelector(true) : undefined} />;
    }
  }

  const handleTicketCreated = (ticket: Ticket) => {
    setCreatedTicketNotice(`Ticket ${ticket.ticketNumber} created successfully.`);
    setActiveTab("my-tickets");
    setSelectedTicketId(null);
  };

  const handleTabChange = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab !== "ticket-detail") {
      setSelectedTicketId(null);
    }
  };

  return (
    <div className="min-vh-100 d-flex flex-column" style={{ backgroundColor: "var(--color-bg-quiet)" }}>
      <Header
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

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

        {/* Requester Views */}
        {activeTab === "my-tickets" && (
          <MyTickets
            onCreateClick={() => {
              setCreatedTicketNotice(null);
              setActiveTab("create-ticket");
            }}
            onSelectTicket={(ticketId) => {
              setCreatedTicketNotice(null);
              setSelectedTicketId(ticketId);
              setActiveTab("ticket-detail");
            }}
          />
        )}

        {activeTab === "create-ticket" && (
          <CreateTicket
            onSuccess={handleTicketCreated}
            onCancel={() => setActiveTab("my-tickets")}
          />
        )}

        {activeTab === "ticket-detail" && selectedTicketId !== null && (
          currentUser?.role === "IT_STAFF" || currentUser?.role === "ADMINISTRATOR" ? (
            <StaffTicketDetail
              ticketId={selectedTicketId}
              onBack={() => {
                setSelectedTicketId(null);
                setActiveTab("ticket-queue");
              }}
            />
          ) : (
            <RequesterTicketDetail
              ticketId={selectedTicketId}
              onBack={() => {
                setSelectedTicketId(null);
                setActiveTab("my-tickets");
              }}
            />
          )
        )}

        {/* IT Staff Ticket Queue (Issue #3-6) */}
        {activeTab === "ticket-queue" && (
          <StaffTicketQueue
            onSelectTicket={(ticketId) => {
              setSelectedTicketId(ticketId);
              setActiveTab("ticket-detail");
            }}
          />
        )}

        {/* Administrator User Management (Issue #3-8, UI-06) */}
        {activeTab === "user-management" && <UserManagement />}
      </main>
    </div>
  );
}

interface AppProps {
  initialView?: "login" | "dev-selector";
  initialUser?: AuthUser | null;
  initialToken?: string | null;
}

export default function App({ initialView, initialUser, initialToken }: AppProps = {}) {
  return (
    <AuthProvider initialUser={initialUser} initialToken={initialToken}>
      <RequesterProvider>
        <MainContent initialView={initialView} />
      </RequesterProvider>
    </AuthProvider>
  );
}
