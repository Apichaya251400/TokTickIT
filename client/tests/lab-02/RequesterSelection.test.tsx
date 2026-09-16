import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import App from "../../src/App";

describe("Lab 3 Issue 5: Removal of Dev Requester Selector", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    localStorage.clear();
    originalFetch = globalThis.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    localStorage.clear();
  });

  it("verifies development requester selector UI is completely removed and unauthenticated users see Login", async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
          ok: false,
          status: 401,
          json: () => Promise.resolve({ error: { message: "Unauthorized" } }),
        } as Response);
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Sign In/i })).toBeInTheDocument();
    });

    expect(screen.queryByText(/Select Development Requester/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Continue$/i })).not.toBeInTheDocument();
  });
});
