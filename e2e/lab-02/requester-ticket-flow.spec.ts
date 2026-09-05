import { test, expect } from "@playwright/test";

test.describe("Lab 2 End-to-End Suite: Requester Ticket Flow", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test for clean simulated session
    await page.goto("/");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
  });

  /**
   * E2E-01: Complete ticket submission & retrieval flow (AC-01, AC-04)
   * Requester creates ticket, redirects to My Tickets, ticket appears in list & search
   */
  test("E2E-01: Complete ticket submission & retrieval flow", async ({ page }) => {
    await page.goto("/");

    // 1. Initial Dev Requester Selection
    await expect(page.getByRole("heading", { name: "TokTickIT" })).toBeVisible();
    await expect(page.getByText("Development Requester Selector")).toBeVisible();

    const requesterSelect = page.locator("#requester-select");
    await expect(requesterSelect).toBeVisible();
    // Wait for options to be populated from API
    await expect(requesterSelect.locator("option")).toHaveCount(5, { timeout: 10000 });
    // Select Jennifer Anderson
    await requesterSelect.selectOption({ label: "Jennifer Anderson (jennifer.anderson@example.com)" });
    await page.getByRole("button", { name: "Continue" }).click();

    // 2. Verified logged in on My Tickets dashboard
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByRole("banner").getByText("Jennifer Anderson")).toBeVisible();

    // 3. Navigate to Create Ticket
    await page.getByRole("button", { name: "+ Create Ticket" }).or(page.getByRole("button", { name: "Create Ticket", exact: true })).first().click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible();

    // 4. Fill Create Ticket Form
    const uniqueId = Date.now().toString().slice(-6);
    const testSummary = `E2E Wi-Fi Connection Failure ${uniqueId}`;
    const testDescription = `Automated E2E test description for Wi-Fi disconnection issues in the engineering laboratory room 302. Generated at timestamp ${uniqueId}.`;

    // Wait for categories to load
    await page.locator("#categoryId").waitFor({ state: "visible" });
    await expect(page.locator("#categoryId option")).not.toHaveCount(1, { timeout: 10000 });
    await page.locator("#categoryId").selectOption({ label: "Network" });

    // Select related system
    await page.locator("#relatedSystemId").waitFor({ state: "visible" });
    await expect(page.locator("#relatedSystemId option")).not.toHaveCount(1, { timeout: 10000 });
    await page.locator("#relatedSystemId").selectOption({ label: "Campus Wi-Fi" });

    // Select Priority
    await page.locator("#requestedPriority").selectOption("HIGH");

    // Fill Summary & Description
    await page.locator("#summary").fill(testSummary);
    await page.locator("#description").fill(testDescription);

    // 5. Submit Form
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    // 6. Verify Redirect & Success Banner
    const successBanner = page.locator(".zen-alert-success");
    await expect(successBanner).toBeVisible({ timeout: 10000 });
    await expect(successBanner).toContainText("created successfully");

    // Extract ticket number from success banner
    const bannerText = await successBanner.innerText();
    const match = bannerText.match(/TKT-\d{4}-\d{6}/);
    expect(match).not.toBeNull();
    const generatedTicketNumber = match![0];

    // 7. Verify Ticket appears in My Tickets Table
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    const ticketRow = page.locator("tr", { hasText: generatedTicketNumber }).or(page.locator(".mobile-ticket-card", { hasText: generatedTicketNumber }));
    await expect(ticketRow.first()).toBeVisible();
    await expect(ticketRow.first()).toContainText(testSummary);

    // 8. Test Search and Filtering (AC-04)
    const searchInput = page.getByPlaceholder("Search ticket # or summary...");
    await searchInput.fill(uniqueId);
    await expect(ticketRow.first()).toBeVisible();

    // Search for non-matching query
    await searchInput.fill("NON_EXISTENT_TICKET_QUERY_XYZ");
    await expect(page.getByText("No matching tickets found")).toBeVisible();

    // Clear search
    await page.getByRole("button", { name: "Clear Filters" }).first().click();
    await expect(ticketRow.first()).toBeVisible();
  });

  /**
   * E2E-02: Cross-requester context switching (AC-03, BR-05, BR-19)
   * Switch Requester A -> B; verify Requester A tickets disappear from view
   */
  test("E2E-02: Cross-requester context switching", async ({ page }) => {
    await page.goto("/");

    // 1. Select Requester A: Jennifer Anderson
    const requesterSelect = page.locator("#requester-select");
    await expect(requesterSelect.locator("option")).toHaveCount(5, { timeout: 10000 });
    await requesterSelect.selectOption({ label: "Jennifer Anderson (jennifer.anderson@example.com)" });
    await page.getByRole("button", { name: "Continue" }).click();

    // 2. Create a unique ticket for Jennifer Anderson
    await page.getByRole("button", { name: "Create Ticket", exact: true }).click();
    const uniqueTag = `Isolation-${Date.now().toString().slice(-5)}`;
    const ticketSummaryA = `Jennifer Private Issue ${uniqueTag}`;

    await expect(page.locator("#categoryId option")).not.toHaveCount(1, { timeout: 10000 });
    await page.locator("#categoryId").selectOption({ label: "Hardware" });
    await expect(page.locator("#relatedSystemId option")).not.toHaveCount(1, { timeout: 10000 });
    await page.locator("#relatedSystemId").selectOption({ label: "Corporate Laptop" });
    await page.locator("#requestedPriority").selectOption("MEDIUM");
    await page.locator("#summary").fill(ticketSummaryA);
    await page.locator("#description").fill("Testing cross-requester data isolation in Playwright E2E suite.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    await expect(page.locator(".zen-alert-success")).toBeVisible();
    await expect(page.locator("body")).toContainText(ticketSummaryA);

    // 3. Switch Identity to Requester B: Sarah Johnson (BR-19)
    await page.getByRole("button", { name: "Change Requester" }).click();
    await expect(page.getByText("Development Requester Selector")).toBeVisible();

    await expect(page.locator("#requester-select option")).toHaveCount(5, { timeout: 10000 });
    await page.locator("#requester-select").selectOption({ label: "Sarah Johnson (sarah.johnson@example.com)" });
    await page.getByRole("button", { name: "Continue" }).click();

    // 4. Assert Sarah's context active and Jennifer's ticket is NOT visible
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible();
    await expect(page.getByRole("banner").getByText("Sarah Johnson")).toBeVisible();
    await expect(page.locator("body")).not.toContainText(ticketSummaryA);

    // Search specifically for Jennifer's ticket while logged in as Sarah
    const searchInput = page.getByPlaceholder("Search ticket # or summary...");
    await searchInput.fill(uniqueTag);
    await expect(page.getByText("No matching tickets found")).toBeVisible();

    // 5. Switch back to Jennifer Anderson
    await page.getByRole("button", { name: "Change Requester" }).click();
    await expect(page.locator("#requester-select option")).toHaveCount(5, { timeout: 10000 });
    await page.locator("#requester-select").selectOption({ label: "Jennifer Anderson (jennifer.anderson@example.com)" });
    await page.getByRole("button", { name: "Continue" }).click();

    // 6. Assert Jennifer's ticket is visible again
    await expect(page.getByRole("banner").getByText("Jennifer Anderson")).toBeVisible();
    await expect(page.locator("body")).toContainText(ticketSummaryA);
  });

  /**
   * E2E-03: Attachment upload and soft removal flow (AC-06, AC-08, BR-15, BR-16)
   * Upload PDF -> view active -> soft remove with reason -> verify "Removed" badge
   */
  test("E2E-03: Attachment upload and soft removal flow", async ({ page }) => {
    await page.goto("/");

    // 1. Log in as Jennifer Anderson
    const requesterSelect = page.locator("#requester-select");
    await expect(requesterSelect.locator("option")).toHaveCount(5, { timeout: 10000 });
    await requesterSelect.selectOption({ label: "Jennifer Anderson (jennifer.anderson@example.com)" });
    await page.getByRole("button", { name: "Continue" }).click();

    // 2. Create a ticket to test attachments on
    await page.getByRole("button", { name: "Create Ticket", exact: true }).click();
    const uniqueTag = `Attach-${Date.now().toString().slice(-5)}`;
    const ticketSummary = `Attachment Lifecycle Test ${uniqueTag}`;

    await expect(page.locator("#categoryId option")).not.toHaveCount(1, { timeout: 10000 });
    await page.locator("#categoryId").selectOption({ label: "Software" });
    await expect(page.locator("#relatedSystemId option")).not.toHaveCount(1, { timeout: 10000 });
    await page.locator("#relatedSystemId").selectOption({ label: "LEB2 App" });
    await page.locator("#requestedPriority").selectOption("LOW");
    await page.locator("#summary").fill(ticketSummary);
    await page.locator("#description").fill("Ticket created for attachment upload and soft-removal testing.");
    await page.getByRole("button", { name: "Submit Ticket" }).click();

    await expect(page.locator(".zen-alert-success")).toBeVisible();

    // 3. Open the newly created ticket detail
    const ticketRow = page.locator("tr", { hasText: ticketSummary }).or(page.locator(".mobile-ticket-card", { hasText: ticketSummary })).first();
    await ticketRow.click();

    // 4. Assert on Ticket Detail view
    await expect(page.getByRole("heading", { name: ticketSummary })).toBeVisible();
    await expect(page.getByText("Attachments (0/5 active)")).toBeVisible();

    // 5. Upload an attachment (AC-06)
    const testFileName = `diagnostic_report_${uniqueTag}.pdf`;
    const testFileBuffer = Buffer.from("%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF");

    // Use file input in AttachmentSection
    const fileInput = page.locator('[data-testid="attachment-file-input"]');
    await fileInput.setInputFiles({
      name: testFileName,
      mimeType: "application/pdf",
      buffer: testFileBuffer,
    });

    // 6. Verify Active Attachment displayed
    await expect(page.getByText("Attachments (1/5 active)")).toBeVisible({ timeout: 10000 });
    const attachmentItem = page.locator("li", { hasText: testFileName });
    await expect(attachmentItem).toBeVisible();
    await expect(attachmentItem.getByRole("button", { name: "Download" })).toBeVisible();
    await expect(attachmentItem.getByRole("button", { name: "Remove" })).toBeVisible();

    // 7. Click Remove to trigger Soft-Removal Modal (AC-08, UI-04)
    await attachmentItem.getByRole("button", { name: "Remove" }).click();
    const modal = page.locator('.modal[role="dialog"]');
    await expect(modal).toBeVisible();
    await expect(modal.getByRole("heading", { name: "Remove Attachment" })).toBeVisible();

    const confirmBtn = modal.getByRole("button", { name: "Confirm Removal" });
    const reasonInput = modal.locator("#removalReason");

    // Verify confirm button disabled when reason is empty or < 3 chars
    await expect(confirmBtn).toBeDisabled();
    await reasonInput.fill("No");
    await expect(confirmBtn).toBeDisabled();

    // Enter valid removal reason (>= 3 chars)
    const removalReasonText = "Uploaded outdated network diagnostic document";
    await reasonInput.fill(removalReasonText);
    await expect(confirmBtn).toBeEnabled();

    // 8. Confirm Soft Removal
    await confirmBtn.click();
    await expect(modal).not.toBeVisible();

    // 9. Verify Soft-Removed state (muted, Removed badge, reason displayed, download disabled)
    await expect(page.getByText("Attachments (0/5 active)")).toBeVisible();
    await expect(attachmentItem).toBeVisible();
    await expect(attachmentItem.getByText("Removed", { exact: true })).toBeVisible();
    await expect(attachmentItem).toContainText(removalReasonText);
    await expect(attachmentItem.getByRole("button", { name: "Download" })).not.toBeVisible();
    await expect(attachmentItem.getByRole("button", { name: "Remove" })).not.toBeVisible();
  });
});
