import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StaffTicketQueue from "../../src/components/StaffTicketQueue";
import * as api from "../../src/api";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual("../../src/api");
  return {
    ...actual,
    fetchQueueTickets: vi.fn(),
  };
});

describe("StaffTicketQueue Component Suite (StaffTicketQueue.test.tsx)", () => {
  const mockUser: api.User = {
    id: 2,
    name: "John Staff",
    email: "john.staff@toktick.it",
    role: "IT_STAFF",
    isActive: true,
    requiresPasswordChange: false,
  };

  const sampleTickets = [
    {
      id: "tkt-uuid-001",
      ticketNumber: "TKT-2026-000001",
      summary: "Cannot access email",
      requestedPriority: "HIGH",
      itPriority: "HIGH",
      currentStatus: "IN_PROGRESS",
      requester: { id: 1, name: "Alice Smith", email: "alice@example.com" },
      owner: { id: 2, name: "John Staff", email: "john.staff@toktick.it" },
      createdAt: "2026-09-17T00:00:00.000Z",
      updatedAt: "2026-09-17T00:00:00.000Z",
    },
    {
      id: "tkt-uuid-002",
      ticketNumber: "TKT-2026-000002",
      summary: "Wi-Fi disconnection issue",
      requestedPriority: "MEDIUM",
      itPriority: "LOW",
      currentStatus: "NEW",
      requester: { id: 3, name: "Bob Jones", email: "bob@example.com" },
      owner: null,
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders search, filter dropdowns, owner tabs, pagination, desktop table, and mobile cards", async () => {
    vi.mocked(api.fetchQueueTickets).mockResolvedValueOnce({
      data: sampleTickets,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    const onSelectTicket = vi.fn();
    render(<StaffTicketQueue currentUser={mockUser} onSelectTicket={onSelectTicket} />);

    // Check loading indicator initially
    expect(screen.getByText(/Loading ticket queue…/i)).toBeInTheDocument();

    // Wait for data load
    await waitFor(() => {
      expect(screen.getByTestId("staff-queue-page")).toBeInTheDocument();
    });

    // Check owner tabs
    expect(screen.getByTestId("queue-owner-all")).toBeInTheDocument();
    expect(screen.getByTestId("queue-owner-my")).toBeInTheDocument();
    expect(screen.getByTestId("queue-owner-unassigned")).toBeInTheDocument();

    // Check search and filter controls
    expect(screen.getByTestId("queue-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("queue-status-filter")).toBeInTheDocument();
    expect(screen.getByTestId("queue-requested-priority-filter")).toBeInTheDocument();
    expect(screen.getByTestId("queue-it-priority-filter")).toBeInTheDocument();

    // Check pagination
    expect(screen.getByTestId("queue-pagination")).toBeInTheDocument();

    // Check ticket content rendered
    expect(screen.getAllByText("TKT-2026-000001").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Cannot access email").length).toBeGreaterThan(0);
  });

  it("handles owner tab switching", async () => {
    vi.mocked(api.fetchQueueTickets).mockResolvedValue({
      data: sampleTickets,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    const onSelectTicket = vi.fn();
    render(<StaffTicketQueue currentUser={mockUser} onSelectTicket={onSelectTicket} />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-owner-my")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("queue-owner-my"));

    await waitFor(() => {
      expect(api.fetchQueueTickets).toHaveBeenLastCalledWith(
        expect.objectContaining({ owner: "my_queue" })
      );
    });
  });

  it("triggers onSelectTicket callback when clicking a ticket row/card", async () => {
    vi.mocked(api.fetchQueueTickets).mockResolvedValueOnce({
      data: sampleTickets,
      pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
    });

    const onSelectTicket = vi.fn();
    render(<StaffTicketQueue currentUser={mockUser} onSelectTicket={onSelectTicket} />);

    await waitFor(() => {
      expect(screen.getAllByTestId("ticket-item-tkt-uuid-001")[0]).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByTestId("ticket-item-tkt-uuid-001")[0]);
    expect(onSelectTicket).toHaveBeenCalledWith("tkt-uuid-001");
  });

  it("renders 403 Forbidden state when API responds with FORBIDDEN status", async () => {
    vi.mocked(api.fetchQueueTickets).mockRejectedValueOnce({
      status: 403,
      data: { error: "FORBIDDEN" },
    });

    const onSelectTicket = vi.fn();
    render(<StaffTicketQueue currentUser={mockUser} onSelectTicket={onSelectTicket} />);

    await waitFor(() => {
      expect(screen.getByText(/Access Denied \(403 Forbidden\)/i)).toBeInTheDocument();
    });
  });

  it("renders empty queue state when system has zero tickets", async () => {
    vi.mocked(api.fetchQueueTickets).mockResolvedValueOnce({
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    const onSelectTicket = vi.fn();
    render(<StaffTicketQueue currentUser={mockUser} onSelectTicket={onSelectTicket} />);

    await waitFor(() => {
      expect(screen.getByText(/Queue is empty/i)).toBeInTheDocument();
    });
  });

  it("renders no-results state when search/filter returns zero matches", async () => {
    vi.mocked(api.fetchQueueTickets).mockResolvedValue({
      data: [],
      pagination: { total: 0, page: 1, limit: 10, totalPages: 0 },
    });

    const onSelectTicket = vi.fn();
    render(<StaffTicketQueue currentUser={mockUser} onSelectTicket={onSelectTicket} />);

    await waitFor(() => {
      expect(screen.getByTestId("queue-search-input")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId("queue-search-input"), { target: { value: "NonExistentKeyword" } });

    await waitFor(() => {
      expect(screen.getByText(/No matching tickets found/i)).toBeInTheDocument();
    });
  });

  it("renders error failure state and handles Retry click", async () => {
    vi.mocked(api.fetchQueueTickets)
      .mockRejectedValueOnce({ message: "Network connection error" })
      .mockResolvedValueOnce({
        data: sampleTickets,
        pagination: { total: 2, page: 1, limit: 10, totalPages: 1 },
      });

    const onSelectTicket = vi.fn();
    render(<StaffTicketQueue currentUser={mockUser} onSelectTicket={onSelectTicket} />);

    await waitFor(() => {
      expect(screen.getByText(/Network connection error/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /Retry/i }));

    await waitFor(() => {
      expect(screen.getAllByTestId("ticket-item-tkt-uuid-001")[0]).toBeInTheDocument();
    });
  });
});
