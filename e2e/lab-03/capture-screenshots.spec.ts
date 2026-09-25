import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

test.describe("Lab 3 Responsive Screenshot Evidence Capture (§14 Part 9)", () => {
  test.beforeAll(() => {
    // Ensure destination folders exist
    const baseDir = path.join("artifacts", "lab-03", "screenshots");
    const dirs = ["authentication", "staff-queue", "staff-ticket-detail", "user-management"];
    for (const d of dirs) {
      const full = path.join(baseDir, d);
      if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
      }
    }
  });

  for (const vp of viewports) {
    test(`Capture responsive screenshots for ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // -----------------------------------------------------------------------
      // 1. Authentication Screenshots
      // -----------------------------------------------------------------------
      // 1.1 Login Screen
      await page.goto("/");
      await page.evaluate(() => localStorage.clear());
      await page.reload();

      await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(400);

      const loginPath = path.join("artifacts", "lab-03", "screenshots", "authentication", `${vp.name}-login.png`);
      await page.screenshot({ path: loginPath, fullPage: true });

      // 1.2 Mandatory Password Change Screen (David Lee)
      await page.locator("#email").fill("david.lee@example.com");
      await page.locator("#password").fill("Password123!");
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(400);

      const changePwPath = path.join("artifacts", "lab-03", "screenshots", "authentication", `${vp.name}-change-password.png`);
      await page.screenshot({ path: changePwPath, fullPage: true });

      // Cleanly sign out from change password screen
      await page.getByRole("button", { name: /cancel and sign out/i }).click();
      await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible({ timeout: 10000 });

      // -----------------------------------------------------------------------
      // 2. Staff Ticket Queue Screenshots (Alex Thompson)
      // -----------------------------------------------------------------------
      await page.locator("#email").fill("alex.thompson@toktickit.com");
      await page.locator("#password").fill("Password123!");
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      const queuePath = path.join("artifacts", "lab-03", "screenshots", "staff-queue", `${vp.name}-queue.png`);
      await page.screenshot({ path: queuePath, fullPage: true });

      // -----------------------------------------------------------------------
      // 3. Staff Ticket Detail Screenshots (Public Comments & Amber Internal Notes)
      // -----------------------------------------------------------------------
      // Click first available ticket
      const firstTicket = vp.name === "mobile"
        ? page.locator('[data-testid="mobile-open-detail-btn"]').first()
        : page.locator('tbody tr [data-testid="view-details-btn"]').first();

      await firstTicket.waitFor({ state: "visible", timeout: 10000 });
      await firstTicket.click();

      await expect(page.locator('[data-testid="ticket-number"]')).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      // 3.1 Detail with Public Comments Tab
      await page.locator('[data-testid="tab-public-comments"]').click();
      await page.waitForTimeout(300);
      const detailCommentsPath = path.join("artifacts", "lab-03", "screenshots", "staff-ticket-detail", `${vp.name}-detail-comments.png`);
      await page.screenshot({ path: detailCommentsPath, fullPage: true });

      // 3.2 Detail with Warm Amber Internal Notes Tab
      await page.locator('[data-testid="tab-internal-notes"]').click();
      await expect(page.locator('[data-testid="internal-notes-banner"]')).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(300);
      const detailNotesPath = path.join("artifacts", "lab-03", "screenshots", "staff-ticket-detail", `${vp.name}-detail-internal-notes.png`);
      await page.screenshot({ path: detailNotesPath, fullPage: true });

      // -----------------------------------------------------------------------
      // 4. Administrator User Management Screenshots (John Smith)
      // -----------------------------------------------------------------------
      await page.locator("header").getByRole("button", { name: /logout/i }).click();
      await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible({ timeout: 10000 });

      await page.locator("#email").fill("john.smith@toktickit.com");
      await page.locator("#password").fill("Password123!");
      await page.getByRole("button", { name: /sign in/i }).click();

      // Navigate to User Management
      await page.locator("header").getByRole("button", { name: "User Management" }).click();
      await expect(page.getByTestId("user-management-page")).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);

      // 4.1 User Table View
      const userTablePath = path.join("artifacts", "lab-03", "screenshots", "user-management", `${vp.name}-user-table.png`);
      await page.screenshot({ path: userTablePath, fullPage: true });

      // 4.2 Create User Modal View
      await page.getByTestId("btn-create-user").click();
      await expect(page.getByTestId("create-user-modal")).toBeVisible({ timeout: 5000 });
      await page.waitForTimeout(300);

      const createUserModalPath = path.join("artifacts", "lab-03", "screenshots", "user-management", `${vp.name}-create-user-modal.png`);
      await page.screenshot({ path: createUserModalPath, fullPage: true });

      // Close create modal
      await page.getByTestId("create-user-modal").getByRole("button", { name: "Cancel" }).click();
      await expect(page.getByTestId("create-user-modal")).not.toBeVisible();

      // 4.3 Edit User Modal with Safety Alerts (John Smith self edit)
      const adminItem = vp.name === "mobile"
        ? page.locator('[data-testid^="mobile-user-card"]', { hasText: "john.smith@toktickit.com" })
        : page.locator("tr", { hasText: "john.smith@toktickit.com" });
      await adminItem.getByRole("button", { name: /edit/i }).click();
      await expect(page.getByTestId("edit-user-modal")).toBeVisible({ timeout: 5000 });
      await expect(page.getByTestId("self-deactivation-warning")).toBeVisible();
      await page.waitForTimeout(300);

      const editUserSafetyPath = path.join("artifacts", "lab-03", "screenshots", "user-management", `${vp.name}-edit-user-safety.png`);
      await page.screenshot({ path: editUserSafetyPath, fullPage: true });

      // Close modal and sign out cleanly
      await page.getByTestId("edit-user-modal").getByRole("button", { name: "Close" }).first().click();
      await expect(page.getByTestId("edit-user-modal")).not.toBeVisible();
      await page.locator("header").getByRole("button", { name: /logout/i }).click();
      await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible({ timeout: 10000 });
    });
  }
});
