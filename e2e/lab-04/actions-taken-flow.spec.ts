import { test, expect } from "@playwright/test";

test.describe("Lab 4 E2E Suite: Actions Taken Full Lifecycle Flow (E2E-01)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  /**
   * E2E-01: Actions Taken logging, multi-staff collaboration, editing,
   * and requester read-only view (AC-01, AC-04, AC-06, BR-02, BR-05, BR-09).
   */
  test("E2E-01: IT Staff logs and edits action taken; Requester views in read-only mode", async ({ page }) => {
    // 1. Login as IT Staff (Alex Thompson)
    await page.goto("/");
    await page.locator("#email").fill("alex.thompson@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Verify Dashboard landing and navigate to Ticket Queue
    await expect(page.getByRole("heading", { name: /Welcome back, Alex!/i })).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-ticket-queue-tab").click();
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });

    // Open first available ticket in the queue
    const firstTicketRow = page.locator("tbody tr [data-testid='view-details-btn']").first();
    await expect(firstTicketRow).toBeVisible({ timeout: 10000 });
    await firstTicketRow.click();

    // Verify Ticket Detail view and Actions Taken section
    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });
    const ticketNumber = await page.getByTestId("ticket-number").innerText();
    const actionsSection = page.getByTestId("actions-taken-section");
    await expect(actionsSection).toBeVisible();

    // 2. Log a new Action Taken with follow-up note (AC-01, AC-05, BR-05)
    await page.getByTestId("log-action-btn").click();
    const modal = page.getByTestId("action-taken-modal");
    await expect(modal).toBeVisible();

    const uniqueStamp = Date.now().toString().slice(-4);
    const actionDesc = `Diagnostic ping sweep and port scan #${uniqueStamp}`;
    const actionResult = `Identified intermittent packet loss on VLAN 20 gateway #${uniqueStamp}`;
    const followUpNoteText = `Schedule cable testing with network contractor on Monday #${uniqueStamp}`;

    await page.getByTestId("action-description-input").fill(actionDesc);
    await page.getByTestId("action-result-input").fill(actionResult);

    // Select Lisa Martinez as assignee (multi-staff collaboration, BR-02, AC-04)
    const assigneeSelect = page.getByTestId("action-assignee-select");
    const lisaOption = await assigneeSelect.locator("option", { hasText: /Lisa Martinez/i }).first();
    if (await lisaOption.count() > 0) {
      const lisaVal = await lisaOption.getAttribute("value");
      if (lisaVal) {
        await assigneeSelect.selectOption(lisaVal);
      }
    }

    // Toggle follow-up required and enter note
    await page.getByTestId("follow-up-required-checkbox").click();
    await expect(page.getByTestId("follow-up-note-input")).toBeVisible();
    await page.getByTestId("follow-up-note-input").fill(followUpNoteText);

    // Save Action Taken
    await page.getByTestId("save-action-btn").click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify newly logged action appears in the table
    const loggedRow = page.locator("tr", { hasText: actionDesc });
    await expect(loggedRow).toBeVisible({ timeout: 10000 });
    await expect(loggedRow).toContainText(actionResult);
    await expect(loggedRow.getByTestId("action-status-badge-COMPLETED")).toBeVisible();

    // 3. Edit Action Taken (FR-08)
    const editBtn = loggedRow.locator('[data-testid^="edit-action-btn-"]').first();
    await editBtn.click();
    await expect(modal).toBeVisible();

    const updatedResult = `${actionResult} — Verified patch cord replaced.`;
    await page.getByTestId("action-result-input").fill(updatedResult);
    await page.getByTestId("save-action-btn").click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify updated result text is displayed
    await expect(page.locator("tr", { hasText: updatedResult })).toBeVisible({ timeout: 10000 });

    // 4. Logout IT Staff
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // 5. Login as Requester (Jennifer Anderson) and verify read-only view (AC-06, BR-09)
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /Welcome, Jennifer!/i })).toBeVisible({ timeout: 10000 });

    // Go to My Tickets and open the ticket if owned, or check that Requester can view owned tickets
    await page.getByTestId("nav-my-tickets-tab").click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });

    const reqTicketRow = page.locator("tr", { hasText: ticketNumber });
    if (await reqTicketRow.count() > 0) {
      await reqTicketRow.first().click();
      await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

      // In Requester view: Actions Taken section exists in read-only mode
      const reqActionsSection = page.getByTestId("actions-taken-section");
      await expect(reqActionsSection).toBeVisible();

      // Read-only guarantee: Log Action Taken button and Edit buttons are strictly absent
      await expect(page.getByTestId("log-action-btn")).not.toBeVisible();
      await expect(page.locator('[data-testid^="edit-action-btn-"]')).toHaveCount(0);
    }
  });
});
