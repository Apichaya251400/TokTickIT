import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const viewports = [
  { name: "desktop", width: 1920, height: 1080 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 812 },
];

const artifactsBase = path.resolve(process.cwd(), "artifacts/lab-03/screenshots");

function ensureDirSync(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

test.describe("Visual QA Screenshot Capture Suite (21 Screenshots)", () => {
  test.beforeAll(() => {
    ensureDirSync(path.join(artifactsBase, "authentication"));
    ensureDirSync(path.join(artifactsBase, "staff-queue"));
    ensureDirSync(path.join(artifactsBase, "staff-ticket-detail"));
    ensureDirSync(path.join(artifactsBase, "user-management"));
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  // 1. Authentication - Login Screen (3 viewports)
  for (const vp of viewports) {
    test(`Capture Login Screen - ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
      await page.goto("/");

      // UI Assertion
      await expect(page.getByRole("heading", { name: /TokTick/i })).toBeVisible();
      await expect(page.locator("#login-email")).toBeVisible();
      await expect(page.locator("#login-password")).toBeVisible();

      await page.screenshot({
        path: path.join(artifactsBase, "authentication", `login-${vp.name}.png`),
        fullPage: false,
      });
    });
  }

  // 2. Authentication - Mandatory Password Change Screen (3 viewports)
  for (const vp of viewports) {
    test(`Capture Mandatory Password Change Screen - ${vp.name}`, async ({ page }) => {
      const targetEmail = "alice@example.com";
      const originalUser = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (!originalUser) throw new Error("Target user not found for password change screenshot test");

      try {
        // Force requiresPasswordChange = true
        await prisma.user.update({
          where: { email: targetEmail },
          data: { requiresPasswordChange: true },
        });

        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto("/");
        await page.evaluate(() => localStorage.clear());
        await page.goto("/");

        await page.fill("#login-email", targetEmail);
        await page.fill("#login-password", "InitialPassword123!");
        await page.click("button[type='submit']");

        // UI Assertion
        await expect(page.getByRole("heading", { name: /Mandatory Password Change/i })).toBeVisible();
        await expect(page.locator("#current-password")).toBeVisible();
        await expect(page.locator("#new-password")).toBeVisible();

        await page.screenshot({
          path: path.join(artifactsBase, "authentication", `password-change-${vp.name}.png`),
          fullPage: false,
        });
      } finally {
        // Restore DB state completely
        await prisma.user.update({
          where: { email: targetEmail },
          data: {
            requiresPasswordChange: originalUser.requiresPasswordChange,
            passwordHash: originalUser.passwordHash,
          },
        });
      }
    });
  }

  // Helper for IT Staff Context with Deterministic DB Cleanup
  async function withStaffContext(page: any, action: () => Promise<void>) {
    const staffEmail = "john.staff@toktick.it";
    const originalUser = await prisma.user.findUnique({ where: { email: staffEmail } });
    if (!originalUser) throw new Error("Staff user not found");

    try {
      await prisma.user.update({
        where: { email: staffEmail },
        data: { requiresPasswordChange: false },
      });
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
      await page.goto("/");
      await page.fill("#login-email", staffEmail);
      await page.fill("#login-password", "InitialPassword123!");
      await page.click("button[type='submit']");
      await expect(page.getByRole("heading", { name: /IT Staff Ticket Queue/i })).toBeVisible();

      await action();
    } finally {
      await prisma.user.update({
        where: { email: staffEmail },
        data: {
          requiresPasswordChange: originalUser.requiresPasswordChange,
          passwordHash: originalUser.passwordHash,
        },
      });
    }
  }

  // Helper for Admin Context with Deterministic DB Cleanup
  async function withAdminContext(page: any, action: () => Promise<void>) {
    const adminEmail = "admin@toktick.it";
    const originalUser = await prisma.user.findUnique({ where: { email: adminEmail } });
    if (!originalUser) throw new Error("Admin user not found");

    try {
      await prisma.user.update({
        where: { email: adminEmail },
        data: { requiresPasswordChange: false },
      });
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
      await page.goto("/");
      await page.fill("#login-email", adminEmail);
      await page.fill("#login-password", "InitialPassword123!");
      await page.click("button[type='submit']");
      await expect(page.getByRole("heading", { name: /User Management/i })).toBeVisible();

      await action();
    } finally {
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          requiresPasswordChange: originalUser.requiresPasswordChange,
          passwordHash: originalUser.passwordHash,
        },
      });
    }
  }

  // 3. Staff Ticket Queue Screen (3 viewports)
  for (const vp of viewports) {
    test(`Capture IT Staff Ticket Queue - ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await withStaffContext(page, async () => {
        // UI Assertion
        await expect(page.getByRole("heading", { name: /IT Staff Ticket Queue/i })).toBeVisible();

        await page.screenshot({
          path: path.join(artifactsBase, "staff-queue", `queue-${vp.name}.png`),
          fullPage: false,
        });
      });
    });
  }

  // 4. Staff Ticket Detail & Internal Notes Screens (3 viewports each)
  for (const vp of viewports) {
    test(`Capture Ticket Detail & Internal Notes - ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await withStaffContext(page, async () => {
        // Click first visible ticket item in queue
        const firstTicket = page.locator("[data-testid^='ticket-item-']:visible").first();
        await expect(firstTicket).toBeVisible();
        await firstTicket.click();

        // UI Assertion: Ticket Detail
        await expect(page.getByText("Summary & Description")).toBeVisible();

        // Screenshot 1: Public Comments Tab
        await page.screenshot({
          path: path.join(artifactsBase, "staff-ticket-detail", `ticket-detail-${vp.name}.png`),
          fullPage: false,
        });

        // Switch to Internal Notes tab
        await page.getByRole("button", { name: /Internal Notes/i }).click();
        await expect(page.getByTestId("internal-notes-section")).toBeVisible();

        // Screenshot 2: Internal Notes Tab
        await page.screenshot({
          path: path.join(artifactsBase, "staff-ticket-detail", `internal-notes-${vp.name}.png`),
          fullPage: false,
        });
      });
    });
  }

  // 5. User Management Table & Create User Modal (3 viewports each)
  for (const vp of viewports) {
    test(`Capture User Management & Modal - ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await withAdminContext(page, async () => {
        // UI Assertion: User Table
        await expect(page.getByRole("heading", { name: /User Management/i })).toBeVisible();
        await expect(page.getByText("admin@toktick.it")).toBeVisible();

        // Screenshot 1: User Management Table
        await page.screenshot({
          path: path.join(artifactsBase, "user-management", `user-admin-${vp.name}.png`),
          fullPage: false,
        });

        // Open Create User Modal
        await page.getByRole("button", { name: /Create New User/i }).click();
        await expect(page.getByRole("heading", { name: /Create New User/i })).toBeVisible();

        // Screenshot 2: Create User Modal
        await page.screenshot({
          path: path.join(artifactsBase, "user-management", `create-user-modal-${vp.name}.png`),
          fullPage: false,
        });
      });
    });
  }
});
