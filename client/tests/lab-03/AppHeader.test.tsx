import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import AppHeader, { NavTab } from "../../src/components/AppHeader";
import * as apiModule from "../../src/api";

vi.mock("../../src/api", async (importOriginal) => {
  const actual = await importOriginal<typeof apiModule>();
  return {
    ...actual,
    logoutApi: vi.fn().mockResolvedValue({ message: "Logged out successfully" }),
  };
});

describe("AppHeader Component - Role-Based Navigation & Shell", () => {
  const mockOnTabChange = vi.fn();
  const mockOnLogout = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders REQUESTER role badge and requester navigation tabs", () => {
    const user = {
      id: 1,
      name: "Alice Requester",
      email: "alice@example.com",
      role: "REQUESTER" as const,
      isActive: true,
      requiresPasswordChange: false,
    };

    render(
      <AppHeader
        user={user}
        activeTab="my-tickets"
        onTabChange={mockOnTabChange}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText("Alice Requester")).toBeInTheDocument();
    expect(screen.getByText("Requester")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My Tickets" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Ticket" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "My Queue" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();

    const myTicketsBtn = screen.getByRole("button", { name: "My Tickets" });
    expect(myTicketsBtn).toHaveAttribute("aria-current", "page");
  });

  it("renders IT_STAFF role badge and IT staff navigation tabs", () => {
    const user = {
      id: 2,
      name: "Bob Staff",
      email: "bob@example.com",
      role: "IT_STAFF" as const,
      isActive: true,
      requiresPasswordChange: false,
    };

    render(
      <AppHeader
        user={user}
        activeTab="staff-queue"
        onTabChange={mockOnTabChange}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText("Bob Staff")).toBeInTheDocument();
    expect(screen.getByText("IT Staff")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "My Queue" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Ticket" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "My Tickets" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "User Management" })).not.toBeInTheDocument();

    const staffQueueBtn = screen.getByRole("button", { name: "My Queue" });
    expect(staffQueueBtn).toHaveAttribute("aria-current", "page");
  });

  it("renders ADMINISTRATOR role badge and admin navigation tabs", () => {
    const user = {
      id: 3,
      name: "Charlie Admin",
      email: "charlie@example.com",
      role: "ADMINISTRATOR" as const,
      isActive: true,
      requiresPasswordChange: false,
    };

    render(
      <AppHeader
        user={user}
        activeTab="user-management"
        onTabChange={mockOnTabChange}
        onLogout={mockOnLogout}
      />
    );

    expect(screen.getByText("Charlie Admin")).toBeInTheDocument();
    expect(screen.getByText("Administrator")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "User Management" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "My Tickets" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "My Queue" })).not.toBeInTheDocument();

    const adminBtn = screen.getByRole("button", { name: "User Management" });
    expect(adminBtn).toHaveAttribute("aria-current", "page");
  });

  it("calls onTabChange when navigation tab buttons are clicked", () => {
    const user = {
      id: 1,
      name: "Alice Requester",
      email: "alice@example.com",
      role: "REQUESTER" as const,
      isActive: true,
      requiresPasswordChange: false,
    };

    render(
      <AppHeader
        user={user}
        activeTab="my-tickets"
        onTabChange={mockOnTabChange}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Ticket" }));
    expect(mockOnTabChange).toHaveBeenCalledWith("create-ticket");
  });

  it("triggers logoutApi and onLogout callback when logout button is clicked", async () => {
    const user = {
      id: 1,
      name: "Alice Requester",
      email: "alice@example.com",
      role: "REQUESTER" as const,
      isActive: true,
      requiresPasswordChange: false,
    };

    render(
      <AppHeader
        user={user}
        activeTab="my-tickets"
        onTabChange={mockOnTabChange}
        onLogout={mockOnLogout}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "Logout" }));

    await waitFor(() => {
      expect(apiModule.logoutApi).toHaveBeenCalledTimes(1);
      expect(mockOnLogout).toHaveBeenCalledTimes(1);
    });
  });
});
