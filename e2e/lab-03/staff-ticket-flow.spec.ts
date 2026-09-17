import { test, expect, Page } from "@playwright/test";

async function loginAsStaff(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.fill("#login-email", "john.staff@toktick.it");
  await page.fill("#login-password", "InitialPassword123!");

  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/login")),
    page.click("button[type='submit']"),
  ]);

  if (await page.getByRole("heading", { name: /Mandatory Password Change/i }).isVisible()) {
    await page.fill("#current-password", "InitialPassword123!");
    await page.fill("#new-password", "InitialPassword123!");
    await page.fill("#confirm-password", "InitialPassword123!");

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/change-password")),
      page.click("button[type='submit']"),
    ]);
  }
}

test.describe("E2E-02: Staff Ticket Flow (Lab 3)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test("AC-STAFF-01: Queue Search and Filtering", async ({ page }) => {
    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();

    const searchInput = page.getByTestId("queue-search-input");
    await expect(searchInput).toBeVisible();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets")),
      searchInput.fill("corporate email"),
    ]);

    await expect(page.getByText(/Cannot access corporate email/i).first()).toBeVisible();
  });

  test("AC-STAFF-02: Claim Ticket, Priority Change, Internal Note & Status Transition Flow", async ({ page }) => {
    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();

    // 1. Filter by Unassigned tickets
    const unassignedTab = page.getByTestId("queue-owner-unassigned");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets")),
      unassignedTab.click(),
    ]);

    // 2. Select first ticket to view details
    await page.locator("table tbody tr").first().click();
    await expect(page.getByTestId("staff-ticket-detail")).toBeVisible();

    // 3. Claim ticket if claim button is available
    const claimBtn = page.getByTestId("claim-ticket-btn");
    if (await claimBtn.isVisible()) {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes("/claim")),
        claimBtn.click(),
      ]);
      await expect(page.getByText(/John Staff/i)).toBeVisible();
    }

    // 4. IT Priority Change
    const prioritySelect = page.getByTestId("it-priority-select");
    await prioritySelect.selectOption("HIGH");
    const savePriorityBtn = page.getByTestId("update-priority-btn");
    if (await savePriorityBtn.isEnabled()) {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes("/priority")),
        savePriorityBtn.click(),
      ]);
      await expect(page.getByText(/HIGH/i).first()).toBeVisible();
    }

    // 5. Post Internal Note (Private to Staff/Admin)
    const notesTab = page.getByRole("button", { name: /Internal Notes/i });
    await notesTab.click();
    await expect(page.getByTestId("internal-notes-section")).toBeVisible();

    const noteTextarea = page.getByPlaceholder(/Add a private internal note/i);
    const uniqueNote = `Staff E2E diagnostic note timestamp ${Date.now()}`;
    await noteTextarea.fill(uniqueNote);

    const postNoteBtn = page.getByTestId("post-internal-note-btn");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/notes")),
      postNoteBtn.click(),
    ]);

    await expect(page.getByText(uniqueNote)).toBeVisible();

    // 6. Status Update Transition
    const openBtn = page.getByTestId("status-transition-btn-OPEN");
    const inProgressBtn = page.getByTestId("status-transition-btn-IN_PROGRESS");
    const transitionBtn = (await openBtn.isVisible()) ? openBtn : ((await inProgressBtn.isVisible()) ? inProgressBtn : null);

    if (transitionBtn) {
      await Promise.all([
        page.waitForResponse((res) => res.url().includes("/status")),
        transitionBtn.click(),
      ]);
    }

    // Return to Queue
    await page.getByTestId("back-to-queue-btn").click();
    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
  });
});
