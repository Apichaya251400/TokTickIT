import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { StaffTicketDetail } from "../../src/components/StaffTicketDetail";
import * as api from "../../src/api";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual("../../src/api");
  return {
    ...actual,
    fetchTicketById: vi.fn(),
    claimTicketApi: vi.fn(),
    assignTicketApi: vi.fn(),
    updateItPriorityApi: vi.fn(),
    updateTicketStatusApi: vi.fn(),
    fetchTicketComments: vi.fn(),
    postTicketComment: vi.fn(),
    fetchInternalNotes: vi.fn(),
    postInternalNote: vi.fn(),
    fetchAssignees: vi.fn(),
    fetchTicketActions: vi.fn(),
  };
});

describe("LAB4-06 / TicketWorkflow Component Suite (TicketWorkflow.test.tsx)", () => {
  const mockStaffUser: api.User = {
    id: 2,
    name: "John Staff",
    email: "john.staff@toktick.it",
    role: "IT_STAFF",
    isActive: true,
    requiresPasswordChange: false,
  };

  const mockTicket = {
    id: "test-ticket-uuid-001",
    ticketNumber: "TKT-2026-000101",
    summary: "Wi-Fi connectivity issue on 3rd floor",
    description: "Signal drops frequently throughout the afternoon.",
    requestedPriority: "HIGH",
    itPriority: "HIGH",
    currentStatus: "IN_PROGRESS",
    category: { id: 1, name: "Network" },
    relatedSystem: { id: 2, name: "Office Wi-Fi" },
    requester: { id: 4, name: "Alice Smith", email: "alice@example.com" },
    owner: { id: 2, name: "John Staff", email: "john.staff@toktick.it" },
    resolutionNote: null,
    createdAt: "2026-10-10T08:00:00.000Z",
    updatedAt: "2026-10-10T09:30:00.000Z",
    attachments: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicket);
    vi.mocked(api.fetchAssignees).mockResolvedValue({ assignees: [] });
    vi.mocked(api.fetchTicketComments).mockResolvedValue({ comments: [] });
    vi.mocked(api.fetchInternalNotes).mockResolvedValue({ notes: [] });
    vi.mocked(api.fetchTicketActions).mockResolvedValue({ data: [] });
  });

  it("TEST-WORKFLOW-UI-01: Renders permitted next transitions for IN_PROGRESS status", async () => {
    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-btn-WAITING_FOR_REQUESTER")).toBeInTheDocument();
      expect(screen.getByTestId("status-transition-btn-RESOLVED")).toBeInTheDocument();
      expect(screen.getByTestId("status-transition-btn-CANCELLED")).toBeInTheDocument();
    });
  });

  it("TEST-WORKFLOW-UI-02: Enforces mandatory resolution note in modal when 0 completed actions exist", async () => {
    // 0 completed actions returned
    vi.mocked(api.fetchTicketActions).mockResolvedValue({ data: [] });

    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-btn-RESOLVED")).toBeInTheDocument();
    });

    // Click Transition to RESOLVED -> opens modal
    fireEvent.click(screen.getByTestId("status-transition-btn-RESOLVED"));

    await waitFor(() => {
      expect(screen.getByTestId("resolve-ticket-modal")).toBeInTheDocument();
    });

    expect(screen.getByTestId("gate-notice-required")).toBeInTheDocument();
    expect(screen.getByText(/0 completed Actions Taken/)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-resolve-btn");
    expect(confirmBtn).toBeDisabled();

    // Type resolution note
    const noteInput = screen.getByTestId("resolution-note-input");
    fireEvent.change(noteInput, { target: { value: "Rebooted 3rd floor AP and verified signal strength." } });

    expect(confirmBtn).not.toBeDisabled();

    // Mock successful status update
    vi.mocked(api.updateTicketStatusApi).mockResolvedValue({
      message: "Ticket status updated to RESOLVED.",
      ticket: { ...mockTicket, currentStatus: "RESOLVED" },
    });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.updateTicketStatusApi).toHaveBeenCalledWith(
        "test-ticket-uuid-001",
        "RESOLVED",
        "2026-10-10T09:30:00.000Z",
        "Rebooted 3rd floor AP and verified signal strength."
      );
    });
  });

  it("TEST-WORKFLOW-UI-03: Allows optional resolution note in modal when >= 1 completed action exists", async () => {
    // 1 COMPLETED action returned
    vi.mocked(api.fetchTicketActions).mockResolvedValue({
      data: [
        {
          id: "act-1",
          ticketId: "test-ticket-uuid-001",
          performedBy: { id: 2, name: "John Staff", role: "IT_STAFF" },
          assignee: null,
          description: "Replaced faulty transceiver",
          result: "Transceiver replaced",
          status: "COMPLETED",
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: null,
          createdAt: "2026-10-10T08:30:00.000Z",
          updatedAt: "2026-10-10T08:45:00.000Z",
        },
      ],
    });

    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-btn-RESOLVED")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("status-transition-btn-RESOLVED"));

    await waitFor(() => {
      expect(screen.getByTestId("resolve-ticket-modal")).toBeInTheDocument();
    });

    expect(screen.getByTestId("gate-notice-optional")).toBeInTheDocument();
    expect(screen.getByText(/1 completed Action\(s\) Taken/)).toBeInTheDocument();

    const confirmBtn = screen.getByTestId("confirm-resolve-btn");
    // Should be enabled even without typing any resolution note
    expect(confirmBtn).not.toBeDisabled();

    vi.mocked(api.updateTicketStatusApi).mockResolvedValue({
      message: "Ticket status updated to RESOLVED.",
      ticket: { ...mockTicket, currentStatus: "RESOLVED" },
    });

    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(api.updateTicketStatusApi).toHaveBeenCalledWith(
        "test-ticket-uuid-001",
        "RESOLVED",
        "2026-10-10T09:30:00.000Z",
        undefined
      );
    });
  });

  it("TEST-WORKFLOW-UI-04: Displays 409 STALE_UPDATE banner and handles refresh action", async () => {
    vi.mocked(api.updateTicketStatusApi).mockRejectedValue({
      status: 409,
      data: {
        error: {
          code: "STALE_UPDATE",
          message: "Ticket status was updated concurrently by another user. Please refresh and try again.",
        },
      },
    });

    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-btn-CANCELLED")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("status-transition-btn-CANCELLED"));

    await waitFor(() => {
      expect(screen.getByTestId("stale-update-banner")).toBeInTheDocument();
      expect(screen.getByTestId("refresh-ticket-btn")).toBeInTheDocument();
    });

    // Click Refresh Ticket
    fireEvent.click(screen.getByTestId("refresh-ticket-btn"));

    await waitFor(() => {
      expect(api.fetchTicketById).toHaveBeenCalledTimes(2);
    });
  });

  it("TEST-WORKFLOW-UI-05: Displays terminal state message and hides transition buttons when CANCELLED", async () => {
    const cancelledTicket = { ...mockTicket, currentStatus: "CANCELLED" };
    vi.mocked(api.fetchTicketById).mockResolvedValue(cancelledTicket);

    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument();
    });

    expect(screen.getByText(/No further status transitions available for terminal state/)).toBeInTheDocument();
    expect(screen.queryByTestId("status-transition-btn-RESOLVED")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-transition-btn-OPEN")).not.toBeInTheDocument();
  });

  it("TEST-WORKFLOW-UI-06: Displays resolution note banner when ticket has resolutionNote", async () => {
    const resolvedTicketWithNote = {
      ...mockTicket,
      currentStatus: "RESOLVED",
      resolutionNote: "Replaced faulty capacitor on power supply unit.",
    };
    vi.mocked(api.fetchTicketById).mockResolvedValue(resolvedTicketWithNote);

    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("ticket-resolution-note-banner")).toBeInTheDocument();
      expect(screen.getByText("Replaced faulty capacitor on power supply unit.")).toBeInTheDocument();
    });
  });

  it("TEST-WORKFLOW-UI-07: Closes resolve modal on Cancel click and Escape key", async () => {
    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-btn-RESOLVED")).toBeInTheDocument();
    });

    // 1. Open and Cancel button
    fireEvent.click(screen.getByTestId("status-transition-btn-RESOLVED"));
    await waitFor(() => {
      expect(screen.getByTestId("resolve-ticket-modal")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("cancel-resolve-btn"));
    await waitFor(() => {
      expect(screen.queryByTestId("resolve-ticket-modal")).not.toBeInTheDocument();
    });

    // 2. Open and Escape key
    fireEvent.click(screen.getByTestId("status-transition-btn-RESOLVED"));
    await waitFor(() => {
      expect(screen.getByTestId("resolve-ticket-modal")).toBeInTheDocument();
    });
    fireEvent.keyDown(window, { key: "Escape" });
    await waitFor(() => {
      expect(screen.queryByTestId("resolve-ticket-modal")).not.toBeInTheDocument();
    });
  });
});
