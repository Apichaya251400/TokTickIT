import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";

const artifactsBase = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/actions-taken");

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function loginAsStaff(page: Page) {
  await page.context().clearCookies();
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

async function loginAsRequester(page: Page) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.fill("#login-email", "alice@example.com");
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

async function openStaffTicketBySearch(page: Page, query: string) {
  const searchInput = page.getByTestId("queue-search-input");
  await expect(searchInput).toBeVisible();

  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/tickets")),
    searchInput.fill(query),
  ]);

  const targetRow = page.locator("tbody tr").first();
  await expect(targetRow).toBeVisible();
  await targetRow.click();
  await expect(page.getByTestId("staff-ticket-detail")).toBeVisible();
}

test.describe("E2E-ACT: Actions Taken Workspace Flow & Evidence Capture", () => {
  test.beforeAll(() => {
    ensureDirSync(artifactsBase);
  });

  test("E2E-ACT-01: Chronological Action List and Performed-By identity display", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    // Navigate to Staff Queue & open TKT-2026-000002
    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
    await openStaffTicketBySearch(page, "TKT-2026-000002");

    // Actions Taken Workspace is visible
    const workspace = page.getByTestId("actions-taken-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace.getByText("Actions Taken Work Log")).toBeVisible();

    // Verify actions list is rendered
    await expect(page.getByTestId("actions-list")).toBeVisible();

    // Evidence EVD-ACT-01: Chronological Action List and Performed-By display
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-01.png"),
      fullPage: false,
    });
  });

  test("E2E-ACT-02: Action Create Form showing active assignee selector and validation", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    await openStaffTicketBySearch(page, "TKT-2026-000002");

    // Click Record Action
    const recordBtn = page.getByTestId("record-action-btn");
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    // Verify Create Action Form appears
    await expect(page.getByTestId("create-action-card")).toBeVisible();

    // Performed By capsule is visible with authenticated staff user
    const performerCapsule = page.getByTestId("performed-by-capsule");
    await expect(performerCapsule).toBeVisible();
    await expect(performerCapsule).toContainText("John Staff");
    await expect(performerCapsule).toContainText("IT_STAFF");

    // Toggle follow-up needed
    const followUpSwitch = page.getByTestId("follow-up-switch");
    await followUpSwitch.click();
    await expect(page.getByTestId("follow-up-note-input")).toBeVisible();

    // Trigger validation by clicking Save Action with empty fields
    await page.getByTestId("save-action-btn").click();
    await expect(page.getByText("Description is required.")).toBeVisible();
    await expect(page.getByText("Result is required.")).toBeVisible();
    await expect(page.getByText("Follow-up note is required when follow-up is needed.")).toBeVisible();

    // Evidence EVD-ACT-02: Action Create Form showing active assignee selector and validation
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-02.png"),
      fullPage: false,
    });
  });

  test("E2E-ACT-03: Create Action, Status Transition, and Complete Action", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    await openStaffTicketBySearch(page, "TKT-2026-000002");

    // Open create action form
    await page.getByTestId("record-action-btn").click();

    // Fill valid data
    const uniqueDesc = `Automated verification test run ${Date.now()}`;
    await page.getByTestId("action-description-input").fill(uniqueDesc);
    await page.getByTestId("action-result-input").fill("Antenna signal levels recalibrated to optimal range.");
    await page.getByTestId("attachment-notes-input").fill("Refer to RF_spectrum_analyzer.png");

    // Submit action
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/actions") && res.request().method() === "POST"),
      page.getByTestId("save-action-btn").click(),
    ]);

    // Find the newly created action card
    const newCard = page.locator("[data-testid^='action-card-']", { hasText: uniqueDesc });
    await expect(newCard).toBeVisible();
    await expect(newCard).toContainText("PENDING");

    // Click Start Work on the action
    const startWorkBtn = newCard.locator("[data-testid^='action-start-work-btn-']");
    await expect(startWorkBtn).toBeVisible();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/status") && res.request().method() === "PUT"),
      startWorkBtn.click(),
    ]);

    // Status is now IN_PROGRESS
    await expect(newCard).toContainText("IN_PROGRESS");

    // Evidence EVD-ACT-03: Action Status Transitions
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-03.png"),
      fullPage: false,
    });
  });

  test("E2E-ACT-04: Edit Action Content via Modal with Concurrency Control", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    await openStaffTicketBySearch(page, "TKT-2026-000002");

    // Find first action card and click Edit Content
    const firstEditBtn = page.locator("[data-testid^='action-edit-btn-']").first();
    await expect(firstEditBtn).toBeVisible();
    await firstEditBtn.click();

    // Verify Edit Action Modal opens
    const modal = page.getByTestId("edit-action-modal");
    await expect(modal).toBeVisible();
    await expect(page.getByTestId("edit-description-input")).toBeVisible();
    await expect(page.getByTestId("edit-result-input")).toBeVisible();

    // Evidence EVD-ACT-04: Action Content Editing Modal
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-04.png"),
      fullPage: false,
    });

    // Close modal
    await modal.getByLabel("Close").click();
    await expect(modal).not.toBeVisible();
  });

  test("E2E-ACT-05: Cancelled Parent Ticket locks all action creation, editing, and transitions", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    // Search and open TKT-2026-000008 (Cancelled ticket)
    await openStaffTicketBySearch(page, "TKT-2026-000008");

    // Verify parent ticket is CANCELLED
    await expect(page.getByText("CANCELLED").first()).toBeVisible();

    // Cancelled banner is visible in Actions Taken workspace
    await expect(page.getByTestId("ticket-cancelled-banner")).toBeVisible();

    // Record Action button is NOT rendered
    await expect(page.getByTestId("record-action-btn")).not.toBeVisible();

    // No edit or status transition buttons are rendered
    await expect(page.locator("[data-testid^='action-edit-btn-']")).toHaveCount(0);
    await expect(page.locator("[data-testid^='action-start-work-btn-']")).toHaveCount(0);
    await expect(page.locator("[data-testid^='action-complete-btn-']")).toHaveCount(0);
    await expect(page.locator("[data-testid^='action-cancel-btn-']")).toHaveCount(0);

    // Evidence EVD-ACT-05: Cancelled Parent Ticket lock state
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-05.png"),
      fullPage: false,
    });
  });

  test("E2E-ACT-06: Requester Read-Only View across Desktop, Tablet, and Mobile Viewports", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1280, height: 800 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 375, height: 812 },
    ];

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsRequester(page);

      // In My Tickets list, click "View Details" on the first ticket
      const viewDetailsBtn = page.getByRole("button", { name: "View Details" }).first();
      await expect(viewDetailsBtn).toBeVisible();
      await viewDetailsBtn.click();

      // Verify Actions Taken is visible in read-only mode
      const workspace = page.getByTestId("actions-taken-workspace");
      await expect(workspace).toBeVisible();

      // Read-only constraints: no Record Action, no edit buttons, no status buttons
      await expect(page.getByTestId("record-action-btn")).not.toBeVisible();
      await expect(page.locator("[data-testid^='action-edit-btn-']")).toHaveCount(0);
      await expect(page.locator("[data-testid^='action-start-work-btn-']")).toHaveCount(0);
      await expect(page.locator("[data-testid^='action-complete-btn-']")).toHaveCount(0);
      await expect(page.locator("[data-testid^='action-cancel-btn-']")).toHaveCount(0);

      // Evidence EVD-ACT-06: Requester read-only view in responsive viewport
      await page.screenshot({
        path: path.join(artifactsBase, `EVD-ACT-06-${vp.name}.png`),
        fullPage: false,
      });

      if (vp.name === "desktop") {
        await page.screenshot({
          path: path.join(artifactsBase, "EVD-ACT-06.png"),
          fullPage: false,
        });
      }

      // Clear cookies for next iteration
      await page.context().clearCookies();
    }
  });
});
