import { test } from "@playwright/test";
import path from "path";

const viewports = [
  { name: "desktop", width: 1280, height: 800 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "mobile", width: 375, height: 667 },
];

test.describe("Lab 2 Responsive Screenshot Evidence Capture", () => {
  for (const vp of viewports) {
    test(`Capture responsive screenshots for ${vp.name} (${vp.width}x${vp.height})`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });

      // 1. Log in as Jennifer Anderson
      await page.goto("/");
      await page.locator("#requester-select").waitFor({ state: "visible" });
      await page.locator("#requester-select").selectOption({ label: "Jennifer Anderson (jennifer.anderson@example.com)" });
      await page.getByRole("button", { name: "Continue" }).click();

      // Ensure we are on My Tickets
      await page.getByRole("heading", { name: "My Tickets" }).waitFor({ state: "visible" });
      await page.waitForTimeout(600); // Allow render to settle

      // Screenshot: My Tickets
      const myTicketsPath = path.join("artifacts", "lab-02", "screenshots", "my-tickets", `${vp.name}.png`);
      await page.screenshot({ path: myTicketsPath, fullPage: true });

      // Navigate to Create Ticket
      await page.getByRole("button", { name: "+ Create Ticket" }).or(page.getByRole("button", { name: "Create Ticket", exact: true })).first().click();
      await page.getByRole("heading", { name: "Create IT Support Ticket" }).waitFor({ state: "visible" });
      await page.waitForTimeout(600);

      // Screenshot: Create Ticket
      const createTicketPath = path.join("artifacts", "lab-02", "screenshots", "create-ticket", `${vp.name}.png`);
      await page.screenshot({ path: createTicketPath, fullPage: true });

      // Return to My Tickets and click on the first ticket to view detail
      await page.getByRole("button", { name: "My Tickets" }).click();
      await page.getByRole("heading", { name: "My Tickets" }).waitFor({ state: "visible" });

      // Responsive selection: mobile card vs desktop table row
      const ticketLocator = vp.name === "mobile"
        ? page.locator(".mobile-ticket-card").first()
        : page.locator("tbody tr.cursor-pointer").first();
      await ticketLocator.waitFor({ state: "visible" });
      await ticketLocator.click();

      // Wait for Ticket Detail view to load
      await page.locator('[data-testid="attachment-section"]').waitFor({ state: "visible" });
      await page.waitForTimeout(600);

      // Screenshot: Ticket Detail
      const ticketDetailPath = path.join("artifacts", "lab-02", "screenshots", "ticket-detail", `${vp.name}.png`);
      await page.screenshot({ path: ticketDetailPath, fullPage: true });
    });
  }
});
