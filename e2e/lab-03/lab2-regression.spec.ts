import { test, expect, Page } from "@playwright/test";

async function loginAsRequester(page: Page, email = "requester@toktick.it") {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.fill("#login-email", email);
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

test.describe("E2E-04: Lab 2 Requester Regression Flow (Lab 3)", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsRequester(page);
  });

  test("AC-REG-01: Full Requester Ticket Lifecycle — Login, Create, Attach, View, Download, & Public Comment", async ({ page }) => {
    // 1. Verify Application Header context for Requester
    await expect(page.getByRole("button", { name: /^My Tickets$/i })).toBeVisible();

    // 2. Navigate to Create Ticket
    await page.getByRole("button", { name: /^Create Ticket$/i }).click();
    await expect(page.getByRole("heading", { name: /Create IT Support Ticket/i })).toBeVisible();

    const timestamp = Date.now();
    const uniqueSummary = `E2E Lab 2 Regression Ticket ${timestamp}`;
    const uniqueDescription = `E2E Regression test description created at timestamp ${timestamp}. Testing full end-to-end requester workflow.`;
    const fileName = `e2e-attachment-${timestamp}.png`;

    // 3. Fill Form & Attach File
    await page.getByLabel(/Category/i).selectOption({ label: "Software" });
    await page.getByLabel(/Related System/i).selectOption({ label: "VPN" });
    await page.getByLabel("HIGH").check();
    await page.getByLabel(/Summary/i).fill(uniqueSummary);
    await page.getByLabel(/Description/i).fill(uniqueDescription);

    await page.getByLabel(/Attach Files/i).setInputFiles({
      name: fileName,
      mimeType: "image/png",
      buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="),
    });

    await expect(page.getByText(fileName)).toBeVisible();

    // 4. Submit Ticket
    await Promise.all([
      page.waitForResponse((res) => res.url().endsWith("/api/tickets") && res.request().method() === "POST" && res.status() === 201),
      page.getByRole("button", { name: /Submit Ticket/i }).click(),
    ]);

    await expect(page.getByText(/created successfully!/i)).toBeVisible();

    // 5. Navigate to My Tickets & Search
    await page.getByRole("button", { name: /^My Tickets$/i }).click();

    const searchInput = page.getByLabel(/Search tickets/i);
    await searchInput.fill(uniqueSummary);
    await expect(page.getByText(uniqueSummary)).toBeVisible();

    // 6. Open Ticket Detail
    await page.getByRole("button", { name: /View Details/i }).first().click();
    await expect(page.getByRole("heading", { name: /Ticket Detail/i })).toBeVisible();
    await expect(page.getByText(uniqueSummary)).toBeVisible();
    await expect(page.getByText(uniqueDescription)).toBeVisible();

    // 7. Verify Attachment & Trigger Browser Download
    await expect(page.getByText(fileName)).toBeVisible();
    const downloadBtn = page.getByRole("button", { name: /^Download$/i });
    await expect(downloadBtn).toBeVisible();

    const downloadPromise = page.waitForEvent("download");
    await downloadBtn.click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(fileName);

    // 8. Post Public Comment
    const commentInput = page.getByPlaceholder(/public comment/i);
    await expect(commentInput).toBeVisible();

    const publicCommentText = `Requester public comment timestamp ${timestamp}`;
    await commentInput.fill(publicCommentText);

    const postCommentBtn = page.getByRole("button", { name: /Post Comment/i });
    await Promise.all([
      page.waitForResponse((res) => res.url().includes("/comments")),
      postCommentBtn.click(),
    ]);

    await expect(page.getByText(publicCommentText)).toBeVisible();
  });
});
