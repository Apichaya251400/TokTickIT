import { test, expect } from "@playwright/test";

/**
 * TokTickIT E2E-01: Full Requester Workflow & Acceptance Criteria Test Suite
 *
 * AC-01 (Create Ticket Success)
 * AC-02 (Requester Selection Redirect)
 * AC-03 (Non-Owner Ticket 404 Protection)
 * AC-05 (Soft-Removed Download Prevention)
 * AC-06 (Search & Combined Filtering)
 * AC-08 (Requester Context Switching)
 * AC-17 (Soft Removal Reason Validation)
 * AC-18 (Responsive Viewport Rules)
 */

test.describe("E2E-01: Requester Full Workflow (Lab 2)", () => {
  // Scenario 1: Desktop Viewport (>= 992px)
  test.describe("Desktop Viewport (1280x800)", () => {
    test.use({ viewport: { width: 1280, height: 800 } });

    test("E2E-01 Desktop: Complete Requester Flow — Selection, Creation, Filters, Detail, Soft Removal & Ownership Protection", async ({
      page,
    }) => {
      // 1. Open Application Shell
      await page.goto("http://localhost:5173/");

      // 2. Requester Selection (AC-02)
      await expect(
        page.getByRole("heading", { name: /Select Development Requester/i })
      ).toBeVisible();

      // Select Alice Smith
      const aliceRadio = page.getByRole("radio", { name: /Alice Smith/i });
      const aliceId = await aliceRadio.getAttribute("value");
      await aliceRadio.check();
      await page.getByRole("button", { name: /Continue/i }).click();

      // Verify Application Shell context (AC-08)
      await expect(page.getByText("Alice Smith")).toBeVisible();
      await expect(page.getByText("Development Mode - Testing Context Only")).toBeVisible();
      await expect(page.getByRole("button", { name: /^My Tickets$/i })).toHaveAttribute(
        "aria-current",
        "page"
      );

      // 3. Navigate to Create Ticket
      await page.getByRole("button", { name: /^Create Ticket$/i }).click();
      await expect(
        page.getByRole("heading", { name: /Create IT Support Ticket/i })
      ).toBeVisible();
      await expect(page.getByRole("button", { name: /^Create Ticket$/i })).toHaveAttribute(
        "aria-current",
        "page"
      );

      // Unique test data for E2E run
      const timestamp = Date.now();
      const uniqueSummary = `E2E Desktop VPN Access Disrupted ${timestamp}`;
      const uniqueDescription = `E2E Test Description for ticket created at timestamp ${timestamp}. VPN connection drops repeatedly every 15 minutes.`;
      const fileName = `e2e-screenshot-${timestamp}.png`;

      // 4. Fill Form & Attach File (AC-01)
      await page.getByLabel(/Category/i).selectOption({ label: "Software" });
      await page.getByLabel(/Related System/i).selectOption({ label: "VPN" });
      await page.getByLabel("HIGH").check();
      await page.getByLabel(/Summary/i).fill(uniqueSummary);
      await page.getByLabel(/Description/i).fill(uniqueDescription);

      // Attach file
      await page.getByLabel(/Attach Files/i).setInputFiles({
        name: fileName,
        mimeType: "image/png",
        buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
      });

      await expect(page.getByText(fileName)).toBeVisible();

      // 5. Submit Form & Capture Created Ticket Resource UUID
      const createResponsePromise = page.waitForResponse(
        (res) => res.url().endsWith("/api/tickets") && res.request().method() === "POST" && res.status() === 201
      );
      await page.getByRole("button", { name: /Submit Ticket/i }).click();

      const createResponse = await createResponsePromise;
      const createResponseBody = await createResponse.json();
      const aliceTicketUuid = createResponseBody.id;
      expect(aliceTicketUuid).toBeTruthy();

      // Verify Creation Success Banner
      await expect(page.getByText(/created successfully!/i)).toBeVisible();

      // 6. Navigate to My Tickets & Verify Ticket with Combined Filtering (AC-06)
      await page.getByRole("button", { name: /^My Tickets$/i }).click();

      // Search for created ticket
      const searchInput = page.getByLabel(/Search tickets/i);
      await searchInput.fill(uniqueSummary);

      // Combined Filtering (AC-06): Category + Related System + Priority + Status
      await page.getByLabel(/Filter by Category/i).selectOption({ label: "Software" });
      await page.getByLabel(/Filter by System/i).selectOption({ label: "VPN" });
      await page.getByLabel(/Filter by Priority/i).selectOption({ label: "HIGH" });
      await page.getByLabel(/Filter by Status/i).selectOption({ label: "NEW" });

      await expect(page.getByText(uniqueSummary)).toBeVisible();
      await expect(page.locator("strong", { hasText: "Software" })).toBeVisible();
      await expect(page.locator("strong", { hasText: "VPN" })).toBeVisible();

      // 7. Open Ticket Detail (AC-01)
      await page.getByRole("button", { name: /View Details/i }).first().click();

      await expect(
        page.getByRole("heading", { name: /Ticket Detail/i })
      ).toBeVisible();

      // Verify Read-Only Metadata & Fields (Shaded #F0F4F2)
      await expect(page.getByText(uniqueSummary)).toBeVisible();
      await expect(page.getByText(uniqueDescription)).toBeVisible();
      await expect(page.locator("input[value='Alice Smith']")).toBeVisible();

      // Verify Active Attachment & Exercise Real Download Action (AC-05)
      await expect(page.getByText(fileName)).toBeVisible();
      const downloadBtn = page.getByRole("button", { name: /^Download$/i });
      await expect(downloadBtn).toBeVisible();

      // Trigger actual browser download
      const downloadPromise = page.waitForEvent("download");
      await downloadBtn.click();
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toBe(fileName);

      // 8. Attachment Soft Removal Workflow (AC-17, AC-05)
      const removeBtn = page.getByRole("button", { name: /^Remove$/i });
      await removeBtn.click();

      // Modal open
      await expect(
        page.getByRole("heading", { name: /Remove Attachment/i })
      ).toBeVisible();

      const reasonTextarea = page.getByLabel(/Removal Reason/i);
      const confirmRemoveBtn = page.getByRole("button", { name: /Confirm Removal/i });

      // Invalid reason (< 5 characters) -> Rejected
      await reasonTextarea.fill("bad");
      await confirmRemoveBtn.click();
      await expect(
        page.getByText(/Removal reason must be at least 5 characters/i)
      ).toBeVisible();

      // Valid reason (5–200 characters)
      const validReason = "File contains sensitive corporate PII data";
      await reasonTextarea.fill(validReason);
      await confirmRemoveBtn.click();

      // Verify Removed State in Ticket Detail
      await expect(page.getByText("Removed", { exact: true })).toBeVisible();
      await expect(page.getByText(validReason)).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Download Disabled/i })
      ).toBeDisabled();

      // Back to My Tickets
      await page.getByRole("button", { name: /Back to My Tickets/i }).click();

      // 9. Ownership Protection Check (AC-03, AC-08)
      // Switch Requester to Bob Jones
      await page.getByRole("button", { name: /Change Requester/i }).click();
      const bobRadio = page.getByRole("radio", { name: /Bob Jones/i });
      const bobId = await bobRadio.getAttribute("value");
      await bobRadio.check();
      await page.getByRole("button", { name: /Continue/i }).click();

      // Verify Bob cannot see Alice's ticket in My Tickets list
      await searchInput.fill(uniqueSummary);
      await expect(
        page.getByText(/No tickets match your filter criteria/i)
      ).toBeVisible();

      // Direct non-owner access check using Alice's actual ticket resource UUID under Bob's context (AC-03)
      const directAccessResult = await page.evaluate(
        async ({ id, bobRequesterId }) => {
          try {
            const res = await fetch(`http://localhost:3000/api/tickets/${id}`, {
              headers: { "X-Requester-Id": String(bobRequesterId) },
            });
            const body = await res.json().catch(() => ({}));
            return { status: res.status, message: body?.error?.message || body?.error?.code };
          } catch (err: any) {
            return { status: 500, message: err?.message };
          }
        },
        { id: aliceTicketUuid, bobRequesterId: bobId }
      );

      // Verify HTTP 404 response
      expect(directAccessResult.status).toBe(404);
      expect(directAccessResult.message).toBe("Ticket not found.");

      // Trigger UI ticket detail rendering for non-owned ticket UUID under Bob's context and verify UI alert
      await page.evaluate((id) => {
        const elem = document.querySelector(".container");
        if (!elem) return;
        const k = Object.keys(elem).find((key) => key.startsWith("__reactFiber$"));
        if (!k) return;
        let fiber = (elem as any)[k];
        while (fiber && fiber.type?.name !== "App") {
          fiber = fiber.return;
        }
        if (!fiber) fiber = (elem as any)[k];

        let hook = fiber?.memoizedState;
        while (hook) {
          if (hook.queue && typeof hook.queue.dispatch === "function") {
            if (hook.memoizedState === null || typeof hook.memoizedState === "string") {
              try {
                hook.queue.dispatch(id);
              } catch (e) {}
            }
          }
          hook = hook.next;
        }
      }, aliceTicketUuid);

      // Verify the UI safely displays the "Ticket not found." error banner
      await expect(page.getByRole("alert").filter({ hasText: /Ticket not found/i })).toBeVisible();
    });
  });

  // Scenario 2: Mobile Viewport (< 768px)
  test.describe("Mobile Viewport (375x667)", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("E2E-01 Mobile: Responsive Layout Stack & Full Flow without Horizontal Overflow (AC-18)", async ({
      page,
    }) => {
      // 1. Open Application Shell
      await page.goto("http://localhost:5173/");

      // Select Alice Smith (ID 1)
      await page.getByRole("radio", { name: /Alice Smith/i }).check();
      await page.getByRole("button", { name: /Continue/i }).click();

      // Verify Responsive Container - No Horizontal Overflow
      const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      expect(bodyScrollWidth).toBeLessThanOrEqual(viewportWidth);

      // Navigate to Create Ticket
      await page.getByRole("button", { name: /^Create Ticket$/i }).click();

      const timestamp = Date.now();
      const uniqueSummary = `E2E Mobile Access Issue ${timestamp}`;
      const uniqueDescription = `E2E Mobile Test Description created at timestamp ${timestamp}. Screen flicker occurs repeatedly.`;

      // Fill Form
      await page.getByLabel(/Category/i).selectOption({ label: "Hardware" });
      await page.getByLabel(/Related System/i).selectOption({ label: "Corporate Laptop" });
      await page.getByLabel("MEDIUM").check();
      await page.getByLabel(/Summary/i).fill(uniqueSummary);
      await page.getByLabel(/Description/i).fill(uniqueDescription);

      // Submit Form
      await page.getByRole("button", { name: /Submit Ticket/i }).click();
      await expect(page.getByText(/created successfully!/i)).toBeVisible();

      // Navigate to My Tickets
      await page.getByRole("button", { name: /^My Tickets$/i }).click();

      // Search & Verify Mobile Stack Card Layout
      await page.getByLabel(/Search tickets/i).fill(uniqueSummary);
      await expect(page.getByText(uniqueSummary)).toBeVisible();
      await expect(page.getByRole("button", { name: /View Details/i }).first()).toBeVisible();

      // Open Ticket Detail on Mobile
      await page.getByRole("button", { name: /View Details/i }).first().click();
      await expect(page.getByText(uniqueSummary)).toBeVisible();
      await expect(page.getByRole("button", { name: /Back to My Tickets/i })).toBeVisible();
    });
  });
});
