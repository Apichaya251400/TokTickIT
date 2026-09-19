import { test, expect, Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function loginAsAdmin(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.fill("#login-email", "admin@toktick.it");
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

test.describe("E2E-03: User Administration & Safety Guards (Lab 3)", () => {
  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("AC-ADMIN-01: Create New System User", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    await page.getByTestId("create-user-btn").click();
    await expect(page.getByTestId("create-user-modal")).toBeVisible();

    const timestamp = Date.now();
    const testEmail = `e2e.user.${timestamp}@toktick.it`;
    const testName = `E2E Test User ${timestamp}`;

    await page.getByTestId("user-form-name").fill(testName);
    await page.getByTestId("user-form-email").fill(testEmail);
    await page.getByTestId("user-form-role").selectOption("IT_STAFF");
    await page.getByTestId("user-form-password").fill("InitialPassword123!");

    await Promise.all([
      page.waitForResponse((res) => res.url().endsWith("/api/admin/users") && res.request().method() === "POST"),
      page.getByTestId("submit-user-btn").click(),
    ]);

    await expect(page.getByTestId("admin-success-alert")).toBeVisible();
    await expect(page.getByText(testEmail).first()).toBeVisible();
  });

  test("AC-ADMIN-02: Edit User Details and Role Assignment", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    const searchInput = page.getByTestId("admin-user-search-input");
    await searchInput.fill("Eve Adams");

    const editBtn = page.getByRole("button", { name: /Edit/i }).first();
    await editBtn.click();
    await expect(page.getByTestId("edit-user-modal")).toBeVisible();

    const updatedName = "Eve Adams Updated";
    await page.getByTestId("user-form-name").fill(updatedName);

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/admin/users/") && res.request().method() === "PUT"),
      page.getByTestId("submit-user-btn").click(),
    ]);

    await expect(page.getByTestId("admin-success-alert")).toBeVisible();
    await expect(page.getByText(updatedName).first()).toBeVisible();
  });

  test("AC-ADMIN-03: Reset Initial Password for User", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    const searchInput = page.getByTestId("admin-user-search-input");
    await searchInput.fill("Bob Jones");

    const resetBtn = page.getByRole("button", { name: /Reset Password/i }).first();
    await resetBtn.click();
    await expect(page.getByTestId("reset-password-modal")).toBeVisible();

    await page.getByTestId("reset-password-input").fill("NewInitialPass123!");

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/password")),
      page.getByTestId("submit-reset-password-btn").click(),
    ]);

    await expect(page.getByTestId("admin-success-alert")).toBeVisible();
  });

  test("AC-ADMIN-04: Self-Deactivation Blocking Safety Guard", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    const searchInput = page.getByTestId("admin-user-search-input");
    await searchInput.fill("admin@toktick.it");

    const editBtn = page.getByRole("button", { name: /Edit/i }).first();
    await editBtn.click();
    await expect(page.getByTestId("edit-user-modal")).toBeVisible();

    const activeSwitch = page.getByTestId("user-form-active");
    await activeSwitch.uncheck();

    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/api/admin/users/") && res.status() === 400),
      page.getByTestId("submit-user-btn").click(),
    ]);

    await expect(page.getByTestId("admin-error-alert")).toContainText("Administrators cannot deactivate their own account");
  });

  test("AC-ADMIN-05: Last Active Administrator Protection Safety Guard", async ({ page, browser }) => {
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    // 1. Ensure both admin@toktick.it and admin2@toktick.it are active Administrators in DB
    await prisma.user.updateMany({
      where: { email: { in: ["admin@toktick.it", "admin2@toktick.it"] } },
      data: { role: "ADMINISTRATOR", isActive: true, requiresPasswordChange: false },
    });

    // 2. Open second browser context for Admin B (admin2@toktick.it)
    const context2 = await browser.newContext();
    const page2 = await context2.newPage();

    try {
      // Login Admin B on page2
      await page2.goto("/");
      await page2.evaluate(() => localStorage.clear());
      await page2.goto("/");
      await page2.fill("#login-email", "admin2@toktick.it");
      await page2.fill("#login-password", "InitialPassword123!");
      await Promise.all([
        page2.waitForResponse((res) => res.url().includes("/api/auth/login")),
        page2.click("button[type='submit']"),
      ]);
      await expect(page2.getByRole("heading", { name: "User Management" })).toBeVisible();

      // Page 1 (Admin A): Open Edit modal for Admin B (admin2@toktick.it) and uncheck Active
      const searchInput1 = page.getByTestId("admin-user-search-input");
      await searchInput1.fill("admin2@toktick.it");
      const editBtn1 = page.getByRole("button", { name: /Edit/i }).first();
      await editBtn1.click();
      await expect(page.getByTestId("edit-user-modal")).toBeVisible();
      await page.getByTestId("user-form-active").uncheck();

      // Page 2 (Admin B): Open Edit modal for Admin A (admin@toktick.it) and uncheck Active
      const searchInput2 = page2.getByTestId("admin-user-search-input");
      await searchInput2.fill("admin@toktick.it");
      const editBtn2 = page2.getByRole("button", { name: /Edit/i }).first();
      await editBtn2.click();
      await expect(page2.getByTestId("edit-user-modal")).toBeVisible();
      await page2.getByTestId("user-form-active").uncheck();

      // Submit both deactivation forms simultaneously
      const [res1, res2] = await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/admin/users/")),
        page2.waitForResponse((res) => res.url().includes("/api/admin/users/")),
        page.getByTestId("submit-user-btn").click(),
        page2.getByTestId("submit-user-btn").click(),
      ]);

      const statuses = [res1.status(), res2.status()].sort();
      // Exactly one request succeeds (200) and the concurrent request is rejected by safety guard (400 or 401)
      expect(statuses[0]).toBe(200);
      expect([400, 401]).toContain(statuses[1]);

      // Verify that at least one active Administrator remains in DB
      const activeAdminCount = await prisma.user.count({
        where: { role: "ADMINISTRATOR", isActive: true },
      });
      expect(activeAdminCount).toBeGreaterThanOrEqual(1);
    } finally {
      await context2.close();
      // Restore DB state: reactivate both admin accounts
      await prisma.user.updateMany({
        where: { email: { in: ["admin@toktick.it", "admin2@toktick.it"] } },
        data: { role: "ADMINISTRATOR", isActive: true },
      });
    }
  });
});
