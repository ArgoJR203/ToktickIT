import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e/lab-02",
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: [
    {
      command: "npm --prefix server run dev",
      url: "http://localhost:3000/api/categories",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      command: "npm --prefix client run dev",
      url: "http://localhost:5173",
      reuseExistingServer: true,
      timeout: 30000,
    },
  ],
});
