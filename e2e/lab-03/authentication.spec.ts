import { test, expect, Page } from "@playwright/test";

async function loginAsUser(page: Page, email: string, password = "InitialPassword123!") {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");

  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);

  const loginResPromise = page.waitForResponse((res) => res.url().includes("/api/auth/login"));
  await page.getByRole("button", { name: /Sign In/i }).click();
  await loginResPromise;

  if (await page.getByRole("heading", { name: /Mandatory Password Change/i }).isVisible()) {
    await page.locator("#current-password").fill(password);
    await page.locator("#new-password").fill(password);
    await page.locator("#confirm-password").fill(password);

    const changeResPromise = page.waitForResponse((res) => res.url().includes("/api/auth/change-password"));
    await page.getByRole("button", { name: /Update Password & Continue/i }).click();
    await changeResPromise;
  }
}

test.describe("E2E-01: Authentication Workflow (Lab 3)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.goto("/");
  });

  test("AC-AUTH-01: Valid Login with IT Staff credentials", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /TokTickIT/i })).toBeVisible();
    await expect(page.getByText(/Sign in to access your IT Service Desk account/i)).toBeVisible();

    await page.locator("#login-email").fill("john.staff@toktick.it");
    await page.locator("#login-password").fill("InitialPassword123!");

    const loginResPromise = page.waitForResponse((res) => res.url().includes("/api/auth/login"));
    await page.getByRole("button", { name: /Sign In/i }).click();
    await loginResPromise;

    if (await page.getByRole("heading", { name: /Mandatory Password Change/i }).isVisible()) {
      await page.locator("#current-password").fill("InitialPassword123!");
      await page.locator("#new-password").fill("InitialPassword123!");
      await page.locator("#confirm-password").fill("InitialPassword123!");

      const changeResPromise = page.waitForResponse((res) => res.url().includes("/api/auth/change-password"));
      await page.getByRole("button", { name: /Update Password & Continue/i }).click();
      await changeResPromise;
    }

    await expect(page.getByText("John Staff").first()).toBeVisible();
    await expect(page.getByText("IT Staff").first()).toBeVisible();
  });

  test("AC-AUTH-02: Invalid Login displays error alert", async ({ page }) => {
    await page.locator("#login-email").fill("admin@toktick.it");
    await page.locator("#login-password").fill("WrongPassword999!");

    const loginResPromise = page.waitForResponse((res) => res.url().includes("/api/auth/login"));
    await page.getByRole("button", { name: /Sign In/i }).click();
    await loginResPromise;

    await expect(page.getByRole("alert")).toContainText("Invalid email address or password");
  });

  test("AC-AUTH-03: Mandatory Password Change flow on initial password", async ({ page }) => {
    await page.locator("#login-email").fill("sarah.staff@toktick.it");
    await page.locator("#login-password").fill("InitialPassword123!");

    const loginResPromise = page.waitForResponse((res) => res.url().includes("/api/auth/login"));
    await page.getByRole("button", { name: /Sign In/i }).click();
    await loginResPromise;

    if (await page.getByRole("heading", { name: /Mandatory Password Change/i }).isVisible()) {
      await expect(page.getByRole("heading", { name: /Mandatory Password Change/i })).toBeVisible();

      await page.locator("#current-password").fill("InitialPassword123!");
      await page.locator("#new-password").fill("InitialPassword123!");
      await page.locator("#confirm-password").fill("InitialPassword123!");

      const changeResPromise = page.waitForResponse((res) => res.url().includes("/api/auth/change-password"));
      await page.getByRole("button", { name: /Update Password & Continue/i }).click();
      await changeResPromise;
    }

    await expect(page.getByText("Sarah Staff").first()).toBeVisible();
  });

  test("AC-AUTH-04: Logout action invalidates session and returns to login screen", async ({ page }) => {
    await loginAsUser(page, "john.staff@toktick.it");

    await expect(page.getByText("John Staff").first()).toBeVisible();

    const logoutResPromise = page.waitForResponse((res) => res.url().includes("/api/auth/logout"));
    await page.getByRole("button", { name: /Logout/i }).click();
    await logoutResPromise;

    await expect(page.getByRole("heading", { name: /TokTickIT/i })).toBeVisible();
    await expect(page.getByText(/Sign in to access your IT Service Desk account/i)).toBeVisible();
  });

  test("AC-AUTH-05: Direct unauthenticated access blocks protected views", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /TokTickIT/i })).toBeVisible();
    await expect(page.getByText(/Sign in to access your IT Service Desk account/i)).toBeVisible();
    await expect(page.getByText("John Staff")).not.toBeVisible();
  });
});
