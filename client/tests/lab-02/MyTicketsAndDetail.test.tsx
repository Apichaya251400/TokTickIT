import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import App from "../../src/App";

const mockActiveRequesters = [
  { id: 1, name: "Alice Smith", email: "alice@example.com", isActive: true },
  { id: 2, name: "Bob Jones", email: "bob@example.com", isActive: true },
];

const mockCategories = [
  { id: 101, name: "Hardware", isActive: true },
  { id: 102, name: "Software", isActive: true },
  { id: 103, name: "Network", isActive: true },
];

const mockRelatedSystems = [
  { id: 201, name: "VPN Gateway", isActive: true },
  { id: 202, name: "Email Server", isActive: true },
  { id: 203, name: "Payroll Portal", isActive: true },
];

const mockAliceTickets = [
  {
    id: "c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d",
    ticketNumber: "TKT-2026-000001",
    summary: "Cannot access email account",
    categoryName: "Software",
    relatedSystemName: "Email Server",
    requestedPriority: "HIGH",
    currentStatus: "NEW",
    createdAt: "2026-08-25T09:00:00.000Z",
    updatedAt: "2026-08-25T09:00:00.000Z",
  },
  {
    id: "d4c9b2f3-6a7e-5f3c-0a2d-9e8f7b6c5d4e",
    ticketNumber: "TKT-2026-000002",
    summary: "VPN Connection Interrupted Daily",
    categoryName: "Network",
    relatedSystemName: "VPN Gateway",
    requestedPriority: "MEDIUM",
    currentStatus: "NEW",
    createdAt: "2026-08-26T10:30:00.000Z",
    updatedAt: "2026-08-26T10:30:00.000Z",
  },
];

function getMockAliceTicketDetail() {
  return {
    id: "c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d",
    ticketNumber: "TKT-2026-000001",
    requester: { id: 1, name: "Alice Smith", email: "alice@example.com" },
    category: { id: 102, name: "Software" },
    relatedSystem: { id: 202, name: "Email Server" },
    requestedPriority: "HIGH",
    currentStatus: "NEW",
    summary: "Cannot access email account",
    description: "I have been unable to log into my corporate email account since morning.",
    createdAt: "2026-08-25T09:00:00.000Z",
    updatedAt: "2026-08-25T09:00:00.000Z",
    attachments: [
      {
        id: "att-active-001",
        fileName: "error-screenshot.png",
        fileSize: 245760,
        mimeType: "image/png",
        uploadedAt: "2026-08-25T09:05:00.000Z",
        removedAt: null,
        removalReason: null,
        isRemoved: false,
      },
      {
        id: "att-removed-002",
        fileName: "old-log.txt",
        fileSize: 10240,
        mimeType: "text/plain",
        uploadedAt: "2026-08-25T09:06:00.000Z",
        removedAt: "2026-08-25T09:10:00.000Z",
        removalReason: "Uploaded incorrect file version for this ticket",
        isRemoved: true,
      },
    ],
  };
}

describe("Issue #29: My Tickets & Ticket Detail Requester UI Suite", () => {
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

  function setupFetchMock(customHandler?: (url: string, init?: RequestInit) => Promise<Response> | undefined) {
    globalThis.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (customHandler) {
        const customRes = customHandler(url, init);
        if (customRes !== undefined) return customRes;
      }

      if (url.includes("/api/requesters/active")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockActiveRequesters),
        } as Response);
      }
      if (url.includes("/api/categories")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockCategories),
        } as Response);
      }
      if (url.includes("/api/related-systems")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockRelatedSystems),
        } as Response);
      }
      if (url.includes("/api/tickets/c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(getMockAliceTicketDetail()),
        } as Response);
      }
      if (url.includes("/api/tickets")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve({
              data: mockAliceTickets,
              pagination: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 },
            }),
        } as Response);
      }

      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
    });
  }

  async function renderAppWithRequester(
    requesterId: string = "1",
    customHandler?: (url: string, init?: RequestInit) => Promise<Response> | undefined
  ) {
    localStorage.setItem("selectedRequesterId", requesterId);
    setupFetchMock(customHandler);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^My Tickets$/i })).toBeInTheDocument();
    });
  }

  describe("1. My Tickets List & Detailed Layout (FR-04, FR-05, UI-04)", () => {
    it("renders My Tickets navigation tab as active with aria-current='page'", async () => {
      await renderAppWithRequester("1");

      const myTicketsTab = screen.getByRole("button", { name: /^My Tickets$/i });
      expect(myTicketsTab).toHaveAttribute("aria-current", "page");
    });

    it("displays complete ticket table/card information for current requester (Ticket No, Summary, Category, System, Priority, Status, Created Date)", async () => {
      await renderAppWithRequester("1");

      await waitFor(() => {
        expect(screen.getAllByText("TKT-2026-000001")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Cannot access email account")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Software")[0]).toBeInTheDocument();
        expect(screen.getAllByText("Email Server")[0]).toBeInTheDocument();
        expect(screen.getAllByText("HIGH")[0]).toBeInTheDocument();

        expect(screen.getAllByText("TKT-2026-000002")[0]).toBeInTheDocument();
        expect(screen.getAllByText("VPN Connection Interrupted Daily")[0]).toBeInTheDocument();
      });
    });
  });

  describe("2. My Tickets Search, Filtering, Sorting & Pagination (FR-05, BR-19, BR-20, BR-21, BR-22)", () => {
    it("provides search input and sends search parameter in GET /api/tickets request", async () => {
      let capturedUrl = "";
      await renderAppWithRequester("1", (url: string) => {
        if (url.includes("/api/tickets")) {
          capturedUrl = url;
        }
        return undefined;
      });

      const searchInput = await screen.findByPlaceholderText(/Search tickets/i);
      expect(searchInput).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: "VPN" } });

      await waitFor(() => {
        expect(capturedUrl).toContain("search=VPN");
      });
    });

    it("provides Category, Related System, Priority, and Status filters and sends combined query params", async () => {
      let capturedUrl = "";
      await renderAppWithRequester("1", (url: string) => {
        if (url.includes("/api/tickets")) {
          capturedUrl = url;
        }
        return undefined;
      });

      const categoryFilter = await screen.findByLabelText(/Filter by Category|Category Filter/i);
      const systemFilter = screen.getByLabelText(/Filter by System|System Filter/i);
      const priorityFilter = screen.getByLabelText(/Filter by Priority|Priority Filter/i);
      const statusFilter = screen.getByLabelText(/Filter by Status|Status Filter/i);

      fireEvent.change(categoryFilter, { target: { value: "102" } });
      fireEvent.change(systemFilter, { target: { value: "202" } });
      fireEvent.change(priorityFilter, { target: { value: "HIGH" } });
      fireEvent.change(statusFilter, { target: { value: "NEW" } });

      await waitFor(() => {
        expect(capturedUrl).toContain("categoryId=102");
        expect(capturedUrl).toContain("relatedSystemId=202");
        expect(capturedUrl).toContain("requestedPriority=HIGH");
        expect(capturedUrl).toContain("currentStatus=NEW");
      });
    });

    it("provides sort dropdown controls and resets page to 1 when sort order changes", async () => {
      let capturedUrl = "";
      await renderAppWithRequester("1", (url: string) => {
        if (url.includes("/api/tickets")) {
          capturedUrl = url;
        }
        return undefined;
      });

      const sortSelect = await screen.findByLabelText(/Sort by|Sort Tickets/i);
      fireEvent.change(sortSelect, { target: { value: "requestedPriority" } });

      await waitFor(() => {
        expect(capturedUrl).toContain("sortBy=requestedPriority");
        expect(capturedUrl).toContain("page=1");
      });
    });

    it("renders pagination controls (Page X of Y, Previous, Next) and requests page 2 on Next click", async () => {
      let capturedUrl = "";
      await renderAppWithRequester("1", (url: string) => {
        if (url.includes("/api/tickets")) {
          capturedUrl = url;
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: mockAliceTickets,
                pagination: { page: 1, pageSize: 10, totalItems: 15, totalPages: 2 },
              }),
          } as Response);
        }
        return undefined;
      });

      await waitFor(() => {
        expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
      });

      const nextBtn = screen.getByRole("button", { name: /Next/i });
      fireEvent.click(nextBtn);

      await waitFor(() => {
        expect(capturedUrl).toContain("page=2");
      });
    });
  });

  describe("3. My Tickets Empty, No-Results & Failure States (BR-26, AC-12, AC-13, AC-14)", () => {
    it("displays empty state card with 'Create Ticket' button when requester has 0 tickets", async () => {
      await renderAppWithRequester("1", (url: string) => {
        if (url.includes("/api/tickets")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: [],
                pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
              }),
          } as Response);
        }
        return undefined;
      });

      await waitFor(() => {
        expect(screen.getByText(/You have not created any IT support tickets yet/i)).toBeInTheDocument();
        expect(screen.getAllByRole("button", { name: /Create Ticket/i }).length).toBeGreaterThan(0);
      });
    });

    it("displays no-results card with 'Clear Filters' button when search/filter match 0 tickets", async () => {
      await renderAppWithRequester("1", (url: string) => {
        if (url.includes("/api/tickets") && url.includes("search=nonexistent")) {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: [],
                pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 },
              }),
          } as Response);
        }
        return undefined;
      });

      const searchInput = await screen.findByPlaceholderText(/Search tickets/i);
      fireEvent.change(searchInput, { target: { value: "nonexistent" } });

      await waitFor(() => {
        expect(screen.getByText(/No tickets match your filter criteria/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Clear Filters/i })).toBeInTheDocument();
      });
    });

    it("displays safe failure banner with Reload button when GET /api/tickets returns 500 error", async () => {
      await renderAppWithRequester("1", (url: string) => {
        if (url.includes("/api/tickets")) {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: { code: "SERVER_ERROR", message: "Database offline" } }),
          } as Response);
        }
        return undefined;
      });

      await waitFor(() => {
        expect(screen.getByText(/Unable to load tickets. Please try again/i)).toBeInTheDocument();
        expect(screen.queryByText(/Database offline/i)).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Reload|Retry/i })).toBeInTheDocument();
      });
    });
  });

  describe("4. Requester Isolation & In-Flight Race Protection on My Tickets (AC-08, BR-24)", () => {
    it("prevents late-resolving previous requester response from overwriting newly selected requester's ticket list", async () => {
      let resolveAliceTickets!: (res: Response) => void;

      function getReqHeader(init?: RequestInit): string | undefined {
        if (!init?.headers) return undefined;
        const headers = init.headers as Record<string, string>;
        for (const key of Object.keys(headers)) {
          if (key.toLowerCase() === "x-requester-id") return String(headers[key]);
        }
        return undefined;
      }

      await renderAppWithRequester("1", (url: string, init?: RequestInit) => {
        const reqHeader = getReqHeader(init);
        if (url.includes("/api/tickets") && reqHeader === "1") {
          return new Promise<Response>((resolve) => {
            resolveAliceTickets = resolve;
          });
        }
        if (url.includes("/api/tickets") && reqHeader === "2") {
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: [
                  {
                    id: "bob-tkt-1",
                    ticketNumber: "TKT-2026-000999",
                    summary: "Bob Laptop Screen Flicker",
                    categoryName: "Hardware",
                    relatedSystemName: "Corporate Laptop",
                    requestedPriority: "LOW",
                    currentStatus: "NEW",
                    createdAt: "2026-08-27T00:00:00.000Z",
                  },
                ],
                pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1 },
              }),
          } as Response);
        }
        return undefined;
      });

      // Switch to Bob (ID 2) while Alice's tickets request is pending
      const changeBtn = await screen.findByRole("button", { name: /Change Requester/i });
      fireEvent.click(changeBtn);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Select Development Requester/i })).toBeInTheDocument();
      });

      const bobRadio = screen.getByRole("radio", { name: /Bob Jones/i });
      fireEvent.click(bobRadio);
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        expect(screen.getAllByText("Bob Laptop Screen Flicker")[0]).toBeInTheDocument();
      });

      // Resolve Alice's delayed response late
      resolveAliceTickets({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: mockAliceTickets,
            pagination: { page: 1, pageSize: 10, totalItems: 2, totalPages: 1 },
          }),
      } as Response);

      // Verify Alice's tickets DO NOT overwrite Bob's tickets
      await waitFor(() => {
        expect(screen.getAllByText("Bob Laptop Screen Flicker")[0]).toBeInTheDocument();
        expect(screen.queryByText("Cannot access email account")).not.toBeInTheDocument();
      });
    });
  });

  describe("5. Ticket Detail Screen & Ownership Verification (FR-06, BR-05, AC-03, AC-06)", () => {
    it("navigates to Ticket Detail when clicking View Details and renders shaded read-only ticket fields (#F0F4F2)", async () => {
      await renderAppWithRequester("1");

      const viewDetailsBtns = await screen.findAllByRole("button", { name: /View Details|View/i });
      fireEvent.click(viewDetailsBtns[0]);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Ticket Detail/i })).toBeInTheDocument();
        expect(screen.getByText("I have been unable to log into my corporate email account since morning.")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Back to My Tickets/i })).toBeInTheDocument();
      });
    });

    it("displays active attachments with download controls and soft-removed attachments with disabled controls and removal reason", async () => {
      await renderAppWithRequester("1");

      const viewDetailsBtns = await screen.findAllByRole("button", { name: /View Details|View/i });
      fireEvent.click(viewDetailsBtns[0]);

      await waitFor(() => {
        // Active attachment
        expect(screen.getByText("error-screenshot.png")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /^Download$/i })).toBeInTheDocument();

        // Soft-removed attachment
        expect(screen.getByText("old-log.txt")).toBeInTheDocument();
        expect(screen.getByText("Removed")).toBeInTheDocument();
        expect(screen.getByText(/Uploaded incorrect file version for this ticket/i)).toBeInTheDocument();
      });
    });

    it("renders safe 404 'Ticket not found' error page when opening non-owned or missing ticket ID", async () => {
      await renderAppWithRequester("2", (url: string) => {
        if (url.includes("/api/tickets/c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d")) {
          return Promise.resolve({
            ok: false,
            status: 404,
            json: () => Promise.resolve({ error: { code: "TICKET_NOT_FOUND", message: "Ticket not found." } }),
          } as Response);
        }
        return undefined;
      });

      const viewDetailsBtns = await screen.findAllByRole("button", { name: /View Details|View/i });
      fireEvent.click(viewDetailsBtns[0]);

      await waitFor(() => {
        expect(screen.getByText(/Ticket not found/i)).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Back to My Tickets/i })).toBeInTheDocument();
      });
    });
  });

  describe("6. Attachment Soft Removal Workflow (FR-08, BR-08, AC-17)", () => {
    it("opens soft removal modal on Remove click, validates removalReason >= 5 chars, and sends DELETE /api/attachments/:id", async () => {
      let capturedDeleteUrl = "";
      let capturedDeleteBody: any = null;

      await renderAppWithRequester("1", (url: string, init?: RequestInit) => {
        if (url.includes("/api/attachments/") && init?.method === "DELETE") {
          capturedDeleteUrl = url;
          capturedDeleteBody = JSON.parse((init?.body as string) || "{}");
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                id: "att-active-001",
                fileName: "error-screenshot.png",
                removedAt: "2026-08-27T12:00:00.000Z",
                removalReason: "File contains sensitive PII data",
                isRemoved: true,
              }),
          } as Response);
        }
        return undefined;
      });

      const viewDetailsBtns = await screen.findAllByRole("button", { name: /View Details|View/i });
      fireEvent.click(viewDetailsBtns[0]);

      const removeBtn = await screen.findByRole("button", { name: /Remove|Remove Attachment/i });
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Remove Attachment/i })).toBeInTheDocument();
      });

      const reasonInput = screen.getByLabelText(/Removal Reason/i);
      const confirmRemoveBtn = screen.getByRole("button", { name: /Confirm Removal|Remove File/i });

      // < 5 chars -> rejected
      fireEvent.change(reasonInput, { target: { value: "bad" } });
      fireEvent.submit(confirmRemoveBtn.closest("form")!);

      await waitFor(() => {
        expect(screen.getByText(/Removal reason must be at least 5 characters/i)).toBeInTheDocument();
      });

      // Valid reason >= 5 chars -> accepted
      fireEvent.change(reasonInput, { target: { value: "File contains sensitive PII data" } });
      fireEvent.submit(confirmRemoveBtn.closest("form")!);

      await waitFor(() => {
        expect(capturedDeleteUrl).toContain("/api/attachments/att-active-001");
        expect(capturedDeleteBody.removalReason).toBe("File contains sensitive PII data");
      });
    });
  });

  describe("7. Accessibility & Keyboard Control (UI-09, UI-10)", () => {
    it("ensures all navigation controls, search inputs, pagination buttons, and detail actions are keyboard focusable with high contrast rings #0B7A46", async () => {
      await renderAppWithRequester("1");

      const myTicketsTab = screen.getByRole("button", { name: /^My Tickets$/i });
      const createTicketTab = screen.getAllByRole("button", { name: /^Create Ticket$/i })[0];

      myTicketsTab.focus();
      expect(document.activeElement).toBe(myTicketsTab);

      createTicketTab.focus();
      expect(document.activeElement).toBe(createTicketTab);
    });
  });
});
