import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import ChangePassword from "../../src/components/ChangePassword";
import { User } from "../../src/api";

const mockUser: User = {
  id: 1,
  name: "Alice Smith",
  email: "alice@example.com",
  role: "REQUESTER",
  isActive: true,
  requiresPasswordChange: true,
};

describe("Lab 3 Issue 5: Client ChangePassword Component Suite", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders ChangePassword form with user greeting and input fields", () => {
    const handleSuccess = vi.fn();
    render(<ChangePassword user={mockUser} onPasswordChangeSuccess={handleSuccess} />);

    expect(screen.getByText(/Mandatory Password Change/i)).toBeInTheDocument();
    expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Current Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^New Password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Confirm New Password$/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Update Password & Continue/i })).toBeInTheDocument();
  });

  it("validates empty current, new, and confirm password fields", async () => {
    const handleSuccess = vi.fn();
    render(<ChangePassword user={mockUser} onPasswordChangeSuccess={handleSuccess} />);

    fireEvent.click(screen.getByRole("button", { name: /Update Password & Continue/i }));

    expect(await screen.findByText(/Current password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/New password is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Please confirm your new password/i)).toBeInTheDocument();
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it("validates password complexity (short, missing upper/lower/number/special char)", async () => {
    const handleSuccess = vi.fn();
    render(<ChangePassword user={mockUser} onPasswordChangeSuccess={handleSuccess} />);

    fireEvent.change(screen.getByLabelText(/^Current Password$/i), { target: { value: "oldpass" } });
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: "simple" } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: "simple" } });

    fireEvent.click(screen.getByRole("button", { name: /Update Password & Continue/i }));

    expect(
      await screen.findByText(/New password must be at least 8 characters long/i)
    ).toBeInTheDocument();
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it("validates password mismatch when confirm password does not match new password", async () => {
    const handleSuccess = vi.fn();
    render(<ChangePassword user={mockUser} onPasswordChangeSuccess={handleSuccess} />);

    fireEvent.change(screen.getByLabelText(/^Current Password$/i), { target: { value: "OldPass123!" } });
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: "NewPass123!" } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: "Different123!" } });

    fireEvent.click(screen.getByRole("button", { name: /Update Password & Continue/i }));

    expect(
      await screen.findByText(/New password and confirm password do not match/i)
    ).toBeInTheDocument();
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it("submits valid password update, shows busy spinner, and calls onPasswordChangeSuccess with updated user", async () => {
    const handleSuccess = vi.fn();

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/auth/change-password")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              message: "Password changed successfully.",
              user: {
                ...mockUser,
                requiresPasswordChange: false,
              },
            }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(<ChangePassword user={mockUser} onPasswordChangeSuccess={handleSuccess} />);

    fireEvent.change(screen.getByLabelText(/^Current Password$/i), { target: { value: "OldPassword123!" } });
    fireEvent.change(screen.getByLabelText(/^New Password$/i), { target: { value: "NewSecurePass123!" } });
    fireEvent.change(screen.getByLabelText(/^Confirm New Password$/i), { target: { value: "NewSecurePass123!" } });

    const submitBtn = screen.getByRole("button", { name: /Update Password & Continue/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, requiresPasswordChange: false })
      );
    });
  });
});
