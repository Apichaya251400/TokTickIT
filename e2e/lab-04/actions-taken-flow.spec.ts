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

  const targetItem = page.locator("[data-testid^='ticket-item-']:visible").first();
  await expect(targetItem).toBeVisible();
  await targetItem.click();
  await expect(page.getByTestId("staff-ticket-detail")).toBeVisible();
}

test.describe("E2E-ACT: Actions Taken Workspace Flow & Evidence Capture (Issue #76)", () => {
  test.beforeAll(() => {
    ensureDirSync(artifactsBase);
  });

  // EVD-ACT-01: Desktop Actions Taken List & Workspace
  test("E2E-ACT-01: Desktop Actions Taken List (EVD-ACT-01)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    // Navigate to Staff Queue & open TKT-2026-000002
    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
    await openStaffTicketBySearch(page, "TKT-2026-000002");

    // Actions Taken Workspace is visible
    const workspace = page.getByTestId("actions-taken-workspace");
    await expect(workspace).toBeVisible();
    await expect(workspace.getByText("Actions Taken Work Log")).toBeVisible();

    // Verify actions list is rendered with Performed By badges and timestamps
    await expect(page.getByTestId("actions-list")).toBeVisible();
    await expect(page.getByTestId("action-performer").first()).toBeVisible();

    // Evidence EVD-ACT-01: Desktop Actions Taken List
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-01.png"),
      fullPage: false,
    });
  });

  // EVD-ACT-02: Mobile Actions Taken
  test("E2E-ACT-02: Mobile Actions Taken (EVD-ACT-02)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await loginAsStaff(page);

    // Open TKT-2026-000002 in mobile viewport
    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
    await openStaffTicketBySearch(page, "TKT-2026-000002");

    // Scroll to Actions Taken Workspace
    const workspace = page.getByTestId("actions-taken-workspace");
    await expect(workspace).toBeVisible();
    await workspace.scrollIntoViewIfNeeded();

    // Verify stacked mobile presentation of action cards
    await expect(page.getByTestId("actions-list")).toBeVisible();

    // Evidence EVD-ACT-02: Mobile Actions Taken
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-02.png"),
      fullPage: false,
    });
  });

  // EVD-ACT-03: Multiple Actions on one Ticket
  test("E2E-ACT-03: Multiple Actions on one Ticket (EVD-ACT-03)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    await openStaffTicketBySearch(page, "TKT-2026-000002");

    // Verify multiple action cards are rendered on this single ticket
    const workspace = page.getByTestId("actions-taken-workspace");
    await expect(workspace).toBeVisible();
    await expect(page.getByTestId("actions-list")).toBeVisible();
    await expect(page.getByTestId("action-performer").first()).toBeVisible();

    const actionCards = page.locator("[data-testid^='action-card-']");
    const count = await actionCards.count();
    expect(count).toBeGreaterThanOrEqual(2);

    // Verify distinct performers / statuses on the cards
    await expect(page.getByTestId("actions-count-badge")).toBeVisible();
    await workspace.scrollIntoViewIfNeeded();

    // Evidence EVD-ACT-03: Multiple Actions on one Ticket
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-03.png"),
      fullPage: false,
    });
  });

  // EVD-ACT-04: Action status transition (Complete / Cancel) & Validation state
  test("E2E-ACT-04: Action status transition (Complete / Cancel) & validation (EVD-ACT-04)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    await openStaffTicketBySearch(page, "TKT-2026-000002");

    // 1. Validation test: Open form and submit empty fields
    const recordBtn = page.getByTestId("record-action-btn");
    await expect(recordBtn).toBeVisible();
    await recordBtn.click();

    await page.getByTestId("save-action-btn").click();
    await expect(page.getByText("Description is required.")).toBeVisible();
    await expect(page.getByText("Result is required.")).toBeVisible();

    // 2. Complete flow: Create action -> PENDING -> Start Work -> IN_PROGRESS -> Complete Action -> COMPLETED
    const completeDesc = `Recalibrate RF channel ${Date.now()}`;
    await page.getByTestId("action-description-input").fill(completeDesc);
    await page.getByTestId("action-result-input").fill("Antenna channel signal recalibrated.");

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/actions") && res.request().method() === "POST"),
      page.getByTestId("save-action-btn").click(),
    ]);

    const completeCard = page.locator("[data-testid^='action-card-']", { hasText: completeDesc });
    await expect(completeCard).toBeVisible();
    await expect(completeCard).toContainText("PENDING");

    // Click Start Work -> IN_PROGRESS
    const startWorkBtn = completeCard.locator("[data-testid^='action-start-work-btn-']");
    await expect(startWorkBtn).toBeVisible();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/status") && res.request().method() === "PUT"),
      startWorkBtn.click(),
    ]);
    await expect(completeCard).toContainText("IN_PROGRESS");

    // Click Complete Action -> COMPLETED
    const completeActionBtn = completeCard.locator("[data-testid^='action-complete-btn-']");
    await expect(completeActionBtn).toBeVisible();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/status") && res.request().method() === "PUT"),
      completeActionBtn.click(),
    ]);
    await expect(completeCard).toContainText("COMPLETED");
    // Verify transition buttons are hidden for terminal COMPLETED status
    await expect(completeCard.locator("[data-testid^='action-complete-btn-']")).toHaveCount(0);
    await expect(completeCard.locator("[data-testid^='action-cancel-btn-']")).toHaveCount(0);

    // 3. Cancel flow: Create another action -> PENDING -> Cancel Action -> CANCELLED
    await page.getByTestId("record-action-btn").click();
    const cancelDesc = `Obsolete antenna patch ${Date.now()}`;
    await page.getByTestId("action-description-input").fill(cancelDesc);
    await page.getByTestId("action-result-input").fill("Patch superseded by hardware replacement.");

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/actions") && res.request().method() === "POST"),
      page.getByTestId("save-action-btn").click(),
    ]);

    const cancelCard = page.locator("[data-testid^='action-card-']", { hasText: cancelDesc });
    await expect(cancelCard).toBeVisible();
    await expect(cancelCard).toContainText("PENDING");

    // Click Cancel Action -> CANCELLED
    const cancelActionBtn = cancelCard.locator("[data-testid^='action-cancel-btn-']");
    await expect(cancelActionBtn).toBeVisible();
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/status") && res.request().method() === "PUT"),
      cancelActionBtn.click(),
    ]);
    await expect(cancelCard).toContainText("CANCELLED");
    // Verify transition buttons are hidden for terminal CANCELLED status
    await expect(cancelCard.locator("[data-testid^='action-complete-btn-']")).toHaveCount(0);
    await expect(cancelCard.locator("[data-testid^='action-cancel-btn-']")).toHaveCount(0);

    await completeCard.scrollIntoViewIfNeeded();

    // Evidence EVD-ACT-04: Action status transition (Complete / Cancel) & Validation state
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-04.png"),
      fullPage: false,
    });
  });

  // EVD-ACT-05: Inactive-assignee rejection & Forbidden state
  test("E2E-ACT-05: Inactive-assignee rejection & Forbidden state (EVD-ACT-05)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });

    // Step A: Inactive-assignee rejection flow as Staff
    await loginAsStaff(page);
    await openStaffTicketBySearch(page, "TKT-2026-000002");

    await page.getByTestId("record-action-btn").click();
    await page.getByTestId("action-description-input").fill("Diagnostic task targeting decommissioned staff account");
    await page.getByTestId("action-result-input").fill("Awaiting active staff assignment confirmation.");

    // Intercept POST /actions to simulate server-side inactive-assignee rejection (INVALID_ASSIGNEE)
    await page.route("**/api/tickets/*/actions", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 400,
          contentType: "application/json",
          body: JSON.stringify({
            error: {
              code: "INVALID_ASSIGNEE",
              message: "Assignee must be an active IT Staff or Administrator user.",
            },
          }),
        });
        return;
      }
      await route.continue();
    });

    // Submit form and verify 400 rejection and UI error feedback
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/actions") && res.status() === 400),
      page.getByTestId("save-action-btn").click(),
    ]);

    await expect(page.getByTestId("create-action-error")).toContainText(
      "Assignee must be an active IT Staff or Administrator user."
    );
    await expect(page.getByTestId("assignee-error")).toContainText(
      "Assignee must be an active IT Staff or Administrator user."
    );

    // Evidence EVD-ACT-05: Inactive-assignee rejection feedback
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-05.png"),
      fullPage: false,
    });

    await page.unroute("**/api/tickets/*/actions");

    // Step B: Forbidden / Read-only state verification as Requester
    await page.context().clearCookies();
    await loginAsRequester(page);

    const viewDetailsBtn = page.getByRole("button", { name: "View Details" }).first();
    await expect(viewDetailsBtn).toBeVisible();
    await viewDetailsBtn.click();

    // Verify Actions Taken is in strict read-only mode for Requester
    const requesterWorkspace = page.getByTestId("actions-taken-workspace");
    await expect(requesterWorkspace).toBeVisible();
    await expect(page.getByTestId("record-action-btn")).toHaveCount(0);
    await expect(page.locator("[data-testid^='action-edit-btn-']")).toHaveCount(0);
    await expect(page.locator("[data-testid^='action-start-work-btn-']")).toHaveCount(0);
    await expect(page.locator("[data-testid^='action-complete-btn-']")).toHaveCount(0);
    await expect(page.locator("[data-testid^='action-cancel-btn-']")).toHaveCount(0);
  });

  // EVD-ACT-06: Follow-up conditional field behavior
  test("E2E-ACT-06: Follow-up conditional field behavior (EVD-ACT-06)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await loginAsStaff(page);

    await openStaffTicketBySearch(page, "TKT-2026-000002");

    await page.getByTestId("record-action-btn").click();
    await page.getByTestId("action-description-input").fill("Tested power supply fluctuation under 100% load");
    await page.getByTestId("action-result-input").fill("Output voltage drops 1.2V under peak load.");

    // Toggle follow-up switch
    const followUpSwitch = page.getByTestId("follow-up-switch");
    await followUpSwitch.click();

    // Verify conditional follow-up note input is rendered
    const followUpContainer = page.getByTestId("follow-up-note-container");
    await expect(followUpContainer).toBeVisible();
    const followUpInput = page.getByTestId("follow-up-note-input");
    await expect(followUpInput).toBeVisible();

    // Attempt to submit with empty follow-up note -> validation error
    await page.getByTestId("save-action-btn").click();
    await expect(page.getByText("Follow-up note is required when follow-up is needed.")).toBeVisible();

    // Fill unique follow-up note
    const uniqueFollowUpNote = `Re-test with benchtop linear power supply ${Date.now()}`;
    await followUpInput.fill(uniqueFollowUpNote);

    // Submit action
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/actions") && res.request().method() === "POST"),
      page.getByTestId("save-action-btn").click(),
    ]);

    // Verify created action renders follow-up warning border and note text
    const followUpCard = page.locator("[data-testid^='action-card-']", {
      hasText: uniqueFollowUpNote,
    });
    await expect(followUpCard).toBeVisible();
    const followUpNoteElem = followUpCard.getByTestId("action-follow-up-note");
    await expect(followUpNoteElem).toBeVisible();
    await expect(followUpNoteElem).toContainText("Follow-Up");
    await expect(followUpNoteElem).toContainText(uniqueFollowUpNote);

    await followUpCard.scrollIntoViewIfNeeded();

    // Evidence EVD-ACT-06: Follow-up conditional field behavior
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-ACT-06.png"),
      fullPage: false,
    });
  });
});
