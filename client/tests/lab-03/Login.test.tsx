import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import Login from "../../src/components/Login";

describe("Lab 3 Issue 5: Client Login Component Suite", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders login form elements (email input, password input, sign in button)", () => {
    const handleSuccess = vi.fn();
    render(<Login onLoginSuccess={handleSuccess} />);

    expect(screen.getByLabelText(/Email Address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
  });

  it("validates empty email and password submission", async () => {
    const handleSuccess = vi.fn();
    render(<Login onLoginSuccess={handleSuccess} />);

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/Email address is required/i)).toBeInTheDocument();
    expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it("validates invalid email format", async () => {
    const handleSuccess = vi.fn();
    render(<Login onLoginSuccess={handleSuccess} />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "invalid-email" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "Password123!" } });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
    expect(handleSuccess).not.toHaveBeenCalled();
  });

  it("disables submit button and shows busy spinner state during in-flight login request", async () => {
    const handleSuccess = vi.fn();
    let resolveLogin!: (res: Response) => void;

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/auth/login")) {
        return new Promise<Response>((resolve) => {
          resolveLogin = resolve;
        });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(<Login onLoginSuccess={handleSuccess} />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "alice@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "Password123!" } });

    const submitBtn = screen.getByRole("button", { name: /Sign In/i });
    fireEvent.click(submitBtn);

    expect(submitBtn).toBeDisabled();
    expect(screen.getByText(/Signing in…/i)).toBeInTheDocument();

    resolveLogin({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({
          user: {
            id: 1,
            name: "Alice Smith",
            email: "alice@example.com",
            role: "REQUESTER",
            isActive: true,
            requiresPasswordChange: false,
          },
        }),
    } as Response);

    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: 1, email: "alice@example.com" })
      );
    });
  });

  it("displays error alert banner on invalid credentials (401 response)", async () => {
    const handleSuccess = vi.fn();

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/auth/login")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ message: "Invalid email address or password." }),
        } as Response);
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) } as Response);
    });

    render(<Login onLoginSuccess={handleSuccess} />);

    fireEvent.change(screen.getByLabelText(/Email Address/i), { target: { value: "wrong@example.com" } });
    fireEvent.change(screen.getByLabelText(/Password/i), { target: { value: "WrongPass!" } });

    fireEvent.click(screen.getByRole("button", { name: /Sign In/i }));

    expect(await screen.findByText(/Invalid email address or password/i)).toBeInTheDocument();
    expect(handleSuccess).not.toHaveBeenCalled();
  });
});
