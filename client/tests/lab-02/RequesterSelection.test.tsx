import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../../src/App";
import * as api from "../../src/api";

const mockActiveRequesters = [
  { id: 1, name: "Alice Smith", email: "alice@example.com", isActive: true },
  { id: 2, name: "Bob Jones", email: "bob@example.com", isActive: true },
  { id: 3, name: "Charlie Brown", email: "charlie@example.com", isActive: true },
  { id: 4, name: "Diana Prince", email: "diana@example.com", isActive: true },
];

const mockAllRequestersWithInactive = [
  ...mockActiveRequesters,
  { id: 5, name: "Eve Adams", email: "eve@example.com", isActive: false },
];

describe("Issue #34: Development Requester Selection & Context Suite", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    localStorage.clear();
    originalFetch = global.fetch;
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    localStorage.clear();
  });

  describe("1. Inactive Requester Exclusion", () => {
    it("displays only active requesters and excludes inactive requesters (Eve Adams) from selector UI", async () => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/requesters/active")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockActiveRequesters), // Backend API returns only active
          } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
        expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
        expect(screen.getByText(/Charlie Brown/i)).toBeInTheDocument();
        expect(screen.getByText(/Diana Prince/i)).toBeInTheDocument();
      });

      // Assert inactive seed user Eve Adams is NOT rendered or selectable in the DOM
      expect(screen.queryByText(/Eve Adams/i)).not.toBeInTheDocument();
    });
  });

  describe("2. Invalid Stored Requester Context", () => {
    it("redirects to Requester Selector when LocalStorage contains an invalid or unknown requester ID", async () => {
      // Pre-set invalid/unknown requester ID in LocalStorage
      localStorage.setItem("selectedRequesterId", "9999");

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/requesters/active")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockActiveRequesters),
          } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      });

      render(<App />);

      await waitFor(() => {
        // App must NOT silently authorize invalid requester ID "9999"; it must require selector UI
        expect(screen.getByText(/Select Development Requester|Select Requester/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
      });
    });

    it("redirects to Requester Selector when LocalStorage contains an inactive requester ID (e.g. Eve Adams ID 5)", async () => {
      localStorage.setItem("selectedRequesterId", "5");

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/requesters/active")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockActiveRequesters),
          } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Select Development Requester|Select Requester/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
      });
    });
  });

  describe("3. Valid Stored Requester Access", () => {
    it("allows direct access to requester-scoped screen without redirect when LocalStorage contains valid active requester ID", async () => {
      localStorage.setItem("selectedRequesterId", "1"); // Valid active requester Alice Smith

      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (url.includes("/api/requesters/active")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve(mockActiveRequesters),
          } as Response);
        }
        if (url.includes("/api/tickets")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }),
          } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      });

      render(<App />);

      await waitFor(() => {
        // Valid context allows access to main application shell displaying Alice Smith's identity
        expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
        // Should NOT show the selector screen Continue submission button
        expect(screen.queryByRole("button", { name: /^Continue$/i })).not.toBeInTheDocument();
      });
    });
  });

  describe("4. Requester Switching Replaces Context", () => {
    it("replaces header context and displays new requester identity when switching from Requester A to Requester B", async () => {
      const user = userEvent.setup();
      localStorage.setItem("selectedRequesterId", "1"); // Start with Alice (ID 1)

      const fetchCalls: { url: string; headers: any }[] = [];

      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        fetchCalls.push({ url, headers: init?.headers });
        if (url.includes("/api/requesters/active")) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockActiveRequesters) } as Response);
        }
        if (url.includes("/api/tickets")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }),
          } as Response);
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      });

      render(<App />);

      // 1. Initially Alice Smith is active
      await waitFor(() => {
        expect(screen.getByText(/Alice Smith/i)).toBeInTheDocument();
      });

      // 2. Click Change Requester
      const changeBtn = screen.getByRole("button", { name: /Change Requester/i });
      await user.click(changeBtn);

      // 3. Select Bob Jones (ID 2)
      await waitFor(() => {
        expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
      });

      const bobOption = screen.getByLabelText(/Bob Jones/i) || screen.getByText(/Bob Jones/i);
      await user.click(bobOption);

      const continueBtn = screen.getByRole("button", { name: /Continue/i });
      await user.click(continueBtn);

      // 4. Verify LocalStorage and Header updated to ID 2 (Bob Jones)
      expect(localStorage.getItem("selectedRequesterId")).toBe("2");

      await waitFor(() => {
        expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
        const latestTicketCall = [...fetchCalls].reverse().find((c) => c.url.includes("/api/tickets"));
        const reqHeader = latestTicketCall?.headers?.["X-Requester-Id"] || (latestTicketCall?.headers instanceof Headers ? latestTicketCall.headers.get("X-Requester-Id") : undefined);
        expect(reqHeader).toBe("2");
      });
    });
  });

  describe("5. Requester-Specific Data Refresh", () => {
    it("refreshes and replaces requester A ticket data with requester B ticket data upon switching context", async () => {
      const user = userEvent.setup();
      localStorage.setItem("selectedRequesterId", "1"); // Start as Alice Smith (ID 1)

      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        const headers = init?.headers;
        const reqId = headers?.["X-Requester-Id"] || (headers instanceof Headers ? headers.get("X-Requester-Id") : undefined);

        if (url.includes("/api/requesters/active")) {
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockActiveRequesters) } as Response);
        }
        if (url.includes("/api/tickets")) {
          if (reqId === "1") {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({
                data: [{ id: "t1", ticketNumber: "TCK-001", summary: "Alice VPN Connection Issue", requestedPriority: "HIGH", currentStatus: "NEW" }],
                pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
              }),
            } as Response);
          } else if (reqId === "2") {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve({
                data: [{ id: "t2", ticketNumber: "TCK-002", summary: "Bob Hardware Printer Offline", requestedPriority: "LOW", currentStatus: "NEW" }],
                pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
              }),
            } as Response);
          }
        }
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
      });

      render(<App />);

      // Verify Alice's ticket is rendered initially
      await waitFor(() => {
        expect(screen.getByText(/Alice VPN Connection Issue/i)).toBeInTheDocument();
      });

      // Switch to Bob (ID 2)
      const changeBtn = screen.getByRole("button", { name: /Change Requester/i });
      await user.click(changeBtn);

      await waitFor(() => {
        expect(screen.getByText(/Bob Jones/i)).toBeInTheDocument();
      });

      const bobOption = screen.getByLabelText(/Bob Jones/i) || screen.getByText(/Bob Jones/i);
      await user.click(bobOption);

      const continueBtn = screen.getByRole("button", { name: /Continue/i });
      await user.click(continueBtn);

      // Verify Bob's ticket replaces Alice's ticket
      await waitFor(() => {
        expect(screen.getByText(/Bob Hardware Printer Offline/i)).toBeInTheDocument();
        expect(screen.queryByText(/Alice VPN Connection Issue/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("6. Responsive Viewport & UI Contract (docs/lab-02/ui-spec.md)", () => {
    const viewports = [
      { name: "Desktop", width: 1200, height: 900 },
      { name: "Tablet", width: 768, height: 1024 },
      { name: "Mobile", width: 375, height: 667 },
    ];

    viewports.forEach((vp) => {
      it(`renders accessible and usable requester selection controls on ${vp.name} (${vp.width}px)`, async () => {
        // Set viewport width & height
        window.innerWidth = vp.width;
        window.innerHeight = vp.height;
        window.dispatchEvent(new Event("resize"));

        global.fetch = vi.fn().mockImplementation((url: string) => {
          if (url.includes("/api/requesters/active")) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve(mockActiveRequesters),
            } as Response);
          }
          return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
        });

        render(<App />);

        await waitFor(() => {
          expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
          expect(screen.getByRole("button", { name: /Continue/i })).toBeInTheDocument();
        });
      });
    });
  });
});
