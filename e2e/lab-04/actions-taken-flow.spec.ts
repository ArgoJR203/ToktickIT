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
    test.setTimeout(60000);

    // -----------------------------------------------------------------------
    // Step 1: Requester (Jennifer Anderson) creates a fresh ticket to guarantee ownership
    // -----------------------------------------------------------------------
    await page.goto("/");
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /Welcome, Jennifer!/i })).toBeVisible({ timeout: 10000 });

    // Click quick action Create Ticket
    await page.getByTestId("quick-create-ticket-btn").click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible({ timeout: 10000 });

    const uniqueId = Date.now().toString().slice(-5);
    const testSummary = `E2E Actions Taken Ticket ${uniqueId}`;
    const testDesc = `Testing actions taken flow and requester read-only view #${uniqueId}`;

    await page.locator("#categoryId").waitFor({ state: "visible" });
    await page.locator("#categoryId").selectOption({ label: "Network" });
    await page.locator("#relatedSystemId").selectOption({ label: "Campus Wi-Fi" });
    await page.locator("#requestedPriority").selectOption("MEDIUM");
    await page.locator("#summary").fill(testSummary);
    await page.locator("#description").fill(testDesc);
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    const successBanner = page.locator(".zen-alert-success");
    await expect(successBanner).toBeVisible({ timeout: 10000 });
    const bannerText = await successBanner.innerText();
    const match = bannerText.match(/TKT-\d{4}-\d{6}/);
    expect(match).not.toBeNull();
    const ticketNumber = match![0];

    // Logout Requester
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 2: IT Staff (Alex Thompson) opens ticket and logs Action Taken
    // -----------------------------------------------------------------------
    await page.locator("#email").fill("alex.thompson@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /Welcome back, Alex!/i })).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-ticket-queue-tab").click();
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });

    // Filter by ticket number and open
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill(ticketNumber);
    await page.waitForTimeout(400);

    const staffTicketRow = page.locator("tr", { hasText: ticketNumber });
    await expect(staffTicketRow.first()).toBeVisible({ timeout: 10000 });
    await staffTicketRow.first().locator('[data-testid="view-details-btn"]').click();

    // Verify Ticket Detail view and Actions Taken section
    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });
    const actionsSection = page.getByTestId("actions-taken-section");
    await expect(actionsSection).toBeVisible();

    // Log a new Action Taken with follow-up note (AC-01, AC-05, BR-05)
    await page.getByTestId("log-action-btn").click();
    const modal = page.getByTestId("action-taken-modal");
    await expect(modal).toBeVisible();

    const actionDesc = `Diagnostic ping sweep and port scan #${uniqueId}`;
    const actionResult = `Identified intermittent packet loss on VLAN 20 gateway #${uniqueId}`;
    const followUpNoteText = `Schedule cable testing with network contractor on Monday #${uniqueId}`;

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

    // -----------------------------------------------------------------------
    // Step 3: Edit Action Taken (FR-08)
    // -----------------------------------------------------------------------
    const editBtn = loggedRow.locator('[data-testid^="edit-action-btn-"]').first();
    await editBtn.click();
    await expect(modal).toBeVisible();

    const updatedResult = `${actionResult} — Verified patch cord replaced.`;
    await page.getByTestId("action-result-input").fill(updatedResult);
    await page.getByTestId("save-action-btn").click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Verify updated result text is displayed
    await expect(page.locator("tr", { hasText: updatedResult })).toBeVisible({ timeout: 10000 });

    // -----------------------------------------------------------------------
    // Step 4: Logout IT Staff
    // -----------------------------------------------------------------------
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 5: Login as Requester (Jennifer Anderson) and unconditionally verify read-only view (AC-06, BR-09)
    // -----------------------------------------------------------------------
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /Welcome, Jennifer!/i })).toBeVisible({ timeout: 10000 });

    // Go to My Tickets and open Jennifer's ticket
    await page.getByTestId("nav-my-tickets-tab").click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });

    const reqTicketRow = page.locator("tr", { hasText: ticketNumber });
    await expect(reqTicketRow.first()).toBeVisible({ timeout: 10000 });
    await reqTicketRow.first().click();

    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });
    expect(await page.getByTestId("ticket-number").innerText()).toContain(ticketNumber);

    // In Requester view: Actions Taken section exists in read-only mode
    const reqActionsSection = page.getByTestId("actions-taken-section");
    await expect(reqActionsSection).toBeVisible();

    // Read-only guarantee: Log Action Taken button and Edit buttons are strictly absent
    await expect(page.getByTestId("log-action-btn")).not.toBeVisible();
    await expect(page.locator('[data-testid^="edit-action-btn-"]')).toHaveCount(0);

    // Verify the action content logged by staff is visible to requester
    await expect(page.locator("tr", { hasText: updatedResult })).toBeVisible({ timeout: 10000 });
  });
});
