import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ActionsTakenWorkspace } from "../../src/components/ActionsTakenWorkspace";
import * as api from "../../src/api";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual("../../src/api");
  return {
    ...actual,
    fetchTicketActions: vi.fn(),
    createTicketAction: vi.fn(),
    updateTicketAction: vi.fn(),
    updateTicketActionStatus: vi.fn(),
    fetchAssignees: vi.fn(),
  };
});

describe("Issue 5: Actions Taken Component Suite (ActionsTaken.test.tsx)", () => {
  const mockStaffUser: api.User = {
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

  const mockRequesterUser: api.User = {
    id: 4,
    name: "Alice Requester",
    email: "alice@example.com",
    role: "REQUESTER",
    isActive: true,
    requiresPasswordChange: false,
  };

  const mockAssignees = [
    { id: 2, name: "John Staff", email: "john.staff@toktick.it", role: "IT_STAFF" as const, isActive: true },
    { id: 5, name: "Sarah Staff", email: "sarah.staff@toktick.it", role: "IT_STAFF" as const, isActive: true },
    { id: 3, name: "System Admin", email: "admin@toktick.it", role: "ADMINISTRATOR" as const, isActive: true },
    { id: 9, name: "Inactive Staff", email: "inactive.staff@toktick.it", role: "IT_STAFF" as const, isActive: false },
  ];

  const mockAction1: api.ActionTaken = {
    id: "act-001",
    ticketId: "ticket-101",
    performedBy: { id: 2, name: "John Staff", role: "IT_STAFF" },
    assignee: { id: 5, name: "Sarah Staff", role: "IT_STAFF" },
    description: "Inspected hardware connectivity and cables.",
    result: "Cables intact, power supply is suspect.",
    status: "PENDING",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: "See diagnostic_log.png",
    createdAt: "2026-10-10T10:00:00.000Z",
    updatedAt: "2026-10-10T10:00:00.000Z",
  };

  const mockAction2: api.ActionTaken = {
    id: "act-002",
    ticketId: "ticket-101",
    performedBy: { id: 3, name: "System Admin", role: "ADMINISTRATOR" },
    assignee: null,
    description: "Replaced faulty power unit with standard PSU.",
    result: "System booted normally; burn-in test running.",
    status: "IN_PROGRESS",
    followUpRequired: true,
    followUpNote: "Check thermal sensors in 2 hours.",
    attachmentNotes: null,
    createdAt: "2026-10-10T11:00:00.000Z",
    updatedAt: "2026-10-10T11:30:00.000Z",
  };

  const mockAction3: api.ActionTaken = {
    id: "act-003",
    ticketId: "ticket-101",
    performedBy: { id: 2, name: "John Staff", role: "IT_STAFF" },
    assignee: { id: 2, name: "John Staff", role: "IT_STAFF" },
    description: "Thermal sensor readings verified within 45C limit.",
    result: "PSU replacement successful. System fully functional.",
    status: "COMPLETED",
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: null,
    createdAt: "2026-10-10T13:00:00.000Z",
    updatedAt: "2026-10-10T13:15:00.000Z",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchTicketActions).mockResolvedValue({ data: [mockAction1, mockAction2, mockAction3] });
    vi.mocked(api.fetchAssignees).mockResolvedValue({ assignees: mockAssignees });
  });

  // TEST-ACT-LIST-01
  it("TEST-ACT-LIST-01: renders actions chronologically sorted by createdAt ASC", async () => {
    // Deliver mock actions in reverse order to verify sorting
    vi.mocked(api.fetchTicketActions).mockResolvedValue({
      data: [mockAction3, mockAction1, mockAction2],
    });

    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-list")).toBeInTheDocument();
    });

    const actionCards = screen.getAllByTestId(/^action-card-/);
    expect(actionCards.length).toBe(3);
    // Should be act-001, act-002, act-003
    expect(actionCards[0]).toHaveAttribute("data-testid", "action-card-act-001");
    expect(actionCards[1]).toHaveAttribute("data-testid", "action-card-act-002");
    expect(actionCards[2]).toHaveAttribute("data-testid", "action-card-act-003");

    expect(screen.getByText("3 actions recorded")).toBeInTheDocument();
  });

  // TEST-ACT-PERFORMER-02
  it("TEST-ACT-PERFORMER-02: shows performedBy as authenticated user identity capsule (non-editable, not free-text)", async () => {
    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("record-action-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("record-action-btn"));

    const createForm = screen.getByTestId("create-action-form");
    expect(createForm).toBeInTheDocument();

    // Performed By is a badge / read-only capsule displaying authenticated user
    const performedCapsule = screen.getByTestId("performed-by-capsule");
    expect(performedCapsule).toBeInTheDocument();
    expect(performedCapsule).toHaveTextContent("John Staff");
    expect(performedCapsule).toHaveTextContent("IT_STAFF");

    // Ensure there is NO free-text input for performedBy
    expect(screen.queryByLabelText(/performed by/i)).toBeNull();
  });

  // TEST-ACT-CREATE-03
  it("TEST-ACT-CREATE-03: successfully creates action with valid fields and idempotency key", async () => {
    vi.mocked(api.createTicketAction).mockResolvedValue({
      id: "act-new",
      ticketId: "ticket-101",
      performedBy: { id: 2, name: "John Staff", role: "IT_STAFF" },
      assignee: { id: 5, name: "Sarah Staff", role: "IT_STAFF" },
      description: "Tested RAM modules individually.",
      result: "Module 2 has memory errors.",
      status: "PENDING",
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: "Memory diagnostic report attached.",
      createdAt: "2026-10-11T09:00:00.000Z",
      updatedAt: "2026-10-11T09:00:00.000Z",
    });

    const onActionUpdated = vi.fn();

    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
        onActionUpdated={onActionUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("record-action-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("record-action-btn"));

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Tested RAM modules individually." },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Module 2 has memory errors." },
    });
    fireEvent.change(screen.getByTestId("action-assignee-select"), {
      target: { value: "5" },
    });
    fireEvent.change(screen.getByTestId("attachment-notes-input"), {
      target: { value: "Memory diagnostic report attached." },
    });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(api.createTicketAction).toHaveBeenCalledWith(
        "ticket-101",
        {
          description: "Tested RAM modules individually.",
          result: "Module 2 has memory errors.",
          assigneeId: 5,
          followUpRequired: false,
          followUpNote: null,
          attachmentNotes: "Memory diagnostic report attached.",
        },
        expect.any(String) // idempotency key string
      );
    });

    expect(onActionUpdated).toHaveBeenCalled();
  });

  // TEST-ACT-FOLLOWUP-04
  it("TEST-ACT-FOLLOWUP-04: requires follow-up note when followUpRequired is true", async () => {
    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("record-action-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("record-action-btn"));

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Checked power delivery." },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Voltage fluctuating." },
    });

    // Check followUpRequired checkbox
    const followUpCheck = screen.getByTestId("follow-up-switch");
    fireEvent.click(followUpCheck);

    // Follow-up note input should now appear
    expect(screen.getByTestId("follow-up-note-input")).toBeInTheDocument();

    // Try submitting without follow-up note
    fireEvent.click(screen.getByTestId("save-action-btn"));

    expect(
      screen.getByText("Follow-up note is required when follow-up is needed.")
    ).toBeInTheDocument();
    expect(api.createTicketAction).not.toHaveBeenCalled();

    // Provide note and submit
    fireEvent.change(screen.getByTestId("follow-up-note-input"), {
      target: { value: "Re-check with oscilloscope tomorrow." },
    });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(api.createTicketAction).toHaveBeenCalledWith(
        "ticket-101",
        expect.objectContaining({
          followUpRequired: true,
          followUpNote: "Re-check with oscilloscope tomorrow.",
        }),
        expect.any(String)
      );
    });
  });

  // TEST-ACT-INACTIVE-05
  it("TEST-ACT-INACTIVE-05: provides clear rejection feedback if assignee is inactive or invalid", async () => {
    vi.mocked(api.createTicketAction).mockRejectedValue({
      status: 400,
      data: {
        error: {
          code: "INVALID_ASSIGNEE",
          message: "Assignee must be an active IT Staff or Administrator user.",
        },
      },
    });

    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("record-action-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("record-action-btn"));

    // Verify inactive staff is excluded from dropdown options
    const assigneeSelect = screen.getByTestId("action-assignee-select");
    expect(within(assigneeSelect).queryByText(/Inactive Staff/)).toBeNull();
    expect(within(assigneeSelect).getByText(/John Staff/)).toBeInTheDocument();
    expect(within(assigneeSelect).getByText(/Sarah Staff/)).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("action-description-input"), {
      target: { value: "Assigned to decommissioned staff account." },
    });
    fireEvent.change(screen.getByTestId("action-result-input"), {
      target: { value: "Failed assignment." },
    });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(
        screen.getByText("Assignee must be an active IT Staff or Administrator user.")
      ).toBeInTheDocument();
    });
  });

  // TEST-FAIL-01
  it("TEST-FAIL-01: preserves form data upon recoverable failure so user does not lose input", async () => {
    vi.mocked(api.createTicketAction).mockRejectedValueOnce(new Error("Network connection dropped."));

    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("record-action-btn")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("record-action-btn"));

    const descInput = screen.getByTestId("action-description-input");
    const resInput = screen.getByTestId("action-result-input");

    fireEvent.change(descInput, {
      target: { value: "Complex diagnosis taking 20 minutes to type out." },
    });
    fireEvent.change(resInput, {
      target: { value: "Critical finding needing preservation." },
    });

    fireEvent.click(screen.getByTestId("save-action-btn"));

    await waitFor(() => {
      expect(screen.getByText("Network connection dropped.")).toBeInTheDocument();
    });

    // Form inputs must still contain the user's data
    expect(descInput).toHaveValue("Complex diagnosis taking 20 minutes to type out.");
    expect(resInput).toHaveValue("Critical finding needing preservation.");
  });

  // TEST-ACT-STATUS-07
  it("TEST-ACT-STATUS-07: manages status transitions according to approved Action lifecycle", async () => {
    vi.mocked(api.updateTicketActionStatus).mockResolvedValue({
      ...mockAction1,
      status: "IN_PROGRESS",
    });

    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("action-card-act-001")).toBeInTheDocument();
    });

    // act-001 is PENDING: should show Start Work, Complete Action, Cancel Action
    expect(screen.getByTestId("action-start-work-btn-act-001")).toBeInTheDocument();
    expect(screen.getByTestId("action-complete-btn-act-001")).toBeInTheDocument();
    expect(screen.getByTestId("action-cancel-btn-act-001")).toBeInTheDocument();

    // Click Start Work on act-001
    fireEvent.click(screen.getByTestId("action-start-work-btn-act-001"));

    await waitFor(() => {
      expect(api.updateTicketActionStatus).toHaveBeenCalledWith("act-001", {
        status: "IN_PROGRESS",
        expectedUpdatedAt: mockAction1.updatedAt,
      });
    });

    // act-002 is IN_PROGRESS: should show Complete Action, Cancel Action (no Start Work)
    expect(screen.queryByTestId("action-start-work-btn-act-002")).toBeNull();
    expect(screen.getByTestId("action-complete-btn-act-002")).toBeInTheDocument();
    expect(screen.getByTestId("action-cancel-btn-act-002")).toBeInTheDocument();

    // act-003 is COMPLETED (terminal): should have NO status transition buttons
    expect(screen.queryByTestId("action-start-work-btn-act-003")).toBeNull();
    expect(screen.queryByTestId("action-complete-btn-act-003")).toBeNull();
    expect(screen.queryByTestId("action-cancel-btn-act-003")).toBeNull();
    expect(screen.getByText(/Terminal status \(COMPLETED\)/)).toBeInTheDocument();
  });

  // TEST-ACT-EDIT-08
  it("TEST-ACT-EDIT-08: allows editing action content with expectedUpdatedAt and handles 409 conflict", async () => {
    const onActionUpdated = vi.fn();
    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
        onActionUpdated={onActionUpdated}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("action-edit-btn-act-001")).toBeInTheDocument();
    });

    // Open edit modal
    fireEvent.click(screen.getByTestId("action-edit-btn-act-001"));

    expect(screen.getByTestId("edit-action-modal")).toBeInTheDocument();
    const editDesc = screen.getByTestId("edit-description-input");
    expect(editDesc).toHaveValue("Inspected hardware connectivity and cables.");

    fireEvent.change(editDesc, {
      target: { value: "Inspected hardware connectivity and replaced damaged SATA cable." },
    });

    // Mock 409 conflict
    vi.mocked(api.updateTicketAction).mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: "STALE_UPDATE",
          message: "Action was modified concurrently.",
        },
      },
    });

    fireEvent.click(screen.getByTestId("save-edit-action-btn"));

    await waitFor(() => {
      expect(
        screen.getByText("Action content was updated concurrently by another user. Please refresh and try again.")
      ).toBeInTheDocument();
    });

    // Verify Refresh button is present and Save button is disabled during stale conflict
    const refreshBtn = screen.getByTestId("edit-refresh-btn");
    expect(refreshBtn).toBeInTheDocument();
    const saveEditBtn = screen.getByTestId("save-edit-action-btn");
    expect(saveEditBtn).toBeDisabled();

    // If refresh fails, save button remains disabled
    vi.mocked(api.fetchTicketActions).mockRejectedValueOnce(new Error("Network failed"));
    fireEvent.click(refreshBtn);
    await waitFor(() => {
      expect(screen.getByText("Failed to refresh action. Please close and re-open.")).toBeInTheDocument();
    });
    expect(saveEditBtn).toBeDisabled();

    // Mock fresh action state returned upon successful refresh
    const updatedAction1: api.ActionTaken = {
      ...mockAction1,
      description: "Concurrently updated description by peer",
      updatedAt: "2026-10-10T12:00:00.000Z",
    };
    vi.mocked(api.fetchTicketActions).mockResolvedValueOnce({
      data: [updatedAction1, mockAction2, mockAction3],
    });

    fireEvent.click(refreshBtn);

    await waitFor(() => {
      expect(screen.getByTestId("edit-description-input")).toHaveValue("Concurrently updated description by peer");
    });
    expect(screen.queryByTestId("edit-action-error")).toBeNull();
    expect(saveEditBtn).not.toBeDisabled();
    expect(onActionUpdated).toHaveBeenCalled();

    expect(api.updateTicketAction).toHaveBeenCalledWith(
      "act-001",
      expect.objectContaining({
        expectedUpdatedAt: mockAction1.updatedAt,
        description: "Inspected hardware connectivity and replaced damaged SATA cable.",
      })
    );
  });

  // TEST-ACT-LOCK-09
  it("TEST-ACT-LOCK-09: locks action creation, editing, and transitions when parent ticket is CANCELLED", async () => {
    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-list")).toBeInTheDocument();
    });

    // Parent cancelled warning badge is displayed
    expect(screen.getByTestId("ticket-cancelled-banner")).toBeInTheDocument();

    // Record Action button should NOT exist
    expect(screen.queryByTestId("record-action-btn")).toBeNull();

    // No edit buttons
    expect(screen.queryByTestId("action-edit-btn-act-001")).toBeNull();

    // No transition buttons
    expect(screen.queryByTestId("action-start-work-btn-act-001")).toBeNull();
    expect(screen.queryByTestId("action-complete-btn-act-001")).toBeNull();
    expect(screen.queryByTestId("action-cancel-btn-act-001")).toBeNull();
  });

  // TEST-ACT-REQUESTER-10
  it("TEST-ACT-REQUESTER-10: enforces strict read-only mode for Requester users", async () => {
    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockRequesterUser}
        isTicketCancelled={false}
        readOnly={true}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-list")).toBeInTheDocument();
    });

    // Actions feed is visible
    expect(screen.getByText("Inspected hardware connectivity and cables.")).toBeInTheDocument();
    expect(screen.getByText("Replaced faulty power unit with standard PSU.")).toBeInTheDocument();

    // But no modify controls are rendered
    expect(screen.queryByTestId("record-action-btn")).toBeNull();
    expect(screen.queryByTestId("action-edit-btn-act-001")).toBeNull();
    expect(screen.queryByTestId("action-start-work-btn-act-001")).toBeNull();
    expect(screen.queryByTestId("action-complete-btn-act-001")).toBeNull();
    expect(screen.queryByTestId("action-cancel-btn-act-001")).toBeNull();
  });

  // TEST-ACT-DISTINCT-11
  it("TEST-ACT-DISTINCT-11: clearly distinguishes Action Performer and Assignee from Ticket Owner", async () => {
    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("action-card-act-001")).toBeInTheDocument();
    });

    const card1 = screen.getByTestId("action-card-act-001");
    // Action performer: John Staff
    expect(within(card1).getByTestId("action-performer")).toHaveTextContent("By: John Staff (IT_STAFF)");
    // Action assignee: Sarah Staff
    expect(within(card1).getByTestId("action-assignee")).toHaveTextContent("Assignee: Sarah Staff");

    const card2 = screen.getByTestId("action-card-act-002");
    // Action performer: System Admin
    expect(within(card2).getByTestId("action-performer")).toHaveTextContent("By: System Admin (ADMINISTRATOR)");
    // Unassigned state
    expect(within(card2).getByText("Unassigned")).toBeInTheDocument();
  });

  // TEST-ACT-ATTACHNOTES-12
  it("TEST-ACT-ATTACHNOTES-12: renders optional attachmentNotes when provided", async () => {
    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("action-card-act-001")).toBeInTheDocument();
    });

    // act-001 has attachmentNotes
    expect(screen.getByTestId("action-attachment-notes")).toHaveTextContent("📎 Notes: See diagnostic_log.png");

    // act-002 does not have attachmentNotes
    const card2 = screen.getByTestId("action-card-act-002");
    expect(within(card2).queryByTestId("action-attachment-notes")).toBeNull();
  });

  // TEST-ACT-STYLE-13
  it("TEST-ACT-STYLE-13: applies Zen Green styling attributes and branding palette", async () => {
    render(
      <ActionsTakenWorkspace
        ticketId="ticket-101"
        currentUser={mockStaffUser}
        isTicketCancelled={false}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId("actions-taken-workspace")).toBeInTheDocument();
    });

    const headerTitle = screen.getByText("Actions Taken Work Log");
    expect(headerTitle).toHaveClass("text-success");

    const recordBtn = screen.getByTestId("record-action-btn");
    expect(recordBtn).toHaveClass("btn-success");
  });
});
