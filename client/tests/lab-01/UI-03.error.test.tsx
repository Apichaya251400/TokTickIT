import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import App from "../../src/App";
import * as api from "../../src/api";

describe("UI-03: Error Handling State Rendering", () => {
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

  it("displays System Status Offline and error message on API failure", async () => {
    vi.spyOn(api, "checkSystem").mockRejectedValueOnce(
      new Error("Unable to connect to TokTickIT API")
    );

    render(<App />);

    const checkBtn = await screen.findByRole("button", { name: /Check System/i });
    fireEvent.click(checkBtn);

    await waitFor(() => {
      expect(screen.getByText("System Status: Offline")).toBeInTheDocument();
    });

    expect(screen.getByText(/Unable to connect to TokTickIT API/i)).toBeInTheDocument();
  });
});
