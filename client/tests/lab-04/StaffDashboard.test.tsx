import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StaffDashboard from "../../src/components/StaffDashboard";
import * as apiModule from "../../src/api";

const mockStaffUser: apiModule.User = {
  id: 2,
  name: "Bob IT Staff",
  email: "staff@toktick.it",
  role: "IT_STAFF",
  isActive: true,
  requiresPasswordChange: false,
};

const mockDashboardData: apiModule.StaffDashboardResponse = {
  metrics: {
    unassignedCount: 14,
    myAssignedCount: 6,
    todayActionsCount: 3,
    urgentWorkloadCount: 2,
  },
  myRecentTickets: [
    {
      id: "tkt-001",
      ticketNumber: "TKT-2026-000001",
      summary: "Cannot connect to VPN from home",
      currentStatus: "IN_PROGRESS",
      requestedPriority: "HIGH",
      itPriority: "URGENT",
      updatedAt: "2026-10-05T09:14:00.000Z",
    },
  ],
  currentStaffActions: [
    {
      id: "act-001",
      ticketId: "tkt-001",
      ticketNumber: "TKT-2026-000001",
      description: "Reset network credentials and verified login",
      result: "User successfully connected to VPN",
      createdAt: "2026-10-05T08:30:00.000Z",
    },
  ],
};

const mockZeroDashboardData: apiModule.StaffDashboardResponse = {
  metrics: {
    unassignedCount: 0,
    myAssignedCount: 0,
    todayActionsCount: 0,
    urgentWorkloadCount: 0,
  },
  myRecentTickets: [],
  currentStaffActions: [],
};

describe("StaffDashboard Component (StaffDashboard.test.tsx)", () => {
  const mockOnNavigateToQueue = vi.fn();
  const mockOnSelectTicket = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TEST-CARD-01: Renders welcome greeting, role badge, and loading state then content", async () => {
    vi.spyOn(apiModule, "fetchStaffDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    // Initial loading indicator
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByTestId("loading-spinner")).not.toBeInTheDocument();
    });

    expect(screen.getByTestId("dashboard-welcome-heading")).toHaveTextContent("Welcome back, Bob IT Staff!");
    expect(screen.getByText("IT_STAFF")).toBeInTheDocument();
  });

  it("TEST-CARD-02: Renders 4 operational metric cards with non-zero values", async () => {
    vi.spyOn(apiModule, "fetchStaffDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("metric-unassigned-count")).toHaveTextContent("14");
    });

    expect(screen.getByTestId("metric-my-assigned-count")).toHaveTextContent("6");
    expect(screen.getByTestId("metric-today-actions-count")).toHaveTextContent("3");
    expect(screen.getByTestId("metric-urgent-workload-count")).toHaveTextContent("2");
  });

  it("TEST-CARD-00: Renders zero-count empty states for metrics and workload lists (AC-15, FR-08)", async () => {
    vi.spyOn(apiModule, "fetchStaffDashboard").mockResolvedValueOnce(mockZeroDashboardData);

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("metric-unassigned-count")).toHaveTextContent("0");
    });

    expect(screen.getByTestId("metric-my-assigned-count")).toHaveTextContent("0");
    expect(screen.getByTestId("metric-today-actions-count")).toHaveTextContent("0");
    expect(screen.getByTestId("metric-urgent-workload-count")).toHaveTextContent("0");

    // Empty list states
    expect(screen.getByTestId("empty-recent-tickets")).toHaveTextContent("No recent tickets");
    expect(screen.getByTestId("empty-recent-actions")).toHaveTextContent("No recent actions recorded");
  });

  it("TEST-CARD-03..06: Clicking metric cards triggers correct drill-down queue navigation", async () => {
    vi.spyOn(apiModule, "fetchStaffDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("metric-unassigned-card")).toBeInTheDocument();
    });

    // 1. Unassigned Card Click -> owner=unassigned
    fireEvent.click(screen.getByTestId("metric-unassigned-card"));
    expect(mockOnNavigateToQueue).toHaveBeenCalledWith({ owner: "unassigned" });

    // 2. My Assigned Card Click -> owner=my_queue
    fireEvent.click(screen.getByTestId("metric-my-assigned-card"));
    expect(mockOnNavigateToQueue).toHaveBeenCalledWith({ owner: "my_queue" });

    // 3. Today's Actions Card Click -> view=today_actions
    fireEvent.click(screen.getByTestId("metric-today-actions-card"));
    expect(mockOnNavigateToQueue).toHaveBeenCalledWith({ view: "today_actions" });

    // 4. Urgent Workload Card Click -> itPriority=URGENT
    fireEvent.click(screen.getByTestId("metric-urgent-workload-card"));
    expect(mockOnNavigateToQueue).toHaveBeenCalledWith({ itPriority: "URGENT" });
  });

  it("TEST-CARD-07..08: Clicking ticket rows and action rows triggers onSelectTicket", async () => {
    vi.spyOn(apiModule, "fetchStaffDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("recent-ticket-row-tkt-001")).toBeInTheDocument();
    });

    // Click ticket row
    fireEvent.click(screen.getByTestId("recent-ticket-row-tkt-001"));
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-001");

    // Keyboard navigation (Enter / Space) on ticket row
    fireEvent.keyDown(screen.getByTestId("recent-ticket-row-tkt-001"), { key: "Enter" });
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-001");

    fireEvent.keyDown(screen.getByTestId("recent-ticket-row-tkt-001"), { key: " " });
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-001");

    // Click action row
    fireEvent.click(screen.getByTestId("recent-action-row-act-001"));
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-001");

    // Keyboard navigation (Enter / Space) on action row
    fireEvent.keyDown(screen.getByTestId("recent-action-row-act-001"), { key: "Enter" });
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-001");

    fireEvent.keyDown(screen.getByTestId("recent-action-row-act-001"), { key: " " });
    expect(mockOnSelectTicket).toHaveBeenCalledWith("tkt-001");
  });

  it("TEST-CARD-09: Quick action button navigates to queue", async () => {
    vi.spyOn(apiModule, "fetchStaffDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("quick-action-view-queue")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("quick-action-view-queue"));
    expect(mockOnNavigateToQueue).toHaveBeenCalledWith();
  });

  it("TEST-CARD-10: Displays failure banner with retry button on error and retries", async () => {
    vi.spyOn(apiModule, "fetchStaffDashboard")
      .mockRejectedValueOnce(new Error("Network Error"))
      .mockResolvedValueOnce(mockDashboardData);

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-error-alert")).toBeInTheDocument();
    });
    expect(screen.getByTestId("dashboard-error-alert")).toHaveTextContent("Network Error");

    // Click Retry
    fireEvent.click(screen.getByTestId("dashboard-retry-button"));

    await waitFor(() => {
      expect(screen.getByTestId("metric-unassigned-count")).toHaveTextContent("14");
    });
    expect(screen.queryByTestId("dashboard-error-alert")).not.toBeInTheDocument();
  });

  it("TEST-CARD-11: Displays dedicated 403 Forbidden alert without retry button on authorization failure", async () => {
    vi.spyOn(apiModule, "fetchStaffDashboard").mockRejectedValueOnce({
      status: 403,
      data: { error: { code: "FORBIDDEN", message: "Forbidden" } },
    });

    render(
      <StaffDashboard
        currentUser={mockStaffUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-dashboard-forbidden")).toBeInTheDocument();
    });
    expect(screen.getByTestId("staff-dashboard-forbidden")).toHaveTextContent("Access Denied (403 Forbidden)");
    expect(screen.queryByTestId("dashboard-retry-button")).not.toBeInTheDocument();
  });

  it("TEST-CARD-12: Administrator user renders dashboard with ADMINISTRATOR badge and can navigate to queue", async () => {
    const mockAdminUser: apiModule.User = {
      id: 1,
      name: "Admin User",
      email: "admin@toktick.it",
      role: "ADMINISTRATOR",
      isActive: true,
      requiresPasswordChange: false,
    };

    vi.spyOn(apiModule, "fetchStaffDashboard").mockResolvedValueOnce(mockDashboardData);

    render(
      <StaffDashboard
        currentUser={mockAdminUser}
        onNavigateToQueue={mockOnNavigateToQueue}
        onSelectTicket={mockOnSelectTicket}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("dashboard-welcome-heading")).toHaveTextContent("Welcome back, Admin User!");
    });
    expect(screen.getByText("ADMINISTRATOR")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("metric-unassigned-card"));
    expect(mockOnNavigateToQueue).toHaveBeenCalledWith({ owner: "unassigned" });
  });
});

