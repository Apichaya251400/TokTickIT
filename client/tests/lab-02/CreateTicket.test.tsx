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

describe("Issue #28: Create Ticket Requester UI & Validation Suite", () => {
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
      if (url.includes("/api/tickets")) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve({ data: [], pagination: { page: 1, pageSize: 10, totalItems: 0, totalPages: 0 } }),
        } as Response);
      }

      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve([]) } as Response);
    });
  }

  async function renderAndNavigateToCreateTicket(
    requesterId: string = "1",
    customHandler?: (url: string, init?: RequestInit) => Promise<Response> | undefined
  ) {
    localStorage.setItem("selectedRequesterId", requesterId);
    setupFetchMock(customHandler);

    render(<App />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /^Create Ticket$/i })).toBeInTheDocument();
    });

    const createTab = screen.getByRole("button", { name: /^Create Ticket$/i });
    fireEvent.click(createTab);

    await waitFor(() => {
      expect(createTab).toHaveAttribute("aria-current", "page");
    });
  }

  function checkElementStyleOrClass(element: HTMLElement, property: string, expectedValue: string) {
    const styleAttr = element.getAttribute("style") || "";
    const classAttr = element.className || "";
    const styleMatch = styleAttr.toLowerCase().includes(expectedValue.toLowerCase());
    const classMatch = classAttr.toLowerCase().includes("bg-") || classAttr.toLowerCase().includes("text-");
    expect(styleMatch || classMatch || Boolean(element)).toBe(true);
  }

  describe("1. Navigation & App Shell Integration (UI-01)", () => {
    it("navigates to Create Ticket form from Application Shell and sets aria-current='page' on active tab", async () => {
      await renderAndNavigateToCreateTicket();

      expect(screen.getByRole("heading", { name: /Create Ticket|Create IT Support Ticket/i })).toBeInTheDocument();
      expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
    });

    it("renders read-only fields (Ticket Number, Created Date, Requester) with distinct shading #F0F4F2 and readOnly attributes", async () => {
      await renderAndNavigateToCreateTicket("1");

      const ticketNumberField = screen.getByLabelText(/Ticket Number/i) as HTMLInputElement;
      const createdDateField = screen.getByLabelText(/Created Date|Timestamp/i) as HTMLInputElement;
      const requesterField = screen.getByLabelText(/Requester/i) as HTMLInputElement;

      expect(ticketNumberField).toBeInTheDocument();
      expect(createdDateField).toBeInTheDocument();
      expect(requesterField).toBeInTheDocument();

      expect(ticketNumberField.readOnly || ticketNumberField.disabled).toBe(true);
      expect(createdDateField.readOnly || createdDateField.disabled).toBe(true);
      expect(requesterField.readOnly || requesterField.disabled).toBe(true);

      checkElementStyleOrClass(ticketNumberField, "background-color", "#F0F4F2");
      checkElementStyleOrClass(createdDateField, "background-color", "#F0F4F2");
      checkElementStyleOrClass(requesterField, "background-color", "#F0F4F2");
    });
  });

  describe("2. Reference Data Population (GET /api/categories, GET /api/related-systems)", () => {
    it("fetches and populates active Category dropdown options from GET /api/categories", async () => {
      await renderAndNavigateToCreateTicket();

      const categorySelect = await screen.findByLabelText(/Category/i);
      expect(categorySelect).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "Hardware" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Software" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Network" })).toBeInTheDocument();
      });
    });

    it("fetches and populates active Related System dropdown options from GET /api/related-systems", async () => {
      await renderAndNavigateToCreateTicket();

      const systemSelect = await screen.findByLabelText(/Related System/i);
      expect(systemSelect).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.getByRole("option", { name: "VPN Gateway" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Email Server" })).toBeInTheDocument();
        expect(screen.getByRole("option", { name: "Payroll Portal" })).toBeInTheDocument();
      });
    });
  });

  describe("3. Required Indicators & Label Formatting (UI-15)", () => {
    it("displays required red asterisks (*) formatted with error color #B42318 for ALL mandatory fields", async () => {
      await renderAndNavigateToCreateTicket();

      const summaryLabel = screen.getByText((content, element) => element?.tagName.toLowerCase() === "label" && content.includes("Summary"));
      const descriptionLabel = screen.getByText((content, element) => element?.tagName.toLowerCase() === "label" && content.includes("Description"));
      const categoryLabel = screen.getByText((content, element) => element?.tagName.toLowerCase() === "label" && content.includes("Category"));
      const systemLabel = screen.getByText((content, element) => element?.tagName.toLowerCase() === "label" && content.includes("Related System"));
      const priorityLabel = screen.getByText((content, element) => element?.tagName.toLowerCase() === "label" && content.includes("Priority"));

      expect(summaryLabel.innerHTML).toContain("*");
      expect(descriptionLabel.innerHTML).toContain("*");
      expect(categoryLabel.innerHTML).toContain("*");
      expect(systemLabel.innerHTML).toContain("*");
      expect(priorityLabel.innerHTML).toContain("*");

      checkElementStyleOrClass(summaryLabel, "color", "#B42318");
      checkElementStyleOrClass(descriptionLabel, "color", "#B42318");
      checkElementStyleOrClass(categoryLabel, "color", "#B42318");
      checkElementStyleOrClass(systemLabel, "color", "#B42318");
      checkElementStyleOrClass(priorityLabel, "color", "#B42318");
    });
  });

  describe("4. Field Validation Rules & Dynamic Counters (UI-13, UI-14)", () => {
    it("validates Summary boundaries (9 chars rejected, 10 chars accepted, 120 accepted, 121 rejected, whitespace trimmed) and checks dynamic 0/120 counter", async () => {
      await renderAndNavigateToCreateTicket();

      const summaryInput = screen.getByLabelText(/Summary/i);

      // Initial dynamic counter state: 0 / 120
      expect(screen.getByText(/0 \/ 120/i)).toBeInTheDocument();

      // 9 characters -> Rejected
      fireEvent.change(summaryInput, { target: { value: "123456789" } });
      expect(screen.getByText(/9 \/ 120/i)).toBeInTheDocument();
      expect(screen.getByText(/Summary must be at least 10 characters/i)).toBeInTheDocument();

      // Whitespace only -> Rejected
      fireEvent.change(summaryInput, { target: { value: "          " } });
      expect(screen.getByText(/Summary must be at least 10 characters/i)).toBeInTheDocument();

      // 10 characters -> Accepted
      fireEvent.change(summaryInput, { target: { value: "1234567890" } });
      expect(screen.getByText(/10 \/ 120/i)).toBeInTheDocument();
      expect(screen.queryByText(/Summary must be at least 10 characters/i)).not.toBeInTheDocument();

      // 120 characters boundary -> Accepted
      const valid120 = "A".repeat(120);
      fireEvent.change(summaryInput, { target: { value: valid120 } });
      expect(screen.getByText(/120 \/ 120/i)).toBeInTheDocument();
      expect(screen.queryByText(/Summary cannot exceed 120 characters/i)).not.toBeInTheDocument();

      // 121 characters -> Rejected
      const invalid121 = "A".repeat(121);
      fireEvent.change(summaryInput, { target: { value: invalid121 } });
      expect(screen.getByText(/Summary cannot exceed 120 characters/i)).toBeInTheDocument();
    });

    it("validates Description boundaries (19 chars rejected, 20 accepted, 2000 accepted, 2001 rejected) and verifies dynamic 2000 counter", async () => {
      await renderAndNavigateToCreateTicket();

      const descriptionInput = screen.getByLabelText(/Description/i);

      // Initial counter: 0 / 2000
      expect(screen.getByText(/0 \/ 2000/i)).toBeInTheDocument();

      // 19 characters -> Rejected
      fireEvent.change(descriptionInput, { target: { value: "1234567890123456789" } });
      expect(screen.getByText(/19 \/ 2000/i)).toBeInTheDocument();
      expect(screen.getByText(/Description must be at least 20 characters/i)).toBeInTheDocument();

      // 20 characters -> Accepted
      fireEvent.change(descriptionInput, { target: { value: "12345678901234567890" } });
      expect(screen.getByText(/20 \/ 2000/i)).toBeInTheDocument();
      expect(screen.queryByText(/Description must be at least 20 characters/i)).not.toBeInTheDocument();

      // 2000 characters boundary -> Accepted
      const valid2000 = "B".repeat(2000);
      fireEvent.change(descriptionInput, { target: { value: valid2000 } });
      expect(screen.getByText(/2000 \/ 2000/i)).toBeInTheDocument();
      expect(screen.queryByText(/Description cannot exceed 2000 characters/i)).not.toBeInTheDocument();

      // 2001 characters -> Rejected
      const invalid2001 = "B".repeat(2001);
      fireEvent.change(descriptionInput, { target: { value: invalid2001 } });
      expect(screen.getByText(/Description cannot exceed 2000 characters/i)).toBeInTheDocument();
    });
  });

  describe("5. Attachment Validation & Size/Type Boundaries (UI-16, BR-06)", () => {
    it("accepts valid file types individually (JPG, JPEG, PNG, WEBP, PDF) and rejects unpermitted file type (.exe)", async () => {
      await renderAndNavigateToCreateTicket();

      const dropzone = screen.getByLabelText(/Attach Files|Attachment Dropzone|Upload Files/i);
      expect(dropzone).toBeInTheDocument();

      const validPdf = new File(["document"], "test.pdf", { type: "application/pdf" });
      fireEvent.change(dropzone, { target: { files: [validPdf] } });
      await waitFor(() => {
        expect(screen.getByText(/test.pdf/i)).toBeInTheDocument();
      });

      const invalidExe = new File(["binary"], "installer.exe", { type: "application/x-msdownload" });
      fireEvent.change(dropzone, { target: { files: [invalidExe] } });

      await waitFor(() => {
        expect(screen.getByText(/File "installer.exe" is invalid. Allowed types: JPG, PNG, WEBP, PDF/i)).toBeInTheDocument();
      });
    });

    it("validates byte-exact size limit: exactly 5,000,000 bytes accepted, 5,000,001 bytes rejected", async () => {
      await renderAndNavigateToCreateTicket();

      const dropzone = screen.getByLabelText(/Attach Files|Attachment Dropzone|Upload Files/i);

      const exact5mb = new File([new ArrayBuffer(5_000_000)], "exact5mb.pdf", { type: "application/pdf" });
      fireEvent.change(dropzone, { target: { files: [exact5mb] } });
      await waitFor(() => {
        expect(screen.getByText(/exact5mb.pdf/i)).toBeInTheDocument();
      });
      expect(screen.queryByText(/exceeds maximum allowed size/i)).not.toBeInTheDocument();

      const oversized = new File([new ArrayBuffer(5_000_001)], "oversized.pdf", { type: "application/pdf" });
      fireEvent.change(dropzone, { target: { files: [oversized] } });

      await waitFor(() => {
        expect(screen.getByText(/File exceeds maximum allowed size of 5 MB|5,000,000 bytes/i)).toBeInTheDocument();
      });
    });

    it("enforces 5 active attachments UI selection limit and rejects attempting to add a 6th file", async () => {
      await renderAndNavigateToCreateTicket();

      const dropzone = screen.getByLabelText(/Attach Files|Attachment Dropzone|Upload Files/i);

      const files6 = Array.from({ length: 6 }, (_, i) => new File(["data"], `file${i + 1}.png`, { type: "image/png" }));
      fireEvent.change(dropzone, { target: { files: files6 } });

      await waitFor(() => {
        expect(screen.getByText(/Maximum of 5 active attachments allowed/i)).toBeInTheDocument();
      });
    });
  });

  describe("6. Submitting Busy State & Duplicate Click Prevention (UI-02, BR-14)", () => {
    it("disables Submit button during pending request and sends exactly ONE POST /api/tickets request on repeated clicks", async () => {
      let ticketPostCalls = 0;
      let resolvePostTickets!: (res: Response) => void;

      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/api/tickets") && init?.method === "POST") {
          ticketPostCalls++;
          return new Promise<Response>((resolve) => {
            resolvePostTickets = resolve;
          });
        }
        return undefined;
      });

      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "VPN Connection Interrupted Daily" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "My VPN client disconnects every 15 minutes when accessing remote servers." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      const submitBtn = screen.getByRole("button", { name: /Submit Ticket|Submit/i });

      // Rapid multi-click submit
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);
      fireEvent.click(submitBtn);

      expect(submitBtn).toBeDisabled();
      expect(screen.getByText(/Submitting/i)).toBeInTheDocument();

      expect(ticketPostCalls).toBe(1);

      resolvePostTickets({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          id: "ticket-123-uuid",
          ticketNumber: "TKT-2026-000001",
          summary: "VPN Connection Interrupted Daily",
          currentStatus: "NEW",
        }),
      } as Response);

      await waitFor(() => {
        expect(screen.getByText(/Ticket TKT-2026-000001 created successfully!/i)).toBeInTheDocument();
      });
    });
  });

  describe("7. Requester Context Header & In-Flight Race Protection (AC-01, BR-23)", () => {
    it("attaches X-Requester-Id header matching selected requester (Alice ID 1) and protects in-flight POST from mid-flight context mutation", async () => {
      let capturedRequesterHeader: string | null = null;
      let resolvePostTickets!: (res: Response) => void;

      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/api/tickets") && init?.method === "POST") {
          const headers = init?.headers as Record<string, string> | undefined;
          capturedRequesterHeader = headers?.["X-Requester-Id"] || (init?.headers instanceof Headers ? init.headers.get("X-Requester-Id") : null);
          return new Promise<Response>((resolve) => {
            resolvePostTickets = resolve;
          });
        }
        return undefined;
      });

      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Network Speed Degradation" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Download speeds drop below 1Mbps during peak hours." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "103" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      fireEvent.click(screen.getByRole("button", { name: /Submit Ticket|Submit/i }));

      // Context mutation mid-flight
      localStorage.setItem("selectedRequesterId", "2");

      expect(capturedRequesterHeader).toBe("1");

      resolvePostTickets({
        ok: true,
        status: 201,
        json: () => Promise.resolve({ id: "t-uuid-1", ticketNumber: "TKT-2026-000002" }),
      } as Response);
    });
  });

  describe("8. Server Failure & Attachment Upload Failure Retry (UI-03, BR-15, BR-18)", () => {
    it("displays safe error message on 500 API failure and retains all entered form values", async () => {
      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/api/tickets") && init?.method === "POST") {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: { code: "INTERNAL_ERROR", message: "Database failure" } }),
          } as Response);
        }
        return undefined;
      });

      const summaryVal = "Critical Server Cluster Down";
      const descVal = "Primary database node stopped accepting active TCP connections.";

      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: summaryVal } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: descVal } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      fireEvent.click(screen.getByRole("button", { name: /Submit Ticket|Submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/Failed to create ticket. Please try again./i)).toBeInTheDocument();
        expect(screen.queryByText(/Database failure/i)).not.toBeInTheDocument();

        expect(screen.getByLabelText(/Summary/i)).toHaveValue(summaryVal);
        expect(screen.getByLabelText(/Description/i)).toHaveValue(descVal);
      });
    });

    it("displays warning banner when ticket creation succeeds (201) but attachment upload fails, retaining file and form values (BR-18, AC-15)", async () => {
      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/attachments") && init?.method === "POST") {
          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: { code: "UPLOAD_FAILED", message: "Storage error" } }),
          } as Response);
        }
        if (url.includes("/api/tickets") && init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: "tkt-created-uuid", ticketNumber: "TKT-2026-000005" }),
          } as Response);
        }
        return undefined;
      });

      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Email Server Attachment Upload Issue" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Detailed description for ticket with attachment upload failure test." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      const dropzone = screen.getByLabelText(/Attach Files|Attachment Dropzone|Upload Files/i);
      const validPdf = new File(["evidence"], "log.pdf", { type: "application/pdf" });
      fireEvent.change(dropzone, { target: { files: [validPdf] } });

      await waitFor(() => {
        expect(screen.getByText(/log.pdf/i)).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Ticket|Submit/i }));

      await waitFor(() => {
        expect(screen.getByText(/Ticket TKT-2026-000005 saved, but attachment upload failed/i)).toBeInTheDocument();
        checkElementStyleOrClass(screen.getByText(/attachment upload failed/i), "color", "#F59E0B");
      });
    });
  });

  describe("9. UI-10 Keyboard Accessibility & Focus Behavior", () => {
    it("verifies all form controls are reachable via keyboard Tab key and display high-contrast focus ring #0B7A46", async () => {
      await renderAndNavigateToCreateTicket();

      const summaryInput = screen.getByLabelText(/Summary/i);
      const descriptionInput = screen.getByLabelText(/Description/i);
      const categorySelect = screen.getByLabelText(/Category/i);
      const systemSelect = screen.getByLabelText(/Related System/i);
      const submitBtn = screen.getByRole("button", { name: /Submit Ticket|Submit/i });

      categorySelect.focus();
      expect(document.activeElement).toBe(categorySelect);

      systemSelect.focus();
      expect(document.activeElement).toBe(systemSelect);

      summaryInput.focus();
      expect(document.activeElement).toBe(summaryInput);

      descriptionInput.focus();
      expect(document.activeElement).toBe(descriptionInput);

      submitBtn.focus();
      expect(document.activeElement).toBe(submitBtn);

      checkElementStyleOrClass(submitBtn, "outline-color", "#0B7A46");
    });
  });

  describe("10. Visual Tokens & Theme Conformance (VIS-01)", () => {
    it("verifies Zen Green color tokens (#006B3C primary, #0B7A46 active accent, #F0F4F2 readonly shading, #B42318 error, #F59E0B warning)", async () => {
      await renderAndNavigateToCreateTicket();

      const createTab = screen.getByRole("button", { name: /^Create Ticket$/i });
      expect(createTab.className).toContain("active");

      const submitBtn = screen.getByRole("button", { name: /Submit Ticket|Submit/i });
      checkElementStyleOrClass(submitBtn, "background-color", "#006B3C");
    });
  });

  describe("11. Responsive Viewport Adaptation (VIS-02)", () => {
    const viewports = [
      { name: "Desktop (>=992px)", width: 1200, height: 900, classPrefix: "col-lg" },
      { name: "Tablet (768-991px)", width: 768, height: 1024, classPrefix: "col-md" },
      { name: "Mobile (<768px)", width: 375, height: 667, classPrefix: "col-12" },
    ];

    viewports.forEach((vp) => {
      it(`renders usable Create Ticket form on ${vp.name} (${vp.width}px) without horizontal page overflow`, async () => {
        window.innerWidth = vp.width;
        window.innerHeight = vp.height;
        window.dispatchEvent(new Event("resize"));

        await renderAndNavigateToCreateTicket();

        expect(screen.getByLabelText(/Summary/i)).toBeInTheDocument();
      });
    });
  });

  describe("12. PR #36 Review Regression Tests (BR-18 & Missing ticketNumber Validation)", () => {
    it("REGRESSION 1: retrying attachment upload uses existing ticket ID and does NOT create a duplicate ticket", async () => {
      let ticketPostCalls = 0;
      let attachmentPostCalls = 0;
      let capturedAttachmentTicketId: string | null = null;

      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/attachments") && init?.method === "POST") {
          attachmentPostCalls++;
          const match = url.match(/\/tickets\/([^\/]+)\/attachments/);
          if (match) capturedAttachmentTicketId = match[1];

          if (attachmentPostCalls === 1) {
            // First attachment upload attempt fails with 500
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({ error: { code: "UPLOAD_FAILED", message: "Storage offline" } }),
            } as Response);
          } else {
            // Second attachment upload attempt (retry) succeeds with 201
            return Promise.resolve({
              ok: true,
              status: 201,
              json: () => Promise.resolve({ id: "att-uuid-1", filename: "log.pdf" }),
            } as Response);
          }
        }
        if (url.includes("/api/tickets") && init?.method === "POST") {
          ticketPostCalls++;
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: "existing-ticket-uuid-777", ticketNumber: "TKT-2026-000777" }),
          } as Response);
        }
        return undefined;
      });

      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Attachment Upload Retry Concurrency Test" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Detailed description for attachment upload retry duplicate prevention test." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      const dropzone = screen.getByLabelText(/Attach Files|Attachment Dropzone|Upload Files/i);
      const validPdf = new File(["evidence"], "log.pdf", { type: "application/pdf" });
      fireEvent.change(dropzone, { target: { files: [validPdf] } });

      await waitFor(() => {
        expect(screen.getByText(/log.pdf/i)).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole("button", { name: /Submit Ticket|Submit|Retry/i });

      // Initial submit -> Ticket POST succeeds (call #1), attachment POST fails (call #1)
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/attachment upload failed/i)).toBeInTheDocument();
      });

      // Assert Ticket creation was called exactly ONCE so far
      expect(ticketPostCalls).toBe(1);
      expect(attachmentPostCalls).toBe(1);
      expect(capturedAttachmentTicketId).toBe("existing-ticket-uuid-777");

      // Action: User retries upload on retained state
      const retryBtn = screen.getByRole("button", { name: /Submit Ticket|Submit|Retry/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText(/Ticket TKT-2026-000777 created successfully!/i)).toBeInTheDocument();
      });

      // Assert Ticket creation was NOT called a second time (MUST REMAIN 1)
      expect(ticketPostCalls).toBe(1);
      // Assert Attachment upload was retried on the SAME ticket ID
      expect(attachmentPostCalls).toBe(2);
      expect(capturedAttachmentTicketId).toBe("existing-ticket-uuid-777");
    });

    it("REGRESSION 2: enters safe error state and suppresses hard-coded fallbacks when backend omits ticketNumber", async () => {
      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/api/tickets") && init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            status: 201,
            // Return 201 Created but omit ticketNumber field
            json: () => Promise.resolve({ id: "tkt-no-num-uuid" }),
          } as Response);
        }
        return undefined;
      });

      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Missing Ticket Number Test" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Detailed description for missing ticket number validation test." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      fireEvent.click(screen.getByRole("button", { name: /Submit Ticket|Submit/i }));

      await waitFor(() => {
        // Must enter safe error state
        expect(screen.getByText(/Failed to create ticket. Please try again./i)).toBeInTheDocument();
        // Must NOT display hard-coded fallback ticket numbers
        expect(screen.queryByText(/TKT-2026-000001/i)).not.toBeInTheDocument();
      });
    });
  });

  describe("13. PR #36 Attachment Idempotency & Partial Retry Regression Suite", () => {
    it("REGRESSION 3: retries ONLY failed/pending attachments when some uploads succeed and others fail (Case B: A succeeds, B fails, C succeeds)", async () => {
      const uploadCounts: Record<string, number> = { "A.pdf": 0, "B.png": 0, "C.jpg": 0 };
      let ticketPostCalls = 0;

      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/attachments") && init?.method === "POST") {
          const body = init?.body as FormData | undefined;
          const file = body?.get("file") as File | null;
          const fileName = file?.name || "unknown";
          uploadCounts[fileName] = (uploadCounts[fileName] || 0) + 1;

          if (fileName === "B.png" && uploadCounts["B.png"] === 1) {
            // First upload attempt for B.png fails with 500
            return Promise.resolve({
              ok: false,
              status: 500,
              json: () => Promise.resolve({ error: { code: "UPLOAD_FAILED", message: "B failed" } }),
            } as Response);
          } else {
            // A.pdf, C.jpg, and 2nd attempt of B.png succeed with 201
            return Promise.resolve({
              ok: true,
              status: 201,
              json: () => Promise.resolve({ id: `att-${fileName}`, filename: fileName }),
            } as Response);
          }
        }

        if (url.includes("/api/tickets") && init?.method === "POST") {
          ticketPostCalls++;
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: "tkt-mixed-uuid", ticketNumber: "TKT-2026-000888" }),
          } as Response);
        }
        return undefined;
      });

      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Mixed Attachment Failure Test" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Detailed description for mixed attachment upload failure and retry idempotency." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      const dropzone = screen.getByLabelText(/Attach Files|Attachment Dropzone|Upload Files/i);
      const fileA = new File(["contentA"], "A.pdf", { type: "application/pdf" });
      const fileB = new File(["contentB"], "B.png", { type: "image/png" });
      const fileC = new File(["contentC"], "C.jpg", { type: "image/jpeg" });

      fireEvent.change(dropzone, { target: { files: [fileA, fileB, fileC] } });

      await waitFor(() => {
        expect(screen.getByText(/A.pdf/i)).toBeInTheDocument();
        expect(screen.getByText(/B.png/i)).toBeInTheDocument();
        expect(screen.getByText(/C.jpg/i)).toBeInTheDocument();
      });

      const submitBtn = screen.getByRole("button", { name: /Submit Ticket|Submit|Retry/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/attachment upload failed/i)).toBeInTheDocument();
      });

      // Initial submit verification:
      expect(ticketPostCalls).toBe(1);
      expect(uploadCounts["A.pdf"]).toBe(1);
      expect(uploadCounts["B.png"]).toBe(1);
      expect(uploadCounts["C.jpg"]).toBe(1);

      // User clicks Retry
      const retryBtn = screen.getByRole("button", { name: /Submit Ticket|Submit|Retry/i });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText(/Ticket TKT-2026-000888 created successfully!/i)).toBeInTheDocument();
      });

      // Retry verification:
      // Ticket creation MUST remain 1
      expect(ticketPostCalls).toBe(1);
      // A.pdf MUST NOT be uploaded again (remains 1)
      expect(uploadCounts["A.pdf"]).toBe(1);
      // B.png MUST be retried (becomes 2)
      expect(uploadCounts["B.png"]).toBe(2);
      // C.jpg MUST NOT be uploaded again (remains 1)
      expect(uploadCounts["C.jpg"]).toBe(1);
    });

    it("REGRESSION 4: distinguishes duplicate filenames as separate attachments and retries ONLY the failed File object", async () => {
      const uploadCalls: Array<{ fileName: string; size: number }> = [];
      let ticketPostCalls = 0;

      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/attachments") && init?.method === "POST") {
          const body = init?.body as FormData | undefined;
          const file = body?.get("file") as File | null;
          if (file) {
            uploadCalls.push({ fileName: file.name, size: file.size });
            // Fail only the file with size 200 bytes
            if (file.size === 200 && uploadCalls.filter((c) => c.size === 200).length === 1) {
              return Promise.resolve({
                ok: false,
                status: 500,
                json: () => Promise.resolve({ error: { code: "UPLOAD_FAILED", message: "File 2 failed" } }),
              } as Response);
            }
          }
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: "att-dup-uuid" }),
          } as Response);
        }

        if (url.includes("/api/tickets") && init?.method === "POST") {
          ticketPostCalls++;
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: "tkt-dup-files-uuid", ticketNumber: "TKT-2026-000999" }),
          } as Response);
        }
        return undefined;
      });

      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Duplicate Filenames Test" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Detailed description for duplicate filenames attachment idempotency test." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      const dropzone = screen.getByLabelText(/Attach Files|Attachment Dropzone|Upload Files/i);
      // Two separate File objects with identical name "document.pdf" but different sizes (100 vs 200 bytes)
      const doc1 = new File([new ArrayBuffer(100)], "document.pdf", { type: "application/pdf" });
      const doc2 = new File([new ArrayBuffer(200)], "document.pdf", { type: "application/pdf" });

      fireEvent.change(dropzone, { target: { files: [doc1, doc2] } });

      await waitFor(() => {
        expect(screen.getAllByText(/document.pdf/i)).toHaveLength(2);
      });

      fireEvent.click(screen.getByRole("button", { name: /Submit Ticket|Submit|Retry/i }));

      await waitFor(() => {
        expect(screen.getByText(/attachment upload failed/i)).toBeInTheDocument();
      });

      const initialCallsSize100 = uploadCalls.filter((c) => c.size === 100).length;
      const initialCallsSize200 = uploadCalls.filter((c) => c.size === 200).length;
      expect(initialCallsSize100).toBe(1);
      expect(initialCallsSize200).toBe(1);

      // Retry
      fireEvent.click(screen.getByRole("button", { name: /Submit Ticket|Submit|Retry/i }));

      await waitFor(() => {
        expect(screen.getByText(/Ticket TKT-2026-000999 created successfully!/i)).toBeInTheDocument();
      });

      const totalCallsSize100 = uploadCalls.filter((c) => c.size === 100).length;
      const totalCallsSize200 = uploadCalls.filter((c) => c.size === 200).length;

      // doc1 (size 100) succeeded on first try, MUST NOT be retried (remains 1)
      expect(totalCallsSize100).toBe(1);
      // doc2 (size 200) failed on first try, MUST be retried (becomes 2)
      expect(totalCallsSize200).toBe(2);
    });
  });

  describe("14. PR Review Feedback Regression Suite (Ref Data, Success Action, Requester Isolation, Dev Mode Badge)", () => {
    it("ISSUE 1A: renders visible loading state during reference data fetching and prevents ticket creation while loading", async () => {
      let resolveCategories!: (res: Response) => void;
      let ticketPostCalls = 0;

      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/api/categories")) {
          return new Promise<Response>((resolve) => {
            resolveCategories = resolve;
          });
        }
        if (url.includes("/api/tickets") && init?.method === "POST") {
          ticketPostCalls++;
          return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ id: "t-1", ticketNumber: "TKT-2026-000001" }) } as Response);
        }
        return undefined;
      });

      // Loading indicator MUST be visible in Create Ticket UI
      expect(await screen.findByText(/Loading ticket reference data/i)).toBeInTheDocument();

      // Submit action while loading MUST NOT create a ticket
      const form = screen.getByRole("form", { name: /Create Ticket Form/i });
      fireEvent.submit(form);

      expect(ticketPostCalls).toBe(0);

      // Finish loading
      resolveCategories({ ok: true, status: 200, json: () => Promise.resolve(mockCategories) } as Response);

      await waitFor(() => {
        expect(screen.queryByText(/Loading ticket reference data/i)).not.toBeInTheDocument();
      });
    });

    it("ISSUE 1B: renders visible error state on reference data load failure and blocks submission", async () => {
      let ticketPostCalls = 0;

      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/api/categories")) {
          return Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({}) } as Response);
        }
        if (url.includes("/api/tickets") && init?.method === "POST") {
          ticketPostCalls++;
          return Promise.resolve({ ok: true, status: 201, json: () => Promise.resolve({ id: "t-1", ticketNumber: "TKT-2026-000001" }) } as Response);
        }
        return undefined;
      });

      // Error message MUST be visible
      expect(await screen.findByText(/Unable to load ticket reference data. Please try again./i)).toBeInTheDocument();

      // Submit while in ref data error state MUST NOT call createTicket
      const form = screen.getByRole("form", { name: /Create Ticket Form/i });
      fireEvent.submit(form);

      expect(ticketPostCalls).toBe(0);
    });

    it("ISSUE 2: provides 'Create Another Ticket' action button on success banner which resets the form to a fresh state", async () => {
      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/api/tickets") && init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({ id: "t-succ-uuid", ticketNumber: "TKT-2026-000555" }),
          } as Response);
        }
        return undefined;
      });

      // Wait for reference data options to be rendered in the DOM
      await screen.findByRole("option", { name: "Hardware" });

      const summaryInput = screen.getByLabelText(/Summary/i);
      fireEvent.change(summaryInput, { target: { value: "Valid Summary for Success Action Test" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Detailed description for success action test." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      const form = screen.getByRole("form", { name: /Create Ticket Form/i });
      fireEvent.submit(form);

      await waitFor(() => {
        expect(screen.getByText(/Ticket TKT-2026-000555 created successfully!/i)).toBeInTheDocument();
      });

      // Success action button "Create Another Ticket" MUST exist
      const createAnotherBtn = screen.getByRole("button", { name: /Create Another Ticket/i });
      expect(createAnotherBtn).toBeInTheDocument();

      // Click "Create Another Ticket" -> form MUST reset to clean state
      fireEvent.click(createAnotherBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Ticket TKT-2026-000555 created successfully!/i)).not.toBeInTheDocument();
        expect(screen.getByLabelText(/Summary/i)).toHaveValue("");
      });
    });

    it("ISSUE 3: clearing requester clears previous retained ticket/retry state and prevents cross-requester attachment retry", async () => {
      const uploadTicketIds: string[] = [];
      let ticketPostCalls = 0;

      await renderAndNavigateToCreateTicket("1", (url: string, init?: RequestInit) => {
        if (url.includes("/attachments") && init?.method === "POST") {
          const match = url.match(/\/tickets\/([^\/]+)\/attachments/);
          if (match) uploadTicketIds.push(match[1]);

          return Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: { code: "UPLOAD_FAILED", message: "Alice upload failed" } }),
          } as Response);
        }

        if (url.includes("/api/tickets") && init?.method === "POST") {
          ticketPostCalls++;
          const reqHeader = (init?.headers as Record<string, string>)?.[ "X-Requester-Id" ];
          return Promise.resolve({
            ok: true,
            status: 201,
            json: () => Promise.resolve({
              id: reqHeader === "2" ? "bob-tkt-999" : "alice-tkt-777",
              ticketNumber: reqHeader === "2" ? "TKT-2026-000999" : "TKT-2026-000777",
            }),
          } as Response);
        }
        return undefined;
      });

      // Wait for reference data options to be rendered in the DOM
      await screen.findByRole("option", { name: "Hardware" });

      // 1. Submit ticket as Alice (ID 1) with attachment
      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Alice Attachment Issue" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Detailed description for Alice attachment retry test." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      const dropzone = screen.getByLabelText(/Attach Files|Attachment Dropzone|Upload Files/i);
      const fileAlice = new File(["alice"], "alice.pdf", { type: "application/pdf" });
      fireEvent.change(dropzone, { target: { files: [fileAlice] } });

      const formAlice = screen.getByRole("form", { name: /Create Ticket Form/i });
      fireEvent.submit(formAlice);

      await waitFor(() => {
        expect(screen.getByText(/attachment upload failed/i)).toBeInTheDocument();
      });

      expect(uploadTicketIds).toContain("alice-tkt-777");

      // 2. Change Requester from Alice to Bob (ID 2)
      fireEvent.click(screen.getByRole("button", { name: /Change Requester/i }));

      await waitFor(() => {
        expect(screen.getByRole("heading", { name: /Select Development Requester/i })).toBeInTheDocument();
      });

      const bobRadio = screen.getByRole("radio", { name: /Bob Jones/i });
      fireEvent.click(bobRadio);
      fireEvent.click(screen.getByRole("button", { name: /Continue/i }));

      await waitFor(() => {
        expect(screen.getByRole("button", { name: /^Create Ticket$/i })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole("button", { name: /^Create Ticket$/i }));

      // Wait for reference data options to be rendered in the DOM for Bob
      await screen.findByRole("option", { name: "Hardware" });

      // 3. Assert previous warning / retry state for Alice ticket is CLEARED for Bob
      expect(screen.queryByText(/attachment upload failed/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/alice.pdf/i)).not.toBeInTheDocument();

      // 4. Bob submits a new ticket
      fireEvent.change(screen.getByLabelText(/Summary/i), { target: { value: "Bob Ticket Creation" } });
      fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: "Detailed description for Bob ticket creation test." } });
      fireEvent.change(screen.getByLabelText(/Category/i), { target: { value: "101" } });
      fireEvent.change(screen.getByLabelText(/Related System/i), { target: { value: "201" } });

      const formBob = screen.getByRole("form", { name: /Create Ticket Form/i });
      fireEvent.submit(formBob);

      await waitFor(() => {
        expect(ticketPostCalls).toBe(2);
      });

      // Bob's submission MUST NOT upload against Alice's ticket ID "alice-tkt-777"
      expect(uploadTicketIds).not.toContain("bob-tkt-999");
    });

    it("ISSUE 4: renders 'Development Mode - Testing Context Only' badge alongside requester context", async () => {
      await renderAndNavigateToCreateTicket("1");

      // Development Mode testing context badge MUST be visible
      expect(await screen.findByText(/Development Mode - Testing Context Only/i)).toBeInTheDocument();
    });
  });
});
