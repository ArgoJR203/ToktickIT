import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

test.describe("Lab 4 Responsive Screenshot Evidence Capture", () => {
  test.beforeAll(() => {
    // Ensure destination folders exist
    const baseDir = path.join("artifacts", "lab-04", "screenshots");
    const dirs = ["requester-dashboard", "staff-dashboard", "admin-dashboard", "actions-taken", "ticket-resolution"];
    for (const d of dirs) {
      const full = path.join(baseDir, d);
      if (!fs.existsSync(full)) {
        fs.mkdirSync(full, { recursive: true });
      }
    }
  });

  const verifyLayout = async (page: any, vpName: string) => {
    // Programmatic verification: no horizontal scrollbar/overflow (RESP-01)
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    // On mobile viewports (375px), touch targets should be >= 44px
    if (vpName === "mobile") {
      const primaryBtns = page.locator(".btn-zen-primary, .btn-touch-target");
      const count = await primaryBtns.count();
      for (let i = 0; i < Math.min(count, 3); i++) {
        const btn = primaryBtns.nth(i);
        if (await btn.isVisible()) {
          const box = await btn.boundingBox();
          if (box) {
            expect(box.height).toBeGreaterThanOrEqual(44);
          }
        }
      }
    }
  };

  for (const vp of viewports) {
    test(`Capture Lab 4 responsive screenshots for ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      test.setTimeout(90000);
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // -----------------------------------------------------------------------
      // 1. Requester Dashboard (Jennifer Anderson)
      // -----------------------------------------------------------------------
      await page.goto("/");
      await page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
      await page.reload();

      await page.locator("#email").fill("jennifer.anderson@example.com");
      await page.locator("#password").fill("Password123!");
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByTestId("requester-dashboard-view")).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(400);
      await verifyLayout(page, vp.name);

      const reqDashPath = path.join("artifacts", "lab-04", "screenshots", "requester-dashboard", `${vp.name}-requester-dashboard.png`);
      await page.screenshot({ path: reqDashPath, fullPage: true });

      // Logout Requester
      await page.locator("header").getByRole("button", { name: /logout/i }).click();
      await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible({ timeout: 10000 });

      // -----------------------------------------------------------------------
      // 2. Staff Dashboard (Alex Thompson)
      // -----------------------------------------------------------------------
      await page.locator("#email").fill("alex.thompson@toktickit.com");
      await page.locator("#password").fill("Password123!");
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByTestId("staff-dashboard-view")).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(400);
      await verifyLayout(page, vp.name);

      const staffDashPath = path.join("artifacts", "lab-04", "screenshots", "staff-dashboard", `${vp.name}-staff-dashboard.png`);
      await page.screenshot({ path: staffDashPath, fullPage: true });

      // Logout Staff
      await page.locator("header").getByRole("button", { name: /logout/i }).click();
      await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible({ timeout: 10000 });

      // -----------------------------------------------------------------------
      // 3. Administrator Dashboard with Admin Statistics (John Smith)
      // -----------------------------------------------------------------------
      await page.locator("#email").fill("john.smith@toktickit.com");
      await page.locator("#password").fill("Password123!");
      await page.getByRole("button", { name: /sign in/i }).click();

      await expect(page.getByTestId("staff-dashboard-view")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("admin-stats-card")).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(400);
      await verifyLayout(page, vp.name);

      const adminDashPath = path.join("artifacts", "lab-04", "screenshots", "admin-dashboard", `${vp.name}-admin-dashboard.png`);
      await page.screenshot({ path: adminDashPath, fullPage: true });

      // -----------------------------------------------------------------------
      // 4. Ticket Detail with Actions Taken & Resolution Gate
      // -----------------------------------------------------------------------
      await page.getByTestId("nav-ticket-queue-tab").click();
      await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });

      // Open first available ticket in queue
      if (vp.name === "mobile") {
        const mobileBtn = page.getByRole("button", { name: /Open Ticket Detail/i }).first();
        await expect(mobileBtn).toBeVisible({ timeout: 10000 });
        await mobileBtn.click();
      } else {
        const desktopBtn = page.locator('tbody tr [data-testid="view-details-btn"]').first();
        await expect(desktopBtn).toBeVisible({ timeout: 10000 });
        await desktopBtn.click();
      }

      await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId("actions-taken-section")).toBeVisible({ timeout: 10000 });
      await page.waitForTimeout(500);
      await verifyLayout(page, vp.name);

      const actionsPath = path.join("artifacts", "lab-04", "screenshots", "actions-taken", `${vp.name}-actions-taken.png`);
      await page.screenshot({ path: actionsPath, fullPage: true });

      const resGatePath = path.join("artifacts", "lab-04", "screenshots", "ticket-resolution", `${vp.name}-ticket-detail.png`);
      await page.screenshot({ path: resGatePath, fullPage: true });

      // Logout Admin
      await page.locator("header").getByRole("button", { name: /logout/i }).click();
      await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible({ timeout: 10000 });
    });
  }
});
