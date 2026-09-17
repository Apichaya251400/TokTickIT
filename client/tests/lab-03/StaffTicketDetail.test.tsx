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
  };
});

describe("Issue 8: StaffTicketDetail Component Suite (StaffTicketDetail.test.tsx)", () => {
  const mockItStaffUser: api.User = {
    id: 2,
    name: "John Staff",
    email: "john.staff@toktick.it",
    role: "IT_STAFF",
    isActive: true,
    requiresPasswordChange: false,
  };

  const mockAdminUser: api.User = {
    id: 3,
    name: "System Admin",
    email: "admin@toktick.it",
    role: "ADMINISTRATOR",
    isActive: true,
    requiresPasswordChange: false,
  };

  const mockTicketData = {
    id: "test-ticket-uuid-001",
    ticketNumber: "TKT-2026-000001",
    summary: "Laptop screen flickering",
    description: "Screen flickers randomly when plugged into external display.",
    requestedPriority: "MEDIUM",
    itPriority: "HIGH",
    currentStatus: "IN_PROGRESS",
    category: { id: 1, name: "Hardware" },
    relatedSystem: { id: 1, name: "Corporate Laptop" },
    requester: { id: 4, name: "Alice Smith", email: "alice@example.com" },
    owner: { id: 2, name: "John Staff", email: "john.staff@toktick.it" },
    createdAt: "2026-09-10T08:00:00.000Z",
    updatedAt: "2026-09-12T10:30:00.000Z",
    attachments: [],
  };

  const mockAssignees = [
    { id: 2, name: "John Staff", email: "john.staff@toktick.it", role: "IT_STAFF" as const },
    { id: 5, name: "Sarah Staff", email: "sarah.staff@toktick.it", role: "IT_STAFF" as const },
    { id: 3, name: "System Admin", email: "admin@toktick.it", role: "ADMINISTRATOR" as const },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTicketById).mockResolvedValue(mockTicketData);
    vi.mocked(api.fetchAssignees).mockResolvedValue({ assignees: mockAssignees });
    vi.mocked(api.fetchTicketComments).mockResolvedValue({ comments: [] });
    vi.mocked(api.fetchInternalNotes).mockResolvedValue({ notes: [] });
  });

  it("renders ticket detail metadata, badges, and owner info correctly", async () => {
    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockItStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument();
    });

    expect(screen.getByText("TKT-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("Laptop screen flickering")).toBeInTheDocument();
    expect(screen.getByText("Screen flickers randomly when plugged into external display.")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/Alice Smith/)).toBeInTheDocument();
  });

  it("allows IT Staff to update IT priority", async () => {
    vi.mocked(api.updateItPriorityApi).mockResolvedValue({ message: "IT priority updated successfully" });

    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockItStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("it-priority-select")).toBeInTheDocument();
    });

    const select = screen.getByTestId("it-priority-select");
    fireEvent.change(select, { target: { value: "URGENT" } });

    const saveBtn = screen.getByTestId("update-priority-btn");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.updateItPriorityApi).toHaveBeenCalledWith("test-ticket-uuid-001", "URGENT");
    });
  });

  it("renders permitted status transition buttons for IT Staff", async () => {
    // Current status is IN_PROGRESS -> Permitted next: WAITING_FOR_REQUESTER, RESOLVED, CANCELLED
    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockItStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("status-transition-btn-WAITING_FOR_REQUESTER")).toBeInTheDocument();
      expect(screen.getByTestId("status-transition-btn-RESOLVED")).toBeInTheDocument();
      expect(screen.getByTestId("status-transition-btn-CANCELLED")).toBeInTheDocument();
    });
  });

  it("allows IT Staff to claim unassigned ticket", async () => {
    const unassignedTicket = { ...mockTicketData, owner: null };
    vi.mocked(api.fetchTicketById).mockResolvedValue(unassignedTicket);
    vi.mocked(api.claimTicketApi).mockResolvedValue({ message: "Ticket claimed successfully" });

    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockItStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("claim-ticket-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("claim-ticket-btn"));

    await waitFor(() => {
      expect(api.claimTicketApi).toHaveBeenCalledWith("test-ticket-uuid-001");
    });
  });

  it("allows posting Public Comments and Internal Notes", async () => {
    vi.mocked(api.postTicketComment).mockResolvedValue({
      id: "c-1",
      ticketId: "test-ticket-uuid-001",
      authorId: 2,
      content: "Public comment test",
      createdAt: new Date().toISOString(),
    });
    vi.mocked(api.postInternalNote).mockResolvedValue({
      id: "n-1",
      ticketId: "test-ticket-uuid-001",
      authorId: 2,
      content: "Internal note test",
      createdAt: new Date().toISOString(),
    });

    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockItStaffUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("public-comments-section")).toBeInTheDocument();
    });

    // 1. Post Public Comment
    const commentArea = screen.getByPlaceholderText("Add a public comment visible to Requester...");
    fireEvent.change(commentArea, { target: { value: "Public comment test" } });
    fireEvent.click(screen.getByTestId("post-public-comment-btn"));

    await waitFor(() => {
      expect(api.postTicketComment).toHaveBeenCalledWith("test-ticket-uuid-001", "Public comment test");
    });

    // 2. Switch to Internal Notes Tab & Post Note
    const notesTabBtn = screen.getByText(/Internal Notes/);
    fireEvent.click(notesTabBtn);

    await waitFor(() => {
      expect(screen.getByTestId("internal-notes-section")).toBeInTheDocument();
    });

    const noteArea = screen.getByPlaceholderText("Add a private internal note for IT Staff & Admin...");
    fireEvent.change(noteArea, { target: { value: "Internal note test" } });
    fireEvent.click(screen.getByTestId("post-internal-note-btn"));

    await waitFor(() => {
      expect(api.postInternalNote).toHaveBeenCalledWith("test-ticket-uuid-001", "Internal note test");
    });
  });

  it("renders Administrator mode with read-only / disabled status & IT priority controls", async () => {
    render(
      <StaffTicketDetail
        ticketId="test-ticket-uuid-001"
        currentUser={mockAdminUser}
        onBack={() => {}}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("staff-ticket-detail")).toBeInTheDocument();
    });

    expect(screen.getByText(/Administrator Mode/)).toBeInTheDocument();
    expect(screen.getByTestId("it-priority-select")).toBeDisabled();
    expect(screen.queryByTestId("update-priority-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("status-transition-btn-RESOLVED")).not.toBeInTheDocument();
  });
});
