import { render, screen, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import App from "../../src/App";

describe("UI-01: Heading and Action Button Rendering", () => {
  let originalFetch: typeof globalThis.fetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/api/auth/me")) {
        return Promise.resolve({
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
      }
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("renders TokTickIT heading and Check System button", async () => {
    render(<App />);
    await waitFor(() => {
      expect(screen.getByText(/TokTick/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Check System/i })).toBeInTheDocument();
    });
  });
});
