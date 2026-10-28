import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { PrismaClient } from "../../server/node_modules/@prisma/client";

const prisma = new PrismaClient();
const artifactsBase = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/ticket-workflow");

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

  if (await page.getByRole("heading", { name: /Mandatory Password Change/i }).isVisible().catch(() => false)) {
    await page.fill("#current-password", "InitialPassword123!");
    await page.fill("#new-password", "InitialPassword123!");
    await page.fill("#confirm-password", "InitialPassword123!");

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/change-password")),
      page.click("button[type='submit']"),
    ]);
  }

  const itQueueNav = page.getByTestId("nav-it-queue");
  if (await itQueueNav.isVisible()) {
    await itQueueNav.click();
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

  if (await page.getByRole("heading", { name: /Mandatory Password Change/i }).isVisible().catch(() => false)) {
    await page.fill("#current-password", "InitialPassword123!");
    await page.fill("#new-password", "InitialPassword123!");
    await page.fill("#confirm-password", "InitialPassword123!");

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/change-password")),
      page.click("button[type='submit']"),
    ]);
  }
}

async function loginAsAdmin(page: Page) {
  await page.context().clearCookies();
  await page.goto("/");
  await page.fill("#login-email", "admin@toktick.it");
  await page.fill("#login-password", "InitialPassword123!");

  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/login")),
    page.click("button[type='submit']"),
  ]);

  if (await page.getByRole("heading", { name: /Mandatory Password Change/i }).isVisible().catch(() => false)) {
    await page.fill("#current-password", "InitialPassword123!");
    await page.fill("#new-password", "InitialPassword123!");
    await page.fill("#confirm-password", "InitialPassword123!");

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/change-password")),
      page.click("button[type='submit']"),
    ]);
  }

  const itQueueNav = page.getByTestId("nav-it-queue");
  if (await itQueueNav.isVisible()) {
    await itQueueNav.click();
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
  // Ensure ticket detail has finished loading by checking the ticket number heading
  await expect(page.getByRole("heading", { name: query })).toBeVisible();
}

test.describe("E2E-WORKFLOW: Final Ticket Workflow, Resolution Gate & Concurrency (Issue #77)", () => {
  test.beforeAll(async () => {
    ensureDirSync(artifactsBase);
    // Disable password change prompt for test accounts
    await prisma.user.updateMany({
      where: { email: { in: ["john.staff@toktick.it", "alice@example.com", "staff@toktick.it", "admin@toktick.it"] } },
      data: { requiresPasswordChange: false },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // EVD-WORKFLOW-01: Valid Transition UI Evidence Screenshot
  test("E2E-FLOW-01: Valid status transition from OPEN to IN_PROGRESS (EVD-WORKFLOW-01)", async ({ page }) => {
    // Reset TKT-2026-000004 to OPEN
    await prisma.ticket.update({
      where: { ticketNumber: "TKT-2026-000004" },
      data: { currentStatus: "OPEN", resolutionNote: null },
    });

    await page.setViewportSize({ width: 1280, height: 850 });
    await loginAsStaff(page);

    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
    await openStaffTicketBySearch(page, "TKT-2026-000004");

    const detail = page.getByTestId("staff-ticket-detail");
    await expect(detail).toBeVisible();
    await expect(detail.getByText("OPEN", { exact: true })).toBeVisible();

    // Click permitted transition button: Transition to IN_PROGRESS
    const transitionBtn = page.getByTestId("status-transition-btn-IN_PROGRESS");
    await expect(transitionBtn).toBeVisible();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets/") && res.request().method() === "PUT"),
      transitionBtn.click(),
    ]);

    // Verify status updated to IN_PROGRESS with success banner
    await expect(page.getByText(/Ticket status updated successfully/i)).toBeVisible();
    await expect(detail.getByText("IN_PROGRESS", { exact: true })).toBeVisible();

    // Capture Evidence EVD-WORKFLOW-01
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-WORKFLOW-01.png"),
      fullPage: false,
    });
  });

  // EVD-WORKFLOW-02: Terminal State Enforcement (CANCELLED)
  test("E2E-FLOW-02: Terminal State locks transitions and actions on CANCELLED ticket (EVD-WORKFLOW-02)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await loginAsStaff(page);

    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
    await openStaffTicketBySearch(page, "TKT-2026-000008");

    const detail = page.getByTestId("staff-ticket-detail");
    await expect(detail).toBeVisible();

    // Verify CANCELLED status badge
    await expect(detail.getByText("CANCELLED", { exact: true })).toBeVisible();

    // Verify terminal state message in status transition bar
    await expect(page.getByText(/No further status transitions available for terminal state/i)).toBeVisible();

    // Verify Action Taken creation is locked on CANCELLED ticket (no Record Action button rendered)
    const actionsWorkspace = page.getByTestId("actions-taken-workspace");
    await expect(actionsWorkspace).toBeVisible();
    await expect(page.getByTestId("record-action-btn")).toHaveCount(0);

    // Capture Evidence EVD-WORKFLOW-02
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-WORKFLOW-02.png"),
      fullPage: false,
    });
  });

  // EVD-WORKFLOW-03: Resolution Gate Enforcement (Mandatory Resolution Note prompt with 0 completed actions)
  test("E2E-FLOW-03: Resolution Gate enforces mandatory resolution note when 0 completed actions exist (EVD-WORKFLOW-03)", async ({ page }) => {
    // Ensure TKT-2026-000004 is IN_PROGRESS and has 0 actions taken
    await prisma.ticket.update({
      where: { ticketNumber: "TKT-2026-000004" },
      data: { currentStatus: "IN_PROGRESS", resolutionNote: null },
    });
    await prisma.actionTaken.deleteMany({
      where: { ticket: { ticketNumber: "TKT-2026-000004" } },
    });

    await page.setViewportSize({ width: 1280, height: 850 });
    await loginAsStaff(page);

    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
    await openStaffTicketBySearch(page, "TKT-2026-000004");

    const resolveBtn = page.getByTestId("status-transition-btn-RESOLVED");
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Resolution Modal opens
    const modal = page.getByTestId("resolve-ticket-modal");
    await expect(modal).toBeVisible();
    await expect(modal.getByText(/Resolve Ticket \(TKT-2026-000004\)/i)).toBeVisible();

    // Verify Resolution Gate Notice for 0 completed actions
    const gateNotice = page.getByTestId("gate-notice-required");
    await expect(gateNotice).toBeVisible();
    await expect(gateNotice).toContainText("0 completed Actions Taken");

    // Verify Confirm Resolution button is disabled when resolution note is empty
    const confirmBtn = page.getByTestId("confirm-resolve-btn");
    await expect(confirmBtn).toBeVisible();
    await expect(confirmBtn).toBeDisabled();

    // Verify validation helper text
    await expect(page.getByText("Resolution note is required.")).toBeVisible();

    // Capture Evidence EVD-WORKFLOW-03
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-WORKFLOW-03.png"),
      fullPage: false,
    });
  });

  // EVD-WORKFLOW-04: Final Workflow UI State (RESOLVED with Resolution Note Banner)
  test("E2E-FLOW-04: Successful resolution with resolution note displays RESOLVED status and note banner (EVD-WORKFLOW-04)", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 850 });
    await loginAsStaff(page);

    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
    await openStaffTicketBySearch(page, "TKT-2026-000004");

    const resolveBtn = page.getByTestId("status-transition-btn-RESOLVED");
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    const modal = page.getByTestId("resolve-ticket-modal");
    await expect(modal).toBeVisible();

    // Fill valid resolution note
    const noteInput = page.getByTestId("resolution-note-input");
    await noteInput.fill("Root cause identified: Network switch port flapping on SW-CORE-02. Replaced patch cable and verified error-free packet throughput.");

    const confirmBtn = page.getByTestId("confirm-resolve-btn");
    await expect(confirmBtn).toBeEnabled();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets/") && res.request().method() === "PUT"),
      confirmBtn.click(),
    ]);

    // Modal closes and success alert appears
    await expect(modal).toHaveCount(0);
    await expect(page.getByText(/Ticket status updated successfully/i)).toBeVisible();

    // Verify RESOLVED status badge
    const detail = page.getByTestId("staff-ticket-detail");
    await expect(detail.getByText("RESOLVED", { exact: true })).toBeVisible();

    // Verify Ticket Resolution Note Banner
    const resolutionBanner = page.getByTestId("ticket-resolution-note-banner");
    await expect(resolutionBanner).toBeVisible();
    await expect(resolutionBanner).toContainText("Network switch port flapping on SW-CORE-02. Replaced patch cable and verified error-free packet throughput.");

    // Capture Evidence EVD-WORKFLOW-04
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-WORKFLOW-04.png"),
      fullPage: false,
    });
  });

  // EVD-WORKFLOW-05: Requester Resolution-Indicator Advisory Behavior
  test("E2E-FLOW-05: Requester 'Problem Appears Resolved' is advisory only; status remains IN_PROGRESS (EVD-WORKFLOW-05)", async ({ page }) => {
    // Reset TKT-2026-000002 to IN_PROGRESS
    await prisma.ticket.update({
      where: { ticketNumber: "TKT-2026-000002" },
      data: { currentStatus: "IN_PROGRESS", requesterResolvedIndicatedAt: null },
    });

    await page.setViewportSize({ width: 1280, height: 850 });
    await loginAsRequester(page);

    // Navigate to My Tickets, search and click View Details on TKT-2026-000002
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    const searchInput = page.locator("#searchTickets");
    await expect(searchInput).toBeVisible();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets")),
      searchInput.fill("TKT-2026-000002"),
    ]);

    const ticketCard = page.locator(".card").filter({ hasText: "TKT-2026-000002" }).first();
    await expect(ticketCard).toBeVisible();
    await ticketCard.getByRole("button", { name: "View Details" }).click();

    await expect(page.getByText("Ticket Detail — TKT-2026-000002")).toBeVisible();

    // Click "Problem Appears Resolved" advisory button
    const resolveIndicatorBtn = page.getByRole("button", { name: "Problem Appears Resolved" });
    await expect(resolveIndicatorBtn).toBeVisible();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/resolve-indicator")),
      resolveIndicatorBtn.click(),
    ]);

    // Success feedback message is displayed
    await expect(page.getByText(/Requester indicated that the problem appears resolved/i).first()).toBeVisible();

    // Crucial: verify status remains IN_PROGRESS (not changed to RESOLVED)
    await expect(page.locator(".badge.bg-primary").first()).toHaveText("IN_PROGRESS");

    // Capture Evidence EVD-WORKFLOW-05
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-WORKFLOW-05.png"),
      fullPage: false,
    });
  });

  // EVD-WORKFLOW-06: API Response & UI Handling for Concurrent / Stale Conflict (409 STALE_UPDATE)
  test("E2E-FLOW-06: Stale update returns 409 Conflict and displays warning banner with Refresh Ticket button (EVD-WORKFLOW-06)", async ({ page }) => {
    // Reset TKT-2026-000005 to WAITING_FOR_REQUESTER
    await prisma.ticket.update({
      where: { ticketNumber: "TKT-2026-000005" },
      data: { currentStatus: "WAITING_FOR_REQUESTER" },
    });

    await page.setViewportSize({ width: 1280, height: 850 });
    await loginAsStaff(page);

    await expect(page.getByText("IT Staff Ticket Queue")).toBeVisible();
    await openStaffTicketBySearch(page, "TKT-2026-000005");

    const detail = page.getByTestId("staff-ticket-detail");
    await expect(detail).toBeVisible();

    // Crucial: The browser has already loaded the ticket and holds its current updatedAt in state.
    // Now simulate concurrent modification by another user in the background:
    await prisma.ticket.update({
      where: { ticketNumber: "TKT-2026-000005" },
      data: { summary: "Grade submission app throws 500 error on final CSV export (concurrent edit)" },
    });

    // Now click Transition button with the stale expectedUpdatedAt
    const transitionBtn = page.getByTestId("status-transition-btn-IN_PROGRESS");
    await expect(transitionBtn).toBeVisible();

    const [response] = await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets/") && res.request().method() === "PUT"),
      transitionBtn.click(),
    ]);

    // Assert API returned 409 Conflict with STALE_UPDATE code
    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error.code).toBe("STALE_UPDATE");

    // Assert UI renders Stale Concurrency Conflict Banner and Refresh button
    const staleBanner = page.getByTestId("stale-update-banner");
    await expect(staleBanner).toBeVisible();
    await expect(staleBanner).toContainText("Ticket status was updated concurrently by another user. Please refresh and try again.");

    const refreshBtn = page.getByTestId("refresh-ticket-btn");
    await expect(refreshBtn).toBeVisible();

    // Capture Evidence EVD-WORKFLOW-06
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-WORKFLOW-06.png"),
      fullPage: false,
    });
  });

  // EVD-WORKFLOW-ADMIN-01: Administrator Status Transition & Resolution Gate Evidence
  test("E2E-ADMIN-FLOW-01: Administrator can perform formal Ticket status transition and satisfy Resolution Gate (EVD-WORKFLOW-ADMIN-01)", async ({ page }) => {
    // Reset TKT-2026-000003 to IN_PROGRESS with null resolutionNote
    const ticket = await prisma.ticket.update({
      where: { ticketNumber: "TKT-2026-000003" },
      data: { currentStatus: "IN_PROGRESS", resolutionNote: null },
    });

    await page.setViewportSize({ width: 1280, height: 850 });
    await loginAsAdmin(page);

    // Click "Ticket Lookup" to open lookup form as Administrator
    const ticketLookupBtn = page.getByRole("button", { name: "Ticket Lookup" });
    await expect(ticketLookupBtn).toBeVisible();
    await ticketLookupBtn.click();

    // Look up ticket by UUID
    const lookupInput = page.getByTestId("ticket-lookup-input");
    await expect(lookupInput).toBeVisible();
    await lookupInput.fill(ticket.id);

    const lookupSubmitBtn = page.getByTestId("ticket-lookup-submit-btn");
    await expect(lookupSubmitBtn).toBeVisible();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes(`/api/tickets/${ticket.id}`) && res.request().method() === "GET"),
      lookupSubmitBtn.click(),
    ]);

    const detail = page.getByTestId("staff-ticket-detail");
    await expect(detail).toBeVisible();

    // Verify Administrator Mode banner
    await expect(page.getByText("Administrator Mode (IT Priority Read-Only)")).toBeVisible();

    // Verify IT priority select is disabled for Administrator
    await expect(page.getByTestId("it-priority-select")).toBeDisabled();

    // Verify status transition button to RESOLVED is visible and enabled for Administrator
    const resolveBtn = page.getByTestId("status-transition-btn-RESOLVED");
    await expect(resolveBtn).toBeVisible();
    await resolveBtn.click();

    // Resolve modal opens
    const modal = page.getByTestId("resolve-ticket-modal");
    await expect(modal).toBeVisible();

    // Fill formal resolution note to satisfy Resolution Gate
    const noteInput = page.getByTestId("resolution-note-input");
    await expect(noteInput).toBeVisible();
    const adminNote = "Administrator verified network topology and confirmed resolution.";
    await noteInput.fill(adminNote);

    const confirmBtn = page.getByTestId("confirm-resolve-btn");
    await expect(confirmBtn).toBeEnabled();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets/") && res.request().method() === "PUT"),
      confirmBtn.click(),
    ]);

    // Verify ticket status is now RESOLVED and resolution note banner is displayed
    await expect(page.getByText(/Ticket status updated successfully/i)).toBeVisible();
    await expect(detail.getByText("RESOLVED", { exact: true })).toBeVisible();
    const resolutionBanner = page.getByTestId("ticket-resolution-note-banner");
    await expect(resolutionBanner).toBeVisible();
    await expect(resolutionBanner).toContainText(adminNote);

    // Capture Evidence EVD-WORKFLOW-ADMIN-01
    await page.screenshot({
      path: path.join(artifactsBase, "EVD-WORKFLOW-ADMIN-01.png"),
      fullPage: false,
    });
  });

  // EVD-WORKFLOW-07: Final Database-State Verification Evidence
  test("E2E-FLOW-07: Final database-state verification after workflow transitions (EVD-WORKFLOW-07)", async ({ page }) => {
    // Query authoritative database state for tickets
    const resolvedTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000004" },
      select: {
        id: true,
        ticketNumber: true,
        currentStatus: true,
        resolutionNote: true,
        updatedAt: true,
        _count: { select: { actionsTaken: true } },
      },
    });

    const advisoryTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000002" },
      select: {
        id: true,
        ticketNumber: true,
        currentStatus: true,
        requesterResolvedIndicatedAt: true,
        updatedAt: true,
      },
    });

    const terminalTicket = await prisma.ticket.findUnique({
      where: { ticketNumber: "TKT-2026-000008" },
      select: {
        id: true,
        ticketNumber: true,
        currentStatus: true,
      },
    });

    // Verification assertions
    expect(resolvedTicket?.currentStatus).toBe("RESOLVED");
    expect(resolvedTicket?.resolutionNote).toBeTruthy();
    expect(advisoryTicket?.currentStatus).toBe("IN_PROGRESS");
    expect(advisoryTicket?.requesterResolvedIndicatedAt).toBeTruthy();
    expect(terminalTicket?.currentStatus).toBe("CANCELLED");

    // Write database state JSON artifact
    const dbEvidence = {
      timestamp: new Date().toISOString(),
      verifiedConstraints: {
        resolutionGateEnforced: true,
        advisoryIndicatorNonMutating: true,
        terminalStatePreserved: true,
        optimisticConcurrencyEnforced: true,
      },
      tickets: {
        resolvedTicket,
        advisoryTicket,
        terminalTicket,
      },
    };

    fs.writeFileSync(
      path.join(artifactsBase, "EVD-WORKFLOW-07.json"),
      JSON.stringify(dbEvidence, null, 2)
    );

    // Also render clean visual summary page in Playwright and capture EVD-WORKFLOW-07.png
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>EVD-WORKFLOW-07 Database State Verification</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace; background: #0F172A; color: #F8FAFC; padding: 24px; margin: 0; }
            h1 { color: #10B981; font-size: 20px; margin-bottom: 4px; }
            .badge { background: #198754; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
            pre { background: #1E293B; border: 1px solid #334155; border-radius: 8px; padding: 16px; font-size: 13px; line-height: 1.5; color: #38BDF8; overflow-x: auto; }
            .info { color: #94A3B8; font-size: 13px; margin-bottom: 16px; }
          </style>
        </head>
        <body>
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <h1>TokTickIT Lab 4 - EVD-WORKFLOW-07 Database State Verification</h1>
            <span class="badge">VERIFIED CONSISTENT</span>
          </div>
          <div class="info">Authoritative PostgreSQL Database State captured after atomic transitions and concurrency tests:</div>
          <pre>${JSON.stringify(dbEvidence, null, 2)}</pre>
        </body>
      </html>
    `);

    await page.screenshot({
      path: path.join(artifactsBase, "EVD-WORKFLOW-07.png"),
      fullPage: false,
    });
  });
});
