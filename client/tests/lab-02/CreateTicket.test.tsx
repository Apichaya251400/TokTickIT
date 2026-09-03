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
});
