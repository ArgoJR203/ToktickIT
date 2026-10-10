import { test, expect } from "@playwright/test";

test.describe("Lab 4 E2E Suite: Ticket Resolution Gate & Advisory Indications (E2E-02)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  /**
   * E2E-02: Advisory resolution indication, action completion resolution gate,
   * mandatory resolution summary, and formal resolution (Handout §10 exact, AC-03, AC-09, AC-16, BR-12, BR-13, BR-20).
   */
  test("E2E-02: Requester indicates resolved without status jump; Staff blocked by incomplete action gate then resolves", async ({ page }) => {
    test.setTimeout(60000);

    // -----------------------------------------------------------------------
    // Step 1: Requester creates a fresh ticket and indicates problem appears resolved
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
    const testSummary = `E2E Resolution Gate Ticket ${uniqueId}`;
    const testDesc = `Testing advisory resolution indications and staff completion gates #${uniqueId}`;

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

    // Logout Requester right after ticket creation
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 2: IT Staff opens ticket, claims ownership, and moves to IN_PROGRESS
    // -----------------------------------------------------------------------
    await page.locator("#email").fill("alex.thompson@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /Welcome back, Alex!/i })).toBeVisible({ timeout: 10000 });
    await page.getByTestId("nav-ticket-queue-tab").click();
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });

    // Search and open ticket
    const searchInput = page.locator('[data-testid="search-input"]');
    await searchInput.fill(ticketNumber);
    await page.waitForTimeout(500);

    const staffTicketRow = page.locator("tr", { hasText: ticketNumber });
    await expect(staffTicketRow.first()).toBeVisible({ timeout: 10000 });
    await staffTicketRow.first().locator('[data-testid="view-details-btn"]').click();

    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

    // Advance NEW -> IN_PROGRESS
    const statusSelect = page.getByTestId("status-select");
    await statusSelect.selectOption("IN_PROGRESS");
    await page.getByTestId("update-status-btn").click();
    await expect(page.getByTestId("success-banner")).toBeVisible({ timeout: 10000 });

    // Logout IT Staff
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 3: Requester indicates problem appears resolved (Advisory Gate, AC-03, BR-12)
    // -----------------------------------------------------------------------
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.getByTestId("nav-my-tickets-tab").click();
    await page.locator("tr", { hasText: ticketNumber }).first().click();
    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

    // Click Problem Appears Resolved
    const indicateResolvedBtn = page.getByTestId("indicate-resolved-btn");
    await expect(indicateResolvedBtn).toBeVisible({ timeout: 10000 });
    await indicateResolvedBtn.click();

    // Verify advisory banner appears
    await expect(page.getByTestId("requester-resolution-indicated-banner")).toBeVisible({ timeout: 10000 });

    // CRITICAL: Verify ticket status DID NOT change to RESOLVED directly (AC-03, BR-12)
    const currentStatusBadge = page.locator(".badge", { hasText: /In Progress/i });
    await expect(currentStatusBadge.first()).toBeVisible();

    // Logout Requester
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // -----------------------------------------------------------------------
    // Step 4: IT Staff logs in, views advisory notice, tests Action Completion Gate
    // -----------------------------------------------------------------------
    await page.locator("#email").fill("alex.thompson@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.getByTestId("nav-ticket-queue-tab").click();
    await searchInput.fill(ticketNumber);
    await page.waitForTimeout(500);
    await page.locator("tr", { hasText: ticketNumber }).first().locator('[data-testid="view-details-btn"]').click();

    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

    // Verify advisory notification banner is visible to IT Staff (AC-03, UI-06)
    await expect(page.getByTestId("resolution-indicated-banner")).toBeVisible({ timeout: 10000 });

    // Log an action that has an incomplete status (PENDING) (AC-16, BR-20)
    await page.getByTestId("log-action-btn").click();
    const modal = page.getByTestId("action-taken-modal");
    await expect(modal).toBeVisible();

    await page.getByTestId("action-description-input").fill("Field antenna replacement planned");
    await page.getByTestId("action-result-input").fill("Waiting for hardware parts shipment");
    await page.getByTestId("action-status-select").selectOption("PENDING");
    await page.getByTestId("save-action-btn").click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Ensure action is rendered in the table before interacting with status form
    await expect(page.locator("tr", { hasText: "Field antenna replacement planned" })).toBeVisible({ timeout: 10000 });

    // Attempt to transition to RESOLVED with incomplete action (Blocked by AC-16, BR-20)
    await statusSelect.selectOption("RESOLVED");
    await expect(page.getByTestId("resolution-summary-input")).toBeVisible();
    await page.getByTestId("resolution-summary-input").fill("Attempting early resolution");
    await page.getByTestId("update-status-btn").click();

    // Verify rejection banner for incomplete actions
    const errorBanner = page.getByTestId("action-error-banner");
    await expect(errorBanner).toBeVisible({ timeout: 10000 });
    await expect(errorBanner).toContainText(/INCOMPLETE_ACTIONS_TAKEN|actions/i);

    // -----------------------------------------------------------------------
    // Step 5: Staff completes the action, provides summary, and formally resolves ticket
    // -----------------------------------------------------------------------
    const pendingActionRow = page.locator("tr", { hasText: "Field antenna replacement planned" });
    await pendingActionRow.locator('[data-testid^="edit-action-btn-"]').click();
    await expect(modal).toBeVisible();

    await page.getByTestId("action-status-select").selectOption("COMPLETED");
    await page.getByTestId("action-result-input").fill("Hardware parts received and antenna replaced successfully.");
    await page.getByTestId("save-action-btn").click();
    await expect(modal).not.toBeVisible({ timeout: 10000 });

    // Formally resolve ticket with mandatory resolution summary >= 5 chars (AC-09, BR-13)
    await statusSelect.selectOption("RESOLVED");
    await page.getByTestId("resolution-summary-input").fill("Replaced antenna module, tested RSSI signal, and verified 100Mbps bandwidth.");
    await page.getByTestId("update-status-btn").click();

    // Verify resolution success
    await expect(page.getByTestId("success-banner")).toBeVisible({ timeout: 10000 });
    const resolvedBadge = page.locator(".badge", { hasText: /Resolved/i });
    await expect(resolvedBadge.first()).toBeVisible();
  });
});
