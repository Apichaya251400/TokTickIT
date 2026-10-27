import { test, expect, Page } from "@playwright/test";
import path from "path";
import fs from "fs";
import { PrismaClient } from "../../server/node_modules/@prisma/client";

const prisma = new PrismaClient();
const artifactsBase = path.resolve(process.cwd(), "artifacts/lab-04/screenshots/requester-dashboard");
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

async function loginAsUser(page: Page, email: string, password = "InitialPassword123!") {
  await page.context().clearCookies();
  await page.goto("/");
  await page.waitForLoadState("domcontentloaded");

  const logoutBtn = page.getByRole("button", { name: "Logout" });
  if (await logoutBtn.isVisible().catch(() => false)) {
    await logoutBtn.click();
    await page.waitForLoadState("domcontentloaded");
  }

  await page.fill("#login-email", email);
  await page.fill("#login-password", password);

  await Promise.all([
    page.waitForResponse((res) => res.url().includes("/api/auth/login")),
    page.click("button[type='submit']"),
  ]);

  if (await page.getByRole("heading", { name: /Mandatory Password Change/i }).isVisible().catch(() => false)) {
    await page.fill("#current-password", password);
    await page.fill("#new-password", password);
    await page.fill("#confirm-password", password);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/auth/change-password")),
      page.click("button[type='submit']"),
    ]);
  }
}

test.describe("E2E-REQBDASH: Requester Dashboard & Workload Overview (Issue #79 / LAB4-08)", () => {
  let aliceUser: any;
  let zeroUser: any;
  let staffUser: any;

  test.beforeAll(async () => {
    ensureDirSync(artifactsBase);

    // Disable password change for test users
    await prisma.user.updateMany({
      where: {
        email: {
          in: [
            "alice@example.com",
            "staff@toktick.it",
            "admin@toktick.it",
            "zero.requester@example.com",
          ],
        },
      },
      data: { requiresPasswordChange: false },
    });

    aliceUser = await prisma.user.findFirstOrThrow({
      where: { email: "alice@example.com" },
    });
    staffUser = await prisma.user.findFirstOrThrow({
      where: { email: "staff@toktick.it" },
    });

    // Ensure zero-ticket user exists
    zeroUser = await prisma.user.findFirst({
      where: { email: "zero.requester@example.com" },
    });
    if (!zeroUser) {
      zeroUser = await prisma.user.create({
        data: {
          name: "Zero Requester",
          email: "zero.requester@example.com",
          passwordHash: aliceUser.passwordHash,
          role: "REQUESTER",
          isActive: true,
          requiresPasswordChange: false,
        },
      });
    }

    // Clean up any tickets for zeroUser to guarantee 0 workload
    await prisma.ticket.deleteMany({
      where: { requesterId: zeroUser.id },
    });

    // Ensure Alice has at least 1 ticket in WAITING_FOR_REQUESTER
    const waitingTicket = await prisma.ticket.findFirst({
      where: { requesterId: aliceUser.id, currentStatus: "WAITING_FOR_REQUESTER" },
    });
    const category = await prisma.category.findFirstOrThrow();
    const system = await prisma.relatedSystem.findFirstOrThrow();

    if (!waitingTicket) {
      const num = (Date.now() % 700000 + 100000).toString().padStart(6, "0");
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${num}`,
          requesterId: aliceUser.id,
          ownerId: staffUser.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: "HIGH",
          summary: "E2E Attention Required Ticket (Needs Requester Response)",
          description: "Waiting for user feedback on ticket resolution steps",
          currentStatus: "WAITING_FOR_REQUESTER",
        },
      });
    }

    // Ensure Alice has at least 1 ticket in RESOLVED within the last 30 days
    const resolvedTicket = await prisma.ticket.findFirst({
      where: { requesterId: aliceUser.id, currentStatus: "RESOLVED" },
    });
    if (!resolvedTicket) {
      const num = (Date.now() % 700000 + 200000).toString().padStart(6, "0");
      await prisma.ticket.create({
        data: {
          ticketNumber: `TKT-2026-${num}`,
          requesterId: aliceUser.id,
          ownerId: staffUser.id,
          categoryId: category.id,
          relatedSystemId: system.id,
          requestedPriority: "MEDIUM",
          summary: "E2E Recently Resolved Ticket",
          description: "Recently resolved support ticket",
          currentStatus: "RESOLVED",
          updatedAt: new Date(),
        },
      });
    }
  });

  // ---------------------------------------------------------------------------
  // EVD-REQBDASH-01: Full Desktop Dashboard Overview (1920x1080)
  // ---------------------------------------------------------------------------
  test("E2E-REQBDASH-01: Desktop Viewport Layout & Overview (EVD-REQBDASH-01)", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await loginAsUser(page, aliceUser.email);

    // Navigate to Requester Dashboard
    const dashboardTab = page.getByTestId("nav-requester-dashboard");
    await expect(dashboardTab).toBeVisible({ timeout: 10000 });
    await dashboardTab.click();

    // Verify Dashboard page elements
    const dashboardPage = page.getByTestId("requester-dashboard-page");
    await expect(dashboardPage).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("loading-spinner")).not.toBeVisible();

    // Verify Welcome Header
    const heading = page.getByTestId("dashboard-welcome-heading");
    await expect(heading).toContainText("Welcome back, Alice Smith!");
    await expect(dashboardPage.getByText("REQUESTER", { exact: true })).toBeVisible();

    // Verify Quick Action button
    await expect(page.getByTestId("create-ticket-action")).toBeVisible();

    // Verify 4 Metric Cards
    await expect(page.getByTestId("requester-metric-open")).toBeVisible();
    await expect(page.getByTestId("requester-metric-waiting")).toBeVisible();
    await expect(page.getByTestId("requester-metric-inprogress")).toBeVisible();
    await expect(page.getByTestId("requester-metric-resolved")).toBeVisible();

    // Verify Sections
    await expect(page.getByTestId("attention-required-section")).toBeVisible();
    await expect(page.getByTestId("recent-tickets-section")).toBeVisible();

    // Capture Full Page Screenshot
    const screenshotPath = path.join(artifactsBase, "EVD-REQBDASH-01.png");
    await page.screenshot({ path: screenshotPath, fullPage: true });
    copyToBrain("EVD-REQBDASH-01.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-REQBDASH-02: Responsive Layout Adaptation (Tablet & Mobile)
  // ---------------------------------------------------------------------------
  test("E2E-REQBDASH-02: Responsive Layout Adaptation (EVD-REQBDASH-02-tablet & mobile)", async ({ page }) => {
    await loginAsUser(page, aliceUser.email);
    await page.getByTestId("nav-requester-dashboard").click();
    await expect(page.getByTestId("requester-dashboard-page")).toBeVisible();

    // 1. Tablet Viewport (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(300);

    await expect(page.getByTestId("requester-metric-open")).toBeVisible();
    await expect(page.getByTestId("requester-metric-waiting")).toBeVisible();

    const tabletPath = path.join(artifactsBase, "EVD-REQBDASH-02-tablet.png");
    await page.screenshot({ path: tabletPath, fullPage: false });
    copyToBrain("EVD-REQBDASH-02-tablet.png");

    // 2. Mobile Viewport (375x812)
    await page.setViewportSize({ width: 375, height: 812 });
    await page.waitForTimeout(300);

    await expect(page.getByTestId("requester-dashboard-page")).toBeVisible();

    // Mobile Responsive Assertion: cards stack vertically
    const mBox1 = await page.getByTestId("requester-metric-open").boundingBox();
    const mBox2 = await page.getByTestId("requester-metric-waiting").boundingBox();
    const mBox3 = await page.getByTestId("requester-metric-inprogress").boundingBox();
    const mBox4 = await page.getByTestId("requester-metric-resolved").boundingBox();

    expect(mBox1).not.toBeNull();
    expect(mBox2).not.toBeNull();
    expect(mBox3).not.toBeNull();
    expect(mBox4).not.toBeNull();

    expect(mBox2!.y).toBeGreaterThan(mBox1!.y + mBox1!.height - 10);
    expect(mBox3!.y).toBeGreaterThan(mBox2!.y + mBox2!.height - 10);
    expect(mBox4!.y).toBeGreaterThan(mBox3!.y + mBox3!.height - 10);

    const mobilePath = path.join(artifactsBase, "EVD-REQBDASH-02-mobile.png");
    await page.screenshot({ path: mobilePath, fullPage: false });
    copyToBrain("EVD-REQBDASH-02-mobile.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-REQBDASH-03: Authoritative Backend Query JSON & Database Parity Evidence
  // ---------------------------------------------------------------------------
  test("E2E-REQBDASH-03: Authoritative Backend Query JSON (EVD-REQBDASH-03)", async ({ request }) => {
    // Authenticate as Alice
    const loginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: aliceUser.email,
        password: "InitialPassword123!",
      },
    });
    expect(loginRes.status()).toBe(200);

    const dashboardRes = await request.get("http://localhost:3000/api/dashboards/requester");
    expect(dashboardRes.status()).toBe(200);

    const json = await dashboardRes.json();
    expect(json).toHaveProperty("metrics");
    expect(json).toHaveProperty("recentTickets");
    expect(json).toHaveProperty("attentionRequiredTickets");

    // Compute expected database query counts with Asia/Bangkok boundaries
    const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
    const now = new Date();
    const localTime = new Date(now.getTime() + BANGKOK_OFFSET_MS);
    const year = localTime.getUTCFullYear();
    const month = localTime.getUTCMonth();
    const day = localTime.getUTCDate();
    const startOfNextDay = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0) - BANGKOK_OFFSET_MS);
    const startOfPast30Days = new Date(Date.UTC(year, month, day - 29, 0, 0, 0, 0) - BANGKOK_OFFSET_MS);

    const expectedOpen = await prisma.ticket.count({
      where: {
        requesterId: aliceUser.id,
        currentStatus: { notIn: ["RESOLVED", "CLOSED", "CANCELLED"] },
      },
    });

    const expectedWaiting = await prisma.ticket.count({
      where: {
        requesterId: aliceUser.id,
        currentStatus: "WAITING_FOR_REQUESTER",
      },
    });

    const expectedInProgress = await prisma.ticket.count({
      where: {
        requesterId: aliceUser.id,
        currentStatus: "IN_PROGRESS",
      },
    });

    const expectedResolved = await prisma.ticket.count({
      where: {
        requesterId: aliceUser.id,
        currentStatus: "RESOLVED",
        updatedAt: { gte: startOfPast30Days, lt: startOfNextDay },
      },
    });

    // Assert exact parity between database count queries and API response
    expect(json.metrics.openTicketsCount).toBe(expectedOpen);
    expect(json.metrics.waitingForRequesterCount).toBe(expectedWaiting);
    expect(json.metrics.inProgressCount).toBe(expectedInProgress);
    expect(json.metrics.recentlyResolvedCount).toBe(expectedResolved);

    const evidencePayload = {
      queryVerification: {
        openTicketsCount: {
          expectedDbQuery: expectedOpen,
          actualApiResponse: json.metrics.openTicketsCount,
          match: expectedOpen === json.metrics.openTicketsCount,
        },
        waitingForRequesterCount: {
          expectedDbQuery: expectedWaiting,
          actualApiResponse: json.metrics.waitingForRequesterCount,
          match: expectedWaiting === json.metrics.waitingForRequesterCount,
        },
        inProgressCount: {
          expectedDbQuery: expectedInProgress,
          actualApiResponse: json.metrics.inProgressCount,
          match: expectedInProgress === json.metrics.inProgressCount,
        },
        recentlyResolvedCount: {
          expectedDbQuery: expectedResolved,
          actualApiResponse: json.metrics.recentlyResolvedCount,
          match: expectedResolved === json.metrics.recentlyResolvedCount,
        },
      },
      apiResponse: json,
    };

    const jsonPath = path.join(artifactsBase, "EVD-REQBDASH-03.json");
    fs.writeFileSync(jsonPath, JSON.stringify(evidencePayload, null, 2), "utf8");
    copyToBrain("EVD-REQBDASH-03.json");
  });

  // ---------------------------------------------------------------------------
  // EVD-REQBDASH-04: Drill-Down to My Open Tickets (status=open)
  // ---------------------------------------------------------------------------
  test("E2E-REQBDASH-04: Drill-Down Navigation to My Open Tickets (EVD-REQBDASH-04)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsUser(page, aliceUser.email);

    await page.getByTestId("nav-requester-dashboard").click();
    await expect(page.getByTestId("requester-dashboard-page")).toBeVisible();

    // Click My Open Tickets card
    await page.getByTestId("requester-metric-open").click();

    // Verify navigation to My Tickets view
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    // Verify filterStatus is set to "open"
    const statusSelect = page.locator("#filterStatus");
    await expect(statusSelect).toHaveValue("open");

    // Capture screenshot
    const openPath = path.join(artifactsBase, "EVD-REQBDASH-04.png");
    await page.screenshot({ path: openPath, fullPage: false });
    copyToBrain("EVD-REQBDASH-04.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-REQBDASH-05: Drill-Down to Waiting for My Response
  // ---------------------------------------------------------------------------
  test("E2E-REQBDASH-05: Drill-Down Navigation to Waiting for Response (EVD-REQBDASH-05)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsUser(page, aliceUser.email);

    await page.getByTestId("nav-requester-dashboard").click();
    await expect(page.getByTestId("requester-dashboard-page")).toBeVisible();

    // Click Waiting for My Response card
    await page.getByTestId("requester-metric-waiting").click();

    // Verify navigation to My Tickets view
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();

    // Verify filterStatus is set to "WAITING_FOR_REQUESTER"
    const statusSelect = page.locator("#filterStatus");
    await expect(statusSelect).toHaveValue("WAITING_FOR_REQUESTER");

    // Capture screenshot
    const waitingPath = path.join(artifactsBase, "EVD-REQBDASH-05.png");
    await page.screenshot({ path: waitingPath, fullPage: false });
    copyToBrain("EVD-REQBDASH-05.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-REQBDASH-06: Zero-Count Workload & Empty States Evidence
  // ---------------------------------------------------------------------------
  test("E2E-REQBDASH-06: Zero-Count Workload & Empty States (EVD-REQBDASH-06)", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsUser(page, zeroUser.email);

    await page.getByTestId("nav-requester-dashboard").click();
    await expect(page.getByTestId("requester-dashboard-page")).toBeVisible();

    // Verify all 4 cards display "0"
    await expect(page.getByTestId("metric-open-count")).toHaveText("0");
    await expect(page.getByTestId("metric-waiting-count")).toHaveText("0");
    await expect(page.getByTestId("metric-inprogress-count")).toHaveText("0");
    await expect(page.getByTestId("metric-resolved-count")).toHaveText("0");

    // Verify empty state messages
    await expect(page.getByTestId("empty-attention-tickets")).toContainText(
      "No tickets require your attention at this time"
    );
    await expect(page.getByTestId("empty-recent-tickets")).toContainText("No recent tickets");

    const zeroPath = path.join(artifactsBase, "EVD-REQBDASH-06.png");
    await page.screenshot({ path: zeroPath, fullPage: false });
    copyToBrain("EVD-REQBDASH-06.png");
  });

  // ---------------------------------------------------------------------------
  // EVD-REQBDASH-07: Role Authorization & Forbidden 403 Alert Evidence
  // ---------------------------------------------------------------------------
  test("E2E-REQBDASH-07: Role Authorization 403 Forbidden State (EVD-REQBDASH-07)", async ({ page, request }) => {
    // 1. Verify IT Staff is rejected with 403 Forbidden on Requester Dashboard API
    const staffLoginRes = await request.post("http://localhost:3000/api/auth/login", {
      data: {
        email: staffUser.email,
        password: "InitialPassword123!",
      },
    });
    expect(staffLoginRes.status()).toBe(200);

    const staffDashRes = await request.get("http://localhost:3000/api/dashboards/requester");
    expect(staffDashRes.status()).toBe(403);
    const errJson = await staffDashRes.json();
    expect(errJson.error).toBe("FORBIDDEN");

    // 2. In Browser: render 403 Forbidden state UI
    await page.setViewportSize({ width: 1440, height: 900 });
    await loginAsUser(page, aliceUser.email);

    // Intercept /api/dashboards/requester to simulate 403 Forbidden
    await page.route("**/api/dashboards/requester", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({
          error: "FORBIDDEN",
          message: "You do not have permission to access the Requester Dashboard.",
        }),
      });
    });

    await page.getByTestId("nav-requester-dashboard").click();

    // Verify Forbidden alert is visible
    const forbiddenAlert = page.getByTestId("requester-dashboard-forbidden");
    await expect(forbiddenAlert).toBeVisible({ timeout: 10000 });
    await expect(forbiddenAlert).toContainText("Access Denied (403 Forbidden)");

    const forbiddenPath = path.join(artifactsBase, "EVD-REQBDASH-07.png");
    await page.screenshot({ path: forbiddenPath, fullPage: false });
    copyToBrain("EVD-REQBDASH-07.png");
  });
});
