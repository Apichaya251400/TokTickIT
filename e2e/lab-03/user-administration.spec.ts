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

  test("AC-ADMIN-05: Last Active Administrator Protection Safety Guard", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "User Management" })).toBeVisible();

    const searchInput = page.getByTestId("admin-user-search-input");

    try {
      // 1. Deactivate Secondary Admin (admin2@toktick.it) so admin@toktick.it becomes the sole active Administrator
      await searchInput.fill("admin2@toktick.it");

      const editSecondaryBtn = page.getByRole("button", { name: /Edit/i }).first();
      await editSecondaryBtn.click();
      await expect(page.getByTestId("edit-user-modal")).toBeVisible();

      const activeSwitch = page.getByTestId("user-form-active");
      await activeSwitch.uncheck();

      await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/admin/users/") && res.status() === 200),
        page.getByTestId("submit-user-btn").click(),
      ]);
      await expect(page.getByTestId("admin-success-alert")).toBeVisible();

      // 2. Try to demote admin@toktick.it (the last remaining active Administrator) to IT_STAFF
      await searchInput.fill("admin@toktick.it");

      const editPrimaryBtn = page.getByRole("button", { name: /Edit/i }).first();
      await editPrimaryBtn.click();
      await expect(page.getByTestId("edit-user-modal")).toBeVisible();

      await page.getByTestId("user-form-role").selectOption("IT_STAFF");

      await Promise.all([
        page.waitForResponse((res) => res.url().includes("/api/admin/users/") && res.status() === 400),
        page.getByTestId("submit-user-btn").click(),
      ]);

      await expect(page.getByTestId("admin-error-alert")).toContainText("Administrators cannot deactivate their own account or deactivate the last active Administrator");
    } finally {
      // Deterministically restore shared DB state via Prisma so subsequent test runs succeed
      try {
        await prisma.user.updateMany({
          where: { email: "admin2@toktick.it" },
          data: { isActive: true },
        });
      } catch (err) {
        console.error("Failed to restore admin2@toktick.it state:", err);
      }
    }
  });
});
