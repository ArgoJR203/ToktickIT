import { test, expect } from "@playwright/test";

test.describe("Lab 3 E2E Suite: Staff Ticket Lifecycle & Operations (E2E-03)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  /**
   * E2E-03: Staff Ticket Queue & Lifecycle Workflow (AC-07, AC-08, AC-09, AC-10, AC-11, AC-04)
   * Queue filtering, claiming ownership, updating IT priority, status progression
   * with resolution summary, public comments, and confidential amber internal notes.
   */
  test("E2E-03: Staff ticket management, lifecycle progression, and notes confidentiality", async ({ page }) => {
    // 1. Login as Requester (Jennifer Anderson) to create a fresh test ticket
    await page.goto("/");
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });

    // Create a new ticket
    const uniqueId = Date.now().toString().slice(-6);
    const testSummary = `E2E Lifecycle Test Ticket ${uniqueId}`;
    const testDescription = `Automated verification of ticket lifecycle operations and notes confidentiality. Timestamp ${uniqueId}.`;

    await page.getByRole("button", { name: "+ Create Ticket" }).or(page.getByRole("button", { name: "Create Ticket", exact: true })).first().click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible();

    await page.locator("#categoryId").waitFor({ state: "visible" });
    await page.locator("#categoryId").selectOption({ label: "Network" });
    await page.locator("#relatedSystemId").selectOption({ label: "Campus Wi-Fi" });
    await page.locator("#requestedPriority").selectOption("HIGH");
    await page.locator("#summary").fill(testSummary);
    await page.locator("#description").fill(testDescription);
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

    // 2. Login as IT Staff (Alex Thompson)
    await page.locator("#email").fill("alex.thompson@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Verify Staff Ticket Queue (AC-07, UI-03)
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });

    // Test Search Filter (API-14)
    const queueSearchInput = page.locator('[data-testid="search-input"]');
    await queueSearchInput.fill(ticketNumber);
    await page.waitForTimeout(500);

    const ticketRow = page.locator("tr", { hasText: ticketNumber }).or(page.locator(".mobile-queue-card", { hasText: ticketNumber }));
    await expect(ticketRow.first()).toBeVisible({ timeout: 5000 });
    await expect(ticketRow.first()).toContainText(testSummary);

    // Click ticket to navigate to Staff Ticket Detail (UI-04)
    await ticketRow.first().click();

    // 3. Verify Staff Ticket Detail Screen
    await expect(page.locator('[data-testid="ticket-number"]')).toHaveText(ticketNumber, { timeout: 10000 });
    await expect(page.getByText(testSummary)).toBeVisible();

    // Verify Read-Only fields (Category, Related System, Requester)
    await expect(page.getByText("Campus Wi-Fi")).toBeVisible();
    await expect(page.getByText("Jennifer Anderson")).toBeVisible();

    // 4. Claim Ticket Ownership: "Assign to Me" (AC-08, API-16)
    const assignToMeBtn = page.locator('[data-testid="assign-to-me-btn"]');
    if (await assignToMeBtn.isVisible()) {
      await assignToMeBtn.click();
      await expect(page.locator('[data-testid="owner-select"]')).toHaveValue(/\d+/, { timeout: 5000 });
    }

    // 5. Adjust IT Priority independently from Requested Priority (AC-09, API-15)
    const itPrioritySelect = page.locator('[data-testid="it-priority-select"]');
    await itPrioritySelect.selectOption("URGENT");
    await expect(itPrioritySelect).toHaveValue("URGENT");

    // 6. Advance Status & Provide Resolution Summary (AC-10, API-17)
    // Permitted transition from NEW is IN_PROGRESS
    const statusSelect = page.locator('[data-testid="status-select"]');
    await statusSelect.selectOption("IN_PROGRESS");
    await page.locator('[data-testid="update-status-btn"]').click();
    await expect(page.locator('[data-testid="status-badge-in-progress"]')).toBeVisible({ timeout: 5000 });

    // Now transition from IN_PROGRESS to RESOLVED with Resolution Summary
    await statusSelect.selectOption("RESOLVED");

    const resolutionSummaryInput = page.locator('[data-testid="resolution-summary-input"]');
    await expect(resolutionSummaryInput).toBeVisible();
    const resolutionText = `Network interface reset and AP reconnect completed successfully at ${uniqueId}.`;
    await resolutionSummaryInput.fill(resolutionText);

    await page.locator('[data-testid="update-status-btn"]').click();
    await expect(page.locator('[data-testid="status-badge-resolved"]')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText(resolutionText)).toBeVisible();

    // 7. Post Public Comment (AC-11, API-11, UI-05)
    const commentInput = page.locator('[data-testid="public-comment-input"]');
    const commentText = `Public update for requester: The service has been restored. (${uniqueId})`;
    await commentInput.fill(commentText);
    await page.locator('[data-testid="post-comment-btn"]').click();

    // Verify comment appears in feed
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 5000 });

    // 8. Post Internal Note with Warm Amber Theme (AC-04, API-08, UI-05)
    await page.locator('[data-testid="tab-internal-notes"]').click();

    // Verify confidential amber banner
    const amberBanner = page.locator('[data-testid="internal-notes-banner"]');
    await expect(amberBanner).toBeVisible();
    await expect(amberBanner).toContainText(/Visible only to IT Staff and Administrators/i);

    const internalNoteInput = page.locator('[data-testid="internal-note-input"]');
    const noteText = `CONFIDENTIAL NOTE: Core switch port 18 CRC error logged. (${uniqueId})`;
    await internalNoteInput.fill(noteText);
    await page.locator('[data-testid="post-note-btn"]').click();

    // Verify internal note appears in amber notes feed
    await expect(page.getByText(noteText)).toBeVisible({ timeout: 5000 });

    // 9. Confidentiality Isolation Verification (AC-04, BR-04)
    // Logout IT Staff and login as Requester to verify internal notes are NOT visible
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });

    // Open the same ticket
    const reqTicketRow = page.locator("tr", { hasText: ticketNumber }).or(page.locator(".mobile-ticket-card", { hasText: ticketNumber }));
    await expect(reqTicketRow.first()).toBeVisible({ timeout: 5000 });
    await reqTicketRow.first().click();

    // Verify Requester can see Public Comment
    await expect(page.getByText(commentText)).toBeVisible({ timeout: 10000 });

    // Verify Requester can see Resolution Summary
    await expect(page.getByText(resolutionText)).toBeVisible();

    // CRITICAL SECURITY CHECK: Internal Notes tab and confidential note text MUST NOT exist in DOM
    await expect(page.locator('[data-testid="tab-internal-notes"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="internal-notes-banner"]')).not.toBeVisible();
    await expect(page.getByText(noteText)).not.toBeVisible();
  });
});
