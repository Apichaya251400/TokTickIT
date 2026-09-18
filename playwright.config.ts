import { defineConfig, devices } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: "./e2e/lab-03",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npm run dev",
      cwd: path.resolve(process.cwd(), "server"),
      url: "http://localhost:3000/api/health",
      reuseExistingServer: true,
      timeout: 120000,
    },
    {
      command: "npm run dev",
      cwd: path.resolve(process.cwd(), "client"),
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
