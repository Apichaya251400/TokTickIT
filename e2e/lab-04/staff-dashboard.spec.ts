import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { PrismaClient } from "../../server/node_modules/@prisma/client";

const prisma = new PrismaClient();
const artifactsBase = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/staff-dashboard");
const brainBase = "C:\\Users\\User\\.gemini\\antigravity\\brain\\17e6eb2a-bc47-4748-9e7b-93b9da7b5fed";

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyToBrain(filename: string) {
  try {
    const src = path.join(artifactsBase, filename);
    const dest = path.join(brainBase, filename);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, dest);
    }
  } catch (err) {
    console.error("Failed to copy to brain:", err);
  }
}

async function loginAsStaff(page: Page, email = "john.staff@toktick.it") {
  await page.context().clearCookies();
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const logoutBtn = page.getByRole("button", { name: "Logout" });
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page.waitForLoadState("domcontentloaded");
  }

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

test.describe("E2E-STAFFDASH: IT Staff & Administrator Dashboard (Issue #78 / Lab 4)", () => {
  let staffUser: any;
  let zeroUser: any;

  test.beforeAll(async () => {
    ensureDirSync(artifactsBase);

    // Disable password change for test users
    await prisma.user.updateMany({
      where: { email: { in: ["john.staff@toktick.it", "staff@toktick.it", "admin@toktick.it", "alice@example.com"] } },
      data: { requiresPasswordChange: false },
    });

    staffUser = await prisma.user.findFirstOrThrow({
      where: { email: "staff@toktick.it" },
    });

    // Ensure at least 1 unassigned active ticket exists
    const unassignedTicket = await prisma.ticket.findFirst({
      where: { ownerId: null, currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] } },
    });
    if (!unassignedTicket) {
      const category = await prisma.category.findFirstOrThrow();
      const system = await prisma.relatedSystem.findFirstOrThrow();
      const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER" } });
      const num = (Date.now() % 700000 + 100000).toString().padStart(6, "0");
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${num}`,
          requesterId: requester.id,
          ownerId: null,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: "MEDIUM",
          itPriority: "HIGH",
          summary: "E2E Staff Dashboard Unassigned Ticket",
          description: "Unassigned ticket for staff dashboard testing",
          currentStatus: "OPEN",
        },
      });
    }

    // Ensure staffUser has at least 1 assigned ticket in an active urgent state
    let assignedTicket = await prisma.ticket.findFirst({
      where: { ownerId: staffUser.id },
    });

    if (!assignedTicket) {
      const category = await prisma.category.findFirstOrThrow();
      const system = await prisma.relatedSystem.findFirstOrThrow();
      const requester = await prisma.user.findFirstOrThrow({ where: { role: "REQUESTER" } });
      const num = (Date.now() % 700000 + 200000).toString().padStart(6, "0");

      assignedTicket = await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${num}`,
          requesterId: requester.id,
          ownerId: staffUser.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: "HIGH",
          itPriority: "URGENT",
          summary: "E2E Staff Dashboard Assigned Ticket",
          description: "Assigned ticket for staff dashboard testing",
          currentStatus: "IN_PROGRESS",
        },
      });
    } else if (assignedTicket.itPriority !== "URGENT" || ["RESOLVED", "CLOSED", "CANCELLED"].includes(assignedTicket.currentStatus)) {
      assignedTicket = await prisma.ticket.update({
        where: { id: assignedTicket.id },
        data: { itPriority: "URGENT", currentStatus: "IN_PROGRESS" },
      });
    }

    // Ensure staffUser has at least 1 action recorded today (Asia/Bangkok boundary)
    await prisma.actionTaken.create({
      data: {
        ticketId: assignedTicket.id,
        performedById: staffUser.id,
        description: "E2E Verified hardware connectivity today",
        result: "All diagnostics passed",
        status: "COMPLETED",
        createdAt: new Date(),
      },
    });

    const anyUser = await prisma.user.findFirstOrThrow();
    const validPasswordHash = anyUser.passwordHash;

    // Create a dedicated zero-workload staff user
    zeroUser = await prisma.user.upsert({
      where: { email: "zero.workload@toktick.it" },
      update: { requiresPasswordChange: false, isActive: true, passwordHash: validPasswordHash },
      create: {
        name: "Zero Workload Staff",
        email: "zero.workload@toktick.it",
        passwordHash: validPasswordHash,
        role: "IT_STAFF",
        isActive: true,
        requiresPasswordChange: false,
      },
    });

    // Clean up any stray tickets or actions from zeroUser
    await prisma.ticket.updateMany({
      where: { ownerId: zeroUser.id },
      data: { ownerId: null },
    });
    await prisma.actionTaken.deleteMany({
      where: { performedById: zeroUser.id },
    });
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // ---------------------------------------------------------------------------
  // EVD-STAFFDASH-01: Desktop Staff Dashboard Screenshot
  // ---------------------------------------------------------------------------
  test("E2E-STAFFDASH-01: Desktop Viewport Staff Dashboard (EVD-STAFFDASH-01)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAsStaff(page, staffUser.email);

    // Expect Staff Dashboard page to be rendered
    const dashboardPage = page.getByTestId("staff-dashboard-page");
    await expect(dashboardPage).toBeVisible({ timeout: 10000 });

    // Verify Welcome Header
    await expect(page.getByTestId("dashboard-welcome-heading")).toContainText(staffUser.name);

    // Verify 4 Metric Cards
    await expect(page.getByTestId("metric-unassigned-card")).toBeVisible();
    await expect(page.getByTestId("metric-my-assigned-card")).toBeVisible();
    await expect(page.getByTestId("metric-today-actions-card")).toBeVisible();
    await expect(page.getByTestId("metric-urgent-workload-card")).toBeVisible();

    // Responsive Desktop Assertion: 4 cards rendered in a single horizontal row (similar y baseline)
    const dBox1 = await page.getByTestId("metric-unassigned-card").boundingBox();
    const dBox2 = await page.getByTestId("metric-my-assigned-card").boundingBox();
    const dBox3 = await page.getByTestId("metric-today-actions-card").boundingBox();
    const dBox4 = await page.getByTestId("metric-urgent-workload-card").boundingBox();

    expect(dBox1).not.toBeNull();
    expect(dBox2).not.toBeNull();
    expect(dBox3).not.toBeNull();
    expect(dBox4).not.toBeNull();

    expect(Math.abs(dBox1!.y - dBox2!.y)).toBeLessThan(15);
    expect(Math.abs(dBox2!.y - dBox3!.y)).toBeLessThan(15);
    expect(Math.abs(dBox3!.y - dBox4!.y)).toBeLessThan(15);

    // Verify My Recent Workload & Actions feed
    await expect(page.getByTestId("my-recent-workload-section")).toBeVisible();
    await expect(page.getByTestId("quick-actions-section")).toBeVisible();
    await expect(page.getByTestId("recent-actions-section")).toBeVisible();

    // Capture Evidence EVD-STAFFDASH-01 (fullPage: true to capture complete workload tables and actions)
    const screenshotPath = path.join(artifactsBase, "EVD-STAFFDASH-01.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    copyToBrain("EVD-STAFFDASH-01.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-STAFFDASH-02: Tablet and Mobile Viewports
  // ---------------------------------------------------------------------------
  test("E2E-STAFFDASH-02: Tablet & Mobile Responsive Layouts (EVD-STAFFDASH-02)", async ({ page }) => {
    // 1. Tablet Viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await loginAsStaff(page, staffUser.email);

    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();

    // Tablet Responsive Assertion: 2x2 grid (cards 1 and 2 side-by-side, cards 3 and 4 below)
    const tBox1 = await page.getByTestId("metric-unassigned-card").boundingBox();
    const tBox2 = await page.getByTestId("metric-my-assigned-card").boundingBox();
    const tBox3 = await page.getByTestId("metric-today-actions-card").boundingBox();
    const tBox4 = await page.getByTestId("metric-urgent-workload-card").boundingBox();

    expect(tBox1).not.toBeNull();
    expect(tBox2).not.toBeNull();
    expect(tBox3).not.toBeNull();
    expect(tBox4).not.toBeNull();

    // Card 1 and 2 are on top row side-by-side
    expect(Math.abs(tBox1!.y - tBox2!.y)).toBeLessThan(15);
    // Card 3 and 4 are on bottom row side-by-side
    expect(Math.abs(tBox3!.y - tBox4!.y)).toBeLessThan(15);
    // Card 3 is below Card 1
    expect(tBox3!.y).toBeGreaterThan(tBox1!.y + tBox1!.height - 10);

    const tabletPath = path.join(artifactsBase, "EVD-STAFFDASH-02-tablet.png");
    await page.screenshot({ path: tabletPath, fullPage: false });
    copyToBrain("EVD-STAFFDASH-02-tablet.png");

    // 2. Mobile Viewport (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();

    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();

    // Mobile Responsive Assertion: single column vertically stacked
    const mBox1 = await page.getByTestId("metric-unassigned-card").boundingBox();
    const mBox2 = await page.getByTestId("metric-my-assigned-card").boundingBox();
    const mBox3 = await page.getByTestId("metric-today-actions-card").boundingBox();
    const mBox4 = await page.getByTestId("metric-urgent-workload-card").boundingBox();

    expect(mBox1).not.toBeNull();
    expect(mBox2).not.toBeNull();
    expect(mBox3).not.toBeNull();
    expect(mBox4).not.toBeNull();

    // Staced vertically
    expect(mBox2!.y).toBeGreaterThan(mBox1!.y + mBox1!.height - 10);
    expect(mBox3!.y).toBeGreaterThan(mBox2!.y + mBox2!.height - 10);
    expect(mBox4!.y).toBeGreaterThan(mBox3!.y + mBox3!.height - 10);

    const mobilePath = path.join(artifactsBase, "EVD-STAFFDASH-02-mobile.png");
    await page.screenshot({ path: mobilePath, fullPage: false });
    copyToBrain("EVD-STAFFDASH-02-mobile.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-STAFFDASH-03: Non-Zero Metric Cards Evidence
  // ---------------------------------------------------------------------------
  test("E2E-STAFFDASH-03: Non-Zero Operational Metric Cards (EVD-STAFFDASH-03)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsStaff(page, staffUser.email);

    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();

    // Verify non-zero counts for all 4 metric cards
    const unassignedCount = await page.getByTestId("metric-unassigned-count").innerText();
    expect(Number(unassignedCount)).toBeGreaterThanOrEqual(1);

    const myAssignedCount = await page.getByTestId("metric-my-assigned-count").innerText();
    expect(Number(myAssignedCount)).toBeGreaterThanOrEqual(1);

    const todayActionsCount = await page.getByTestId("metric-today-actions-count").innerText();
    expect(Number(todayActionsCount)).toBeGreaterThanOrEqual(1);

    const urgentWorkloadCount = await page.getByTestId("metric-urgent-workload-count").innerText();
    expect(Number(urgentWorkloadCount)).toBeGreaterThanOrEqual(1);

    const nonZeroPath = path.join(artifactsBase, "EVD-STAFFDASH-03.png");
    await page.screenshot({ path: nonZeroPath, fullPage: false });
    copyToBrain("EVD-STAFFDASH-03.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-STAFFDASH-04: Zero-Count Empty States Evidence
  // ---------------------------------------------------------------------------
  test("E2E-STAFFDASH-04: Zero-Count Empty States (EVD-STAFFDASH-04)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsStaff(page, "zero.workload@toktick.it");

    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();

    // Verify 0 count for assigned and actions
    await expect(page.getByTestId("metric-my-assigned-count")).toHaveText("0");
    await expect(page.getByTestId("metric-today-actions-count")).toHaveText("0");

    // Verify empty state messages
    await expect(page.getByTestId("empty-recent-tickets")).toContainText("No recent tickets");
    await expect(page.getByTestId("empty-recent-actions")).toContainText("No recent actions recorded");

    const zeroPath = path.join(artifactsBase, "EVD-STAFFDASH-04.png");
    await page.screenshot({ path: zeroPath, fullPage: false });
    copyToBrain("EVD-STAFFDASH-04.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-STAFFDASH-05: Drill-Down Navigation Evidence & Active Workload Semantics
  // ---------------------------------------------------------------------------
  test("E2E-STAFFDASH-05: Drill-Down Navigation to Queue and Detail (EVD-STAFFDASH-05)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsStaff(page, staffUser.email);

    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();

    // 1. Click Today's Actions Card -> Navigates to Queue with view=today_actions
    await page.getByTestId("metric-today-actions-card").click();

    // Verify Staff Ticket Queue is rendered with view=today_actions banner
    await expect(page.getByTestId("staff-queue-page")).toBeVisible();
    await expect(page.getByTestId("view-today-actions-banner")).toBeVisible();

    const drilldownPath = path.join(artifactsBase, "EVD-STAFFDASH-05.png");
    await page.screenshot({ path: drilldownPath, fullPage: false });
    copyToBrain("EVD-STAFFDASH-05.png");

    // 2. Click Urgent Workload Card -> Navigates to Queue with view=urgent_workload
    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();
    await page.getByTestId("metric-urgent-workload-card").click();
    await expect(page.getByTestId("staff-queue-page")).toBeVisible();
    await expect(page.getByTestId("view-urgent-workload-banner")).toBeVisible();

    // 3. Click Unassigned Tickets Card -> Navigates to Queue with view=unassigned_active
    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();
    await page.getByTestId("metric-unassigned-card").click();
    await expect(page.getByTestId("staff-queue-page")).toBeVisible();
    await expect(page.getByTestId("view-unassigned-active-banner")).toBeVisible();

    // 4. Click My Assigned Tickets Card -> Navigates to Queue with view=my_queue_active
    await page.getByRole("button", { name: "Dashboard" }).click();
    await expect(page.getByTestId("staff-dashboard-page")).toBeVisible();
    await page.getByTestId("metric-my-assigned-card").click();
    await expect(page.getByTestId("staff-queue-page")).toBeVisible();
    await expect(page.getByTestId("view-my-queue-active-banner")).toBeVisible();
  });

  // ---------------------------------------------------------------------------
  // EVD-STAFFDASH-06: Backend Query Response JSON Evidence & Database Parity
  // ---------------------------------------------------------------------------
  test("E2E-STAFFDASH-06: Backend Query & Calculation Response JSON (EVD-STAFFDASH-06)", async ({ request }) => {
    // Authenticate via API
    const loginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: staffUser.email,
        password: "InitialPassword123!",
      },
    });

    expect(loginRes.status()).toBe(200);

    const dashboardRes = await request.get("http://localhost:3000/api/dashboards/staff");
    expect(dashboardRes.status()).toBe(200);

    const json = await dashboardRes.json();
    expect(json).toHaveProperty("metrics");
    expect(json).toHaveProperty("myRecentTickets");
    expect(json).toHaveProperty("currentStaffActions");

    // Compute expected database query counts with Asia/Bangkok boundaries
    const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
    const now = new Date();
    const localTime = new Date(now.getTime() + BANGKOK_OFFSET_MS);
    const year = localTime.getUTCFullYear();
    const month = localTime.getUTCMonth();
    const day = localTime.getUTCDate();
    const startOfDay = new Date(Date.UTC(year, month, day, 0, 0, 0, 0) - BANGKOK_OFFSET_MS);
    const startOfNextDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0) - BANGKOK_OFFSET_MS);

    const expectedUnassigned = await prisma.ticket.count({
      where: {
        ownerId: null,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });

    const expectedMyAssigned = await prisma.ticket.count({
      where: {
        ownerId: staffUser.id,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });

    const expectedTodayActions = await prisma.actionTaken.count({
      where: {
        performedById: staffUser.id,
        createdAt: { gte: startOfDay, lt: startOfNextDay },
      },
    });

    const expectedUrgent = await prisma.ticket.count({
      where: {
        itPriority: "URGENT",
        currentStatus: { in: ["NEW", "OPEN", "IN_PROGRESS"] },
      },
    });

    // Assert exact parity between direct database query and backend dashboard API
    expect(json.metrics.unassignedCount).toBe(expectedUnassigned);
    expect(json.metrics.myAssignedCount).toBe(expectedMyAssigned);
    expect(json.metrics.todayActionsCount).toBe(expectedTodayActions);
    expect(json.metrics.urgentWorkloadCount).toBe(expectedUrgent);

    const evidencePayload = {
      queryVerification: {
        unassignedCount: {
          expectedDbQuery: expectedUnassigned,
          actualApiResponse: json.metrics.unassignedCount,
          match: expectedUnassigned === json.metrics.unassignedCount,
        },
        myAssignedCount: {
          expectedDbQuery: expectedMyAssigned,
          actualApiResponse: json.metrics.myAssignedCount,
          match: expectedMyAssigned === json.metrics.myAssignedCount,
        },
        todayActionsCount: {
          expectedDbQuery: expectedTodayActions,
          actualApiResponse: json.metrics.todayActionsCount,
          match: expectedTodayActions === json.metrics.todayActionsCount,
        },
        urgentWorkloadCount: {
          expectedDbQuery: expectedUrgent,
          actualApiResponse: json.metrics.urgentWorkloadCount,
          match: expectedUrgent === json.metrics.urgentWorkloadCount,
        },
      },
      apiResponse: json,
    };

    // Write Evidence JSON
    const jsonPath = path.join(artifactsBase, "EVD-STAFFDASH-06.json");
    fs.writeFileSync(jsonPath, JSON.stringify(evidencePayload, null, 2), "utf8");
    copyToBrain("EVD-STAFFDASH-06.json");
  });

  // ---------------------------------------------------------------------------
  // E2E-STAFFDASH-07: Administrator Dashboard & Queue Drill-Down Flow
  // ---------------------------------------------------------------------------
  test("E2E-STAFFDASH-07: Administrator Dashboard & Queue Drill-Down Flow (No 403)", async ({ page, request }) => {
    // 1. Admin login & dashboard verification
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsStaff(page, "admin@toktick.it");

    const dashboardPage = page.getByTestId("staff-dashboard-page");
    await expect(dashboardPage).toBeVisible({ timeout: 10000 });

    const adminUser = await prisma.user.findFirstOrThrow({ where: { email: "admin@toktick.it" } });
    await expect(page.getByTestId("dashboard-welcome-heading")).toContainText(adminUser.name);
    await expect(dashboardPage.getByText("ADMINISTRATOR")).toBeVisible();

    // 2. Click Unassigned Metric Card to drill-down to Queue
    await page.getByTestId("metric-unassigned-card").click();

    // Verify Staff Ticket Queue is rendered
    const queuePage = page.getByTestId("staff-queue-page");
    await expect(queuePage).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("view-unassigned-active-banner")).toBeVisible();

    // Ensure NO 403 Forbidden alert or access denied messages are displayed to Administrator
    await expect(page.locator(".alert-danger")).not.toBeVisible();
    await expect(page.getByText(/Access denied/i)).not.toBeVisible();

    // 3. Verify Requester cannot access Staff Dashboard API (403 Forbidden)
    const requesterLoginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: "alice@example.com",
        password: "InitialPassword123!",
      },
    });
    expect(requesterLoginRes.status()).toBe(200);

    const requesterDashRes = await request.get("http://localhost:3000/api/dashboards/staff");
    expect(requesterDashRes.status()).toBe(403);
    const reqJson = await requesterDashRes.json();
    expect(reqJson.error).toBe("FORBIDDEN");

    // 4. Verify Requester UI does not render Dashboard navigation tab
    await loginAsStaff(page, "alice@example.com");
    await expect(page.getByRole("button", { name: "Dashboard" })).not.toBeVisible();
    await expect(page.getByRole("button", { name: "My Tickets" })).toBeVisible();
  });
});
