import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import UserManagement from "../../src/components/UserManagement";
import * as api from "../../src/api";

vi.mock("../../src/api", async () => {
  const actual = await vi.importActual("../../src/api");
  return {
    ...actual,
    fetchAdminUsers: vi.fn(),
    createAdminUser: vi.fn(),
    updateAdminUser: vi.fn(),
    resetUserInitialPassword: vi.fn(),
  };
});

describe("UserManagement Component Suite (UserManagement.test.tsx)", () => {
  const mockAdminUser: api.User = {
    id: 99,
    name: "System Administrator",
    email: "admin@toktick.it",
    role: "ADMINISTRATOR",
    isActive: true,
    requiresPasswordChange: false,
  };

  const mockStaffUser: api.User = {
    id: 5,
    name: "Staff Member",
    email: "staff@toktick.it",
    role: "IT_STAFF",
    isActive: true,
    requiresPasswordChange: false,
  };

  const sampleAdminUsers: api.AdminUser[] = [
    {
      id: 1,
      name: "Alice Requester",
      email: "alice@example.com",
      role: "REQUESTER",
      isActive: true,
      requiresPasswordChange: false,
      createdAt: "2026-09-01T00:00:00.000Z",
    },
    {
      id: 2,
      name: "Bob Staff",
      email: "bob@example.com",
      role: "IT_STAFF",
      isActive: true,
      requiresPasswordChange: true,
      createdAt: "2026-09-02T00:00:00.000Z",
    },
    {
      id: 99,
      name: "System Administrator",
      email: "admin@toktick.it",
      role: "ADMINISTRATOR",
      isActive: true,
      requiresPasswordChange: false,
      createdAt: "2026-09-03T00:00:00.000Z",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders 403 Forbidden banner for non-Administrator users", () => {
    render(<UserManagement currentUser={mockStaffUser} />);

    expect(screen.getByTestId("admin-forbidden-banner")).toBeInTheDocument();
    expect(screen.getByTestId("forbidden-alert")).toBeInTheDocument();
    expect(screen.getByText(/403 Forbidden/i)).toBeInTheDocument();
    expect(api.fetchAdminUsers).not.toHaveBeenCalled();
  });

  it("renders user directory table, search bar, role filter, and create user button for Administrator", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValueOnce({
      users: sampleAdminUsers,
    });

    render(<UserManagement currentUser={mockAdminUser} />);

    expect(screen.getByTestId("admin-user-search-input")).toBeInTheDocument();
    expect(screen.getByTestId("admin-user-role-filter")).toBeInTheDocument();
    expect(screen.getByTestId("create-user-btn")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-table")).toBeInTheDocument();
    });

    expect(screen.getByTestId("admin-user-row-1")).toBeInTheDocument();
    expect(screen.getByTestId("user-name-1")).toHaveTextContent("Alice Requester");
    expect(screen.getByTestId("user-email-1")).toHaveTextContent("alice@example.com");
    expect(screen.getByTestId("user-role-1")).toHaveTextContent("REQUESTER");
    expect(screen.getByTestId("user-status-1")).toHaveTextContent("ACTIVE");

    expect(screen.getByTestId("admin-user-row-99")).toBeInTheDocument();
    expect(screen.getByTestId("user-name-99")).toHaveTextContent("System Administrator");
  });

  it("triggers search and role filter queries when filter inputs change", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({
      users: sampleAdminUsers,
    });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith("", "");
    });

    const searchInput = screen.getByTestId("admin-user-search-input");
    fireEvent.change(searchInput, { target: { value: "alice" } });

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith("alice", "");
    });

    const roleSelect = screen.getByTestId("admin-user-role-filter");
    fireEvent.change(roleSelect, { target: { value: "REQUESTER" } });

    await waitFor(() => {
      expect(api.fetchAdminUsers).toHaveBeenCalledWith("alice", "REQUESTER");
    });
  });

  it("opens Create User modal, submits valid new user payload, and refreshes directory", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({ users: sampleAdminUsers });
    vi.mocked(api.createAdminUser).mockResolvedValueOnce({
      message: "User created successfully",
      user: {
        id: 10,
        name: "Charlie New",
        email: "charlie@example.com",
        role: "IT_STAFF",
        isActive: true,
        requiresPasswordChange: true,
      },
    });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-table")).toBeInTheDocument();
    });

    const createBtn = screen.getByTestId("create-user-btn");
    fireEvent.click(createBtn);

    expect(screen.getByTestId("create-user-modal")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("user-form-name"), { target: { value: "Charlie New" } });
    fireEvent.change(screen.getByTestId("user-form-email"), { target: { value: "charlie@example.com" } });
    fireEvent.change(screen.getByTestId("user-form-role"), { target: { value: "IT_STAFF" } });
    fireEvent.change(screen.getByTestId("user-form-password"), { target: { value: "SecretInitial123!" } });

    const submitBtn = screen.getByTestId("submit-user-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.createAdminUser).toHaveBeenCalledWith({
        name: "Charlie New",
        email: "charlie@example.com",
        role: "IT_STAFF",
        isActive: true,
        initialPassword: "SecretInitial123!",
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-success-alert")).toBeInTheDocument();
    });
  });

  it("handles backend safety guard error when attempting self-deactivation in Edit modal", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({ users: sampleAdminUsers });
    vi.mocked(api.updateAdminUser).mockRejectedValueOnce({
      status: 400,
      data: {
        error: {
          code: "INVALID_ADMIN_ACTION",
          message: "Administrators cannot deactivate their own account",
        },
      },
    });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-table")).toBeInTheDocument();
    });

    const editBtn = screen.getByTestId("edit-user-btn-99");
    fireEvent.click(editBtn);

    expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();

    const activeSwitch = screen.getByTestId("user-form-active");
    fireEvent.click(activeSwitch); // Toggle off

    const submitBtn = screen.getByTestId("submit-user-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId("admin-error-alert")).toHaveTextContent(
        "Administrators cannot deactivate their own account"
      );
    });
  });

  it("opens Reset Password modal, submits new initial password, and shows success banner", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({ users: sampleAdminUsers });
    vi.mocked(api.resetUserInitialPassword).mockResolvedValueOnce({
      message: "Initial password reset successfully",
      user: sampleAdminUsers[0],
    });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-table")).toBeInTheDocument();
    });

    const resetBtn = screen.getByTestId("reset-password-btn-1");
    fireEvent.click(resetBtn);

    expect(screen.getByTestId("reset-password-modal")).toBeInTheDocument();

    const passwordInput = screen.getByTestId("reset-password-input");
    fireEvent.change(passwordInput, { target: { value: "NewTempPassword123!" } });

    const submitBtn = screen.getByTestId("submit-reset-password-btn");
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(api.resetUserInitialPassword).toHaveBeenCalledWith(1, "NewTempPassword123!");
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-success-alert")).toBeInTheDocument();
    });
  });

  it("validates invalid email format and short password in Create modal", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({ users: sampleAdminUsers });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-table")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("create-user-btn"));
    expect(screen.getByTestId("create-user-modal")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("user-form-name"), { target: { value: "Test User" } });
    fireEvent.change(screen.getByTestId("user-form-email"), { target: { value: "invalid-email" } });
    fireEvent.change(screen.getByTestId("user-form-password"), { target: { value: "Password123!" } });

    const form = screen.getByTestId("create-user-modal").querySelector("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId("admin-error-alert")).toHaveTextContent("Please enter a valid email address.");
    });

    // Fix email, short password
    fireEvent.change(screen.getByTestId("user-form-email"), { target: { value: "valid@toktick.it" } });
    fireEvent.change(screen.getByTestId("user-form-password"), { target: { value: "short" } });

    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByTestId("admin-error-alert")).toHaveTextContent("Initial password must be at least 8 characters.");
    });
  });

  it("handles duplicate email error (409 DUPLICATE_EMAIL) in Create User modal", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({ users: sampleAdminUsers });
    vi.mocked(api.createAdminUser).mockRejectedValueOnce({
      status: 409,
      data: {
        error: {
          code: "DUPLICATE_EMAIL",
          message: "A user with this email address already exists",
        },
      },
    });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-table")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("create-user-btn"));
    fireEvent.change(screen.getByTestId("user-form-name"), { target: { value: "Duplicate User" } });
    fireEvent.change(screen.getByTestId("user-form-email"), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByTestId("user-form-password"), { target: { value: "ValidPass123!" } });

    fireEvent.click(screen.getByTestId("submit-user-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-error-alert")).toHaveTextContent("A user with this email address already exists");
    });
  });

  it("edits user details successfully and displays success banner", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({ users: sampleAdminUsers });
    vi.mocked(api.updateAdminUser).mockResolvedValueOnce({
      message: "User updated successfully",
      user: {
        id: 1,
        name: "Alice Updated",
        email: "alice@example.com",
        role: "REQUESTER",
        isActive: true,
        requiresPasswordChange: false,
      },
    });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-table")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("edit-user-btn-1"));
    expect(screen.getByTestId("edit-user-modal")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("user-form-name"), { target: { value: "Alice Updated" } });
    fireEvent.click(screen.getByTestId("submit-user-btn"));

    await waitFor(() => {
      expect(api.updateAdminUser).toHaveBeenCalledWith(1, {
        name: "Alice Updated",
        email: "alice@example.com",
        role: "REQUESTER",
        isActive: true,
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId("admin-success-alert")).toBeInTheDocument();
    });
  });

  it("handles generic network / API fetch failure and displays error banner", async () => {
    vi.mocked(api.fetchAdminUsers).mockRejectedValueOnce({
      message: "Network connection failure",
    });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-error-alert")).toHaveTextContent("Network connection failure");
    });
  });

  it("validates reset password length (< 8 chars)", async () => {
    vi.mocked(api.fetchAdminUsers).mockResolvedValue({ users: sampleAdminUsers });

    render(<UserManagement currentUser={mockAdminUser} />);

    await waitFor(() => {
      expect(screen.getByTestId("admin-user-table")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("reset-password-btn-1"));
    expect(screen.getByTestId("reset-password-modal")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("reset-password-input"), { target: { value: "short" } });
    fireEvent.click(screen.getByTestId("submit-reset-password-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("admin-error-alert")).toHaveTextContent("New initial password must be at least 8 characters.");
    });
  });
});
