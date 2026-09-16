import React from "react";
import { User, logoutApi } from "../api";

export type NavTab = "my-tickets" | "create-ticket" | "staff-queue" | "user-management" | "ticket-lookup";

interface AppHeaderProps {
  user: User;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onLogout: () => void;
}

export default function AppHeader({ user, activeTab, onTabChange, onLogout }: AppHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logoutApi();
    } catch (err) {
      // Logout even if network call fails
    } finally {
      setIsLoggingOut(false);
      onLogout();
    }
  }

  function renderRoleBadge() {
    let bgStyle = { backgroundColor: "#0284c7" }; // Sky Blue for REQUESTER
    let label = "Requester";

    if (user.role === "IT_STAFF") {
      bgStyle = { backgroundColor: "#16a34a" }; // Zen Green for IT_STAFF
      label = "IT Staff";
    } else if (user.role === "ADMINISTRATOR") {
      bgStyle = { backgroundColor: "#7c3aed" }; // Violet for ADMINISTRATOR
      label = "Administrator";
    }

    return (
      <span className="badge text-white px-2 py-1" style={bgStyle}>
        {label}
      </span>
    );
  }

  return (
    <nav className="navbar navbar-expand-lg navbar-light bg-light rounded-3 p-3 mb-4 border shadow-sm">
      <div className="container-fluid p-0 d-flex flex-wrap align-items-center justify-content-between gap-3">
        {/* Brand & Title */}
        <div className="d-flex align-items-center me-3">
          <span className="navbar-brand fw-bold fs-4 mb-0 text-success me-2">
            TokTick<span className="text-dark">IT</span>
          </span>
          <span className="text-muted small border-start ps-2 d-none d-sm-inline">
            IT Service Desk
          </span>
        </div>

        {/* Role-based Navigation Links */}
        <div className="d-flex align-items-center gap-2 flex-grow-1 flex-sm-grow-0">
          {user.role === "REQUESTER" && (
            <>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "my-tickets" ? "btn-success fw-semibold" : "btn-outline-secondary"}`}
                aria-current={activeTab === "my-tickets" ? "page" : undefined}
                onClick={() => onTabChange("my-tickets")}
              >
                My Tickets
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "create-ticket" ? "btn-success fw-semibold" : "btn-outline-secondary"}`}
                aria-current={activeTab === "create-ticket" ? "page" : undefined}
                onClick={() => onTabChange("create-ticket")}
              >
                Create Ticket
              </button>
            </>
          )}

          {user.role === "IT_STAFF" && (
            <>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "staff-queue" ? "btn-success fw-semibold" : "btn-outline-secondary"}`}
                aria-current={activeTab === "staff-queue" ? "page" : undefined}
                onClick={() => onTabChange("staff-queue")}
              >
                My Queue
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "create-ticket" ? "btn-success fw-semibold" : "btn-outline-secondary"}`}
                aria-current={activeTab === "create-ticket" ? "page" : undefined}
                onClick={() => onTabChange("create-ticket")}
              >
                Create Ticket
              </button>
            </>
          )}

          {user.role === "ADMINISTRATOR" && (
            <>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "user-management" ? "btn-success fw-semibold" : "btn-outline-secondary"}`}
                aria-current={activeTab === "user-management" ? "page" : undefined}
                onClick={() => onTabChange("user-management")}
              >
                User Management
              </button>
              <button
                type="button"
                className={`btn btn-sm ${activeTab === "ticket-lookup" ? "btn-success fw-semibold" : "btn-outline-secondary"}`}
                aria-current={activeTab === "ticket-lookup" ? "page" : undefined}
                onClick={() => onTabChange("ticket-lookup")}
              >
                Ticket Lookup
              </button>
            </>
          )}
        </div>

        {/* User Info & Logout Button */}
        <div className="d-flex align-items-center gap-3">
          <div className="d-flex align-items-center gap-2">
            <span className="fw-semibold text-dark">{user.name}</span>
            {renderRoleBadge()}
          </div>
          <button
            type="button"
            className="btn btn-outline-danger btn-sm fw-semibold"
            onClick={handleLogout}
            disabled={isLoggingOut}
          >
            {isLoggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      </div>
    </nav>
  );
}
