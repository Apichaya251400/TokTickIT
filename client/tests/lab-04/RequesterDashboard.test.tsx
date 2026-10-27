import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import RequesterDashboard from "../../src/components/RequesterDashboard";
import * as apiModule from "../../src/api";

const mockRequesterUser: apiModule.User = {
  id: 1,
  name: "Alice Smith",
  email: "alice@example.com",
  role: "REQUESTER",
  isActive: true,
  requiresPasswordChange: false,
};

const mockDashboardData: apiModule.RequesterDashboardResponse = {
  metrics: {
    openTicketsCount: 8,
    waitingForRequesterCount: 3,
    inProgressCount: 4,
    recentlyResolvedCount: 5,
  },
  attentionRequiredTickets: [
    {
      id: "tkt-att-01",
      ticketNumber: "TKT-2026-ATT001",
      summary: "Please provide serial number for monitor",
      currentStatus: "WAITING_FOR_REQUESTER",
      requestedPriority: "HIGH",
      updatedAt: "2026-10-15T10:00:00.000Z",
    },
  ],
  recentTickets: [
    {
      id: "tkt-rec-01",
      ticketNumber: "TKT-2026-REC001",
      summary: "Cannot connect to VPN from home",
      currentStatus: "IN_PROGRESS",
      requestedPriority: "MEDIUM",
      updatedAt: "2026-10-15T11:00:00.000Z",
    },
  ],
};

const mockZeroDashboardData: apiModule.RequesterDashboardResponse = {
  metrics: {
    openTicketsCount: 0,
    waitingForRequesterCount: 0,
    inProgressCount: 0,
    recentlyResolvedCount: 0,
  },
  attentionRequiredTickets: [],
  recentTickets: [],
};

describe("RequesterDashboard Component (RequesterDashboard.test.tsx)", () => {
  const mockOnNavigateToMyTickets = vi.fn();
  const mockOnSelectTicket = vi.fn();
  const mockOnCreateTicket = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TEST-CARD-07..10: Renders welcome greeting, role badge, quick action, and 4 metric cards", async () => {
    vi.spyOn(apiModule, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <RequesterDashboard
        currentUser={mockRequesterUser}
        onNavigateToMyTickets={mockOnNavigateToMyTickets}
        onSelectTicket={mockOnSelectTicket}
        onCreateTicket={mockOnCreateTicket}
      />
    );

    // Initial loading indicator
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    // Welcome Header
    expect(screen.getByTestId("dashboard-welcome-heading")).toHaveTextContent("Welcome back, Alice Smith!");
    expect(screen.getByText("REQUESTER")).toBeInTheDocument();

    // Quick Action button
    const createBtn = screen.getByTestId("create-ticket-action");
    expect(createBtn).toBeInTheDocument();
    fireEvent.click(createBtn);
    expect(mockOnCreateTicket).toHaveBeenCalledTimes(1);

    // 4 Metric Card Counts
    expect(screen.getByTestId("metric-open-count")).toHaveTextContent("8");
    expect(screen.getByTestId("metric-waiting-count")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-inprogress-count")).toHaveTextContent("4");
    expect(screen.getByTestId("metric-resolved-count")).toHaveTextContent("5");
  });

  it("TEST-CARD-00: Renders zero-count empty states for metrics and ticket worklists (AC-15, FR-08)", async () => {
    vi.spyOn(apiModule, "fetchRequesterDashboard").mockResolvedValueOnce(mockZeroDashboardData);

    render(
      <RequesterDashboard
        currentUser={mockRequesterUser}
        onNavigateToMyTickets={mockOnNavigateToMyTickets}
        onSelectTicket={mockOnSelectTicket}
        onCreateTicket={mockOnCreateTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("metric-open-count")).toHaveTextContent("0");
    });

    expect(screen.getByTestId("metric-waiting-count")).toHaveTextContent("0");
    expect(screen.getByTestId("metric-inprogress-count")).toHaveTextContent("0");
    expect(screen.getByTestId("metric-resolved-count")).toHaveTextContent("0");

    // Empty list states
    expect(screen.getByTestId("empty-attention-tickets")).toHaveTextContent(
      "No tickets require your attention at this time"
    );
    expect(screen.getByTestId("empty-recent-tickets")).toHaveTextContent("No recent tickets");
  });

  it("TEST-CARD-07..10: Clicking metric cards triggers correct drill-down navigation to My Tickets (BR-15)", async () => {
    vi.spyOn(apiModule, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <RequesterDashboard
        currentUser={mockRequesterUser}
        onNavigateToMyTickets={mockOnNavigateToMyTickets}
        onSelectTicket={mockOnSelectTicket}
        onCreateTicket={mockOnCreateTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-metric-open")).toBeInTheDocument();
    });

    // 1. My Open Tickets Card Click -> status="open"
    fireEvent.click(screen.getByTestId("requester-metric-open"));
    expect(mockOnNavigateToMyTickets).toHaveBeenCalledWith("open");

    // 2. Waiting for My Response Card Click -> status="WAITING_FOR_REQUESTER"
    fireEvent.click(screen.getByTestId("requester-metric-waiting"));
    expect(mockOnNavigateToMyTickets).toHaveBeenCalledWith("WAITING_FOR_REQUESTER");

    // 3. In Progress Card Click -> status="IN_PROGRESS"
    fireEvent.click(screen.getByTestId("requester-metric-inprogress"));
    expect(mockOnNavigateToMyTickets).toHaveBeenCalledWith("IN_PROGRESS");

    // 4. Recently Resolved Card Click -> status="RESOLVED"
    fireEvent.click(screen.getByTestId("requester-metric-resolved"));
    expect(mockOnNavigateToMyTickets).toHaveBeenCalledWith("RESOLVED");

    // 5. View All Recent Tickets Click -> resets filter (calls with no argument/undefined)
    fireEvent.click(screen.getByRole("button", { name: /View All/i }));
    expect(mockOnNavigateToMyTickets).toHaveBeenCalledWith();
  });

  it("TEST-CARD-11..12: Clicking attention tickets and recent tickets triggers onSelectTicket", async () => {
    vi.spyOn(apiModule, "fetchRequesterDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <RequesterDashboard
        currentUser={mockRequesterUser}
        onNavigateToMyTickets={mockOnNavigateToMyTickets}
        onSelectTicket={mockOnSelectTicket}
        onCreateTicket={mockOnCreateTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("attention-ticket-row-tkt-att-01")).toBeInTheDocument();
    });

    // 1. Click Attention Required row
    fireEvent.click(screen.getByTestId("attention-ticket-row-tkt-att-01"));
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-att-01");

    // 2. Click Attention Required action button
    fireEvent.click(screen.getByTestId("attention-ticket-btn-tkt-att-01"));
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-att-01");

    // 3. Click Recent Ticket row
    fireEvent.click(screen.getByTestId("recent-ticket-row-tkt-rec-01"));
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-rec-01");

    // 4. Keyboard navigation (Enter / Space) on recent ticket row
    fireEvent.keyDown(screen.getByTestId("recent-ticket-row-tkt-rec-01"), { key: "Enter" });
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-rec-01");

    fireEvent.keyDown(screen.getByTestId("recent-ticket-row-tkt-rec-01"), { key: " " });
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-rec-01");
  });

  it("handles 403 Forbidden state gracefully", async () => {
    vi.spyOn(apiModule, "fetchRequesterDashboard").mockRejectedValueOnce({
      status: 403,
      data: { error: "FORBIDDEN", message: "Only Requesters may access this dashboard." },
    });

    render(
      <RequesterDashboard
        currentUser={mockRequesterUser}
        onNavigateToMyTickets={mockOnNavigateToMyTickets}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("requester-dashboard-forbidden")).toBeInTheDocument();
    });

    expect(screen.getByText(/Access Denied \(403 Forbidden\)/i)).toBeInTheDocument();
  });

  it("handles error state with retry button", async () => {
    vi.spyOn(apiModule, "fetchRequesterDashboard")
      .mockRejectedValueOnce(new Error("Network timeout"))
      .mockResolvedValueOnce(mockDashboardData);

    render(
      <RequesterDashboard
        currentUser={mockRequesterUser}
        onNavigateToMyTickets={mockOnNavigateToMyTickets}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-error-alert")).toBeInTheDocument();
    });

    expect(screen.getByText(/Network timeout/i)).toBeInTheDocument();

    // Click retry
    fireEvent.click(screen.getByTestId("dashboard-retry-button"));

    await waitFor(() => {
      expect(screen.getByTestId("metric-open-count")).toHaveTextContent("8");
    });
  });
});
