import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { PrismaClient } from "../../server/node_modules/@prisma/client";

const prisma = new PrismaClient();
const artifactsBase = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/e2e-hardening");

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Calculates startOfDay and startOfNextDay for Asia/Bangkok (UTC+7)
 */
function getBangkokDayBoundaries(date = new Date()): { startOfDay: Date; startOfNextDay: Date } {
  const bangkokOffsetMs = 7 * 60 * 60 * 1000;
  const bangkokTime = new Date(date.getTime() + bangkokOffsetMs);
  const year = bangkokTime.getUTCFullYear();
  const month = bangkokTime.getUTCMonth();
  const day = bangkokTime.getUTCDate();

  const startOfDay = new Date(Date.UTC(year, month, day) - bangkokOffsetMs);
  const startOfNextDay = new Date(Date.UTC(year, month, day + 1) - bangkokOffsetMs);

  return { startOfDay, startOfNextDay };
}

function getBangkokDaysAgoBoundaries(daysAgo: number): { startOfDay: Date; startOfNextDay: Date } {
  const bangkokOffsetMs = 7 * 60 * 60 * 1000;
  const now = new Date();
  const bangkokTime = new Date(now.getTime() + bangkokOffsetMs);
  const year = bangkokTime.getUTCFullYear();
  const month = bangkokTime.getUTCMonth();
  const day = bangkokTime.getUTCDate();

  const startOfDay = new Date(Date.UTC(year, month, day - daysAgo) - bangkokOffsetMs);
  const startOfNextDay = new Date(Date.UTC(year, month, day + 1) - bangkokOffsetMs);

  return { startOfDay, startOfNextDay };
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
}

async function loginAsRequester(page: Page, email = "alice@example.com") {
  await page.context().clearCookies();
  await page.goto("/");
  await page.fill("#login-email", email);
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
}

test.describe("E2E-DASH: Operational Dashboards, Calculations, Ownership Isolation & Drill-Down (Issue #82 / LAB4-11)", () => {
  test.beforeAll(() => {
    ensureDirSync(artifactsBase);
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // TEST 1: Staff Dashboard Authoritative Metrics & Drill-Down
  test("E2E-DASH-01: IT Staff Dashboard Authoritative Metric Calculation & Queue Drill-Down", async ({ page }) => {
    // 1. Authoritative DB calculation for john.staff@toktick.it
    const staffUser = await prisma.user.findUnique({
      where: { email: "john.staff@toktick.it" },
    });
    expect(staffUser).not.toBeNull();
    const staffId = staffUser!.id;

    const { startOfDay, startOfNextDay } = getBangkokDayBoundaries();

    const expectedUnassigned = await prisma.ticket.count({
      where: {
        ownerId: null,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });

    const expectedMyAssigned = await prisma.ticket.count({
      where: {
        ownerId: staffId,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });

    const expectedTodayActions = await prisma.actionTaken.count({
      where: {
        performedById: staffId,
        createdAt: { gte: startOfDay, lt: startOfNextDay },
      },
    });

    const expectedUrgent = await prisma.ticket.count({
      where: {
        itPriority: "URGENT",
        currentStatus: { in: ["NEW", "OPEN", "IN_PROGRESS"] },
      },
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAsStaff(page);

    // Assert Staff Dashboard landing page
    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();
    await expect(page.getByTestId("dashboard-welcome-heading")).toContainText(staffUser!.name);

    // Assert Authoritative Metric card values match exact DB calculation
    const unassignedCountEl = page.getByTestId("metric-unassigned-count");
    const myAssignedCountEl = page.getByTestId("metric-my-assigned-count");
    const todayActionsCountEl = page.getByTestId("metric-today-actions-count");
    const urgentCountEl = page.getByTestId("metric-urgent-workload-count");

    await expect(unassignedCountEl).toHaveText(expectedUnassigned.toString());
    await expect(myAssignedCountEl).toHaveText(expectedMyAssigned.toString());
    await expect(todayActionsCountEl).toHaveText(expectedTodayActions.toString());
    await expect(urgentCountEl).toHaveText(expectedUrgent.toString());

    // Drill-Down 1: Click Unassigned metric card -> Navigates to IT Queue filtered by unassigned
    const unassignedCard = page.getByTestId("metric-unassigned-card");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets") && res.status() === 200),
      unassignedCard.click(),
    ]);

    await expect(page.getByTestId("staff-queue-page")).toBeVisible();
    const unassignedTab = page.getByTestId("queue-owner-unassigned");
    await expect(unassignedTab).toHaveClass(/active/);
    await expect(page.getByTestId("view-unassigned-active-banner")).toBeVisible();

    // Return to dashboard via nav
    await page.getByTestId("nav-staff-dashboard").click();
    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();

    // Drill-Down 2: Click Urgent Workload card -> Navigates to IT Queue with Urgent filter
    const urgentCard = page.getByTestId("metric-urgent-workload-card");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets") && res.status() === 200),
      urgentCard.click(),
    ]);

    await expect(page.getByTestId("staff-queue-page")).toBeVisible();
    await expect(page.getByTestId("view-urgent-workload-banner")).toBeVisible();

    // Return to dashboard via nav
    await page.getByTestId("nav-staff-dashboard").click();
    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();

    // Drill-Down 3: Click My Assigned card -> Navigates to IT Queue filtered by My Queue
    const myAssignedCard = page.getByTestId("metric-my-assigned-card");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets") && res.status() === 200),
      myAssignedCard.click(),
    ]);

    await expect(page.getByTestId("staff-queue-page")).toBeVisible();
    const myQueueTab = page.getByTestId("queue-owner-my");
    await expect(myQueueTab).toHaveClass(/active/);
    await expect(page.getByTestId("view-my-queue-active-banner")).toBeVisible();
  });

  // TEST 2: Requester Dashboard Authoritative Metrics, Strict Ownership Isolation & Drill-Down
  test("E2E-DASH-02: Requester Dashboard Authoritative Metrics, Ownership Isolation & My Tickets Drill-Down", async ({ page }) => {
    // 1. Authoritative DB calculation for alice@example.com (Requester A)
    const alice = await prisma.user.findUnique({
      where: { email: "alice@example.com" },
    });
    expect(alice).not.toBeNull();
    const aliceId = alice!.id;

    // Bob (Requester B)
    const bob = await prisma.user.findUnique({
      where: { email: "bob@example.com" },
    });
    expect(bob).not.toBeNull();
    const bobId = bob!.id;

    // Verify Bob owns at least one ticket to strictly test ownership isolation
    const bobTickets = await prisma.ticket.findMany({
      where: { requesterId: bobId },
      select: { ticketNumber: true, summary: true },
    });
    expect(bobTickets.length).toBeGreaterThan(0);
    const bobTicketNumbers = bobTickets.map((t) => t.ticketNumber);

    const { startOfDay, startOfNextDay } = getBangkokDaysAgoBoundaries(29);

    const expectedOpen = await prisma.ticket.count({
      where: {
        requesterId: aliceId,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });

    const expectedWaiting = await prisma.ticket.count({
      where: {
        requesterId: aliceId,
        currentStatus: "WAITING_FOR_REQUESTER",
      },
    });

    const expectedInProgress = await prisma.ticket.count({
      where: {
        requesterId: aliceId,
        currentStatus: "IN_PROGRESS",
      },
    });

    const expectedResolved = await prisma.ticket.count({
      where: {
        requesterId: aliceId,
        currentStatus: "RESOLVED",
        updatedAt: { gte: startOfDay, lt: startOfNextDay },
      },
    });

    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAsRequester(page, "alice@example.com");

    // Navigate to Requester Dashboard
    const reqDashNav = page.getByTestId("nav-requester-dashboard");
    if (await reqDashNav.isVisible()) {
      await reqDashNav.click();
    }
    await expect(page.getByTestId("requester-dashboard-page")).toBeVisible();
    await expect(page.getByTestId("dashboard-welcome-heading")).toContainText(alice!.name);

    // Assert Authoritative Metric card values match exact DB calculation for Alice
    await expect(page.getByTestId("metric-open-count")).toHaveText(expectedOpen.toString());
    await expect(page.getByTestId("metric-waiting-count")).toHaveText(expectedWaiting.toString());
    await expect(page.getByTestId("metric-inprogress-count")).toHaveText(expectedInProgress.toString());
    await expect(page.getByTestId("metric-resolved-count")).toHaveText(expectedResolved.toString());

    // Strict Ownership Isolation: Ensure none of Bob's ticket numbers appear anywhere in Alice's dashboard
    for (const bNum of bobTicketNumbers) {
      await expect(page.getByText(bNum)).toHaveCount(0);
    }

    // Drill-Down 1: Click My Open Tickets card -> Navigates to My Tickets filtered by open
    const openCard = page.getByTestId("requester-metric-open");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets") && res.status() === 200),
      openCard.click(),
    ]);

    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    // Status filter should be set to "open"
    const statusSelect = page.locator("#filterStatus");
    await expect(statusSelect).toHaveValue("open");

    // Return to Requester Dashboard
    await page.getByTestId("nav-requester-dashboard").click();
    await expect(page.getByTestId("requester-dashboard-page")).toBeVisible();

    // Drill-Down 2: Click Waiting for Response card -> Navigates with WAITING_FOR_REQUESTER
    const waitingCard = page.getByTestId("requester-metric-waiting");
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/tickets") && res.status() === 200),
      waitingCard.click(),
    ]);

    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.locator("#filterStatus")).toHaveValue("WAITING_FOR_REQUESTER");

    // Return to Requester Dashboard
    await page.getByTestId("nav-requester-dashboard").click();
    await expect(page.getByTestId("requester-dashboard-page")).toBeVisible();

    // Drill-Down 3: Click Recently Resolved card -> Navigates with RESOLVED status filter
    const resolvedCard = page.getByTestId("requester-metric-resolved");
    const [resolvedReq] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/tickets/my-tickets")),
      resolvedCard.click(),
    ]);

    expect(resolvedReq.url()).toContain("currentStatus=RESOLVED");
    expect(resolvedReq.url()).toContain("resolvedWithinDays=30");

    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.locator("#filterStatus")).toHaveValue("RESOLVED");
  });

  // TEST 3: Administrator Dashboard Access without 403 Forbidden
  test("E2E-DASH-03: Administrator has Full Operational Dashboard and Queue Access (No 403)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAsAdmin(page);

    // Administrator lands on Staff Dashboard without 403 Forbidden
    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();
    await expect(page.getByTestId("staff-dashboard-forbidden")).toHaveCount(0);
    await expect(page.getByTestId("metric-cards-grid")).toBeVisible();

    // Administrator navigates to IT Queue without 403
    await page.getByTestId("nav-it-queue").click();
    await expect(page.getByTestId("staff-queue-page")).toBeVisible();
    await expect(page.getByText("Access Denied (403 Forbidden)")).toHaveCount(0);
  });

  // TEST 4: Multi-Viewport Responsive Adaptation & Evidence Capture (EVD-E2E-04)
  test("E2E-DASH-04: Multi-Viewport Responsive Verification & Evidence Capture (EVD-E2E-04)", async ({ page }) => {
    const viewports = [
      { name: "desktop", width: 1920, height: 1080 },
      { name: "tablet", width: 768, height: 1024 },
      { name: "mobile", width: 375, height: 812 },
    ];

    const evidenceData: Record<string, any> = {
      evidenceId: "EVD-E2E-04",
      title: "Operational Staff Dashboard Multi-Viewport Responsive Audit Evidence",
      timestamp: new Date().toISOString(),
      testedRoles: ["IT_STAFF"],
      roleCoverageNote: "Role-specific operational calculations and ownership isolation are proven in E2E-DASH-01 (IT_STAFF), E2E-DASH-02 (REQUESTER), and E2E-DASH-03 (ADMINISTRATOR)",
      viewports: [],
    };

    for (const vp of viewports) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await loginAsStaff(page);

      await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();
      await expect(page.getByTestId("metric-cards-grid")).toBeVisible();

      // Check for zero horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      evidenceData.viewports.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        hasHorizontalScroll,
        status: "PASS",
      });

      if (vp.name === "desktop") {
        await page.screenshot({
          path: path.join(artifactsBase, "EVD-E2E-04.png"),
          fullPage: false,
        });
      }
    }

    // Save evidence JSON
    fs.writeFileSync(
      path.join(artifactsBase, "EVD-E2E-04.json"),
      JSON.stringify(evidenceData, null, 2),
      "utf8"
    );
  });
});
