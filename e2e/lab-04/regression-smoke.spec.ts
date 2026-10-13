import { test, expect } from "@playwright/test";

test.describe("Lab 4 E2E Suite: Full Regression Verification Across Labs 1–3 (E2E-04)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  /**
   * Test 1: Authentication, Inactive Rejection, and Mandatory Password Change (AC-14, BR-01, BR-07)
   */
  test("Regression 1: Inactive account rejection and mandatory initial password change gate", async ({ page }) => {
    test.setTimeout(60000);

    // 1. Inactive account rejected
    await page.goto("/");
    await page.locator("#email").fill("robert.taylor@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(/Invalid email or password/i);

    // 2. Admin creates a temporary user requiring password change
    await page.locator("#email").fill("john.smith@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.locator("header").getByText("John Smith")).toBeVisible({ timeout: 10000 });

    await page.locator("header").getByRole("button", { name: "User Management" }).click();
    await expect(page.getByTestId("user-management-page")).toBeVisible({ timeout: 10000 });

    const uid = Date.now().toString().slice(-6);
    const tempEmail = `regr.user.${uid}@toktickit.com`;
    const tempInitialPw = "TempInitial123!";
    const newSecurePw = "NewSecurePass999!";

    await page.getByTestId("btn-create-user").click();
    await expect(page.getByTestId("create-user-modal")).toBeVisible();
    await page.getByTestId("create-name-input").fill(`Regr User ${uid}`);
    await page.getByTestId("create-email-input").fill(tempEmail);
    await page.getByTestId("create-role-select").selectOption("REQUESTER");
    await page.getByTestId("create-password-input").fill(tempInitialPw);
    await page.getByTestId("btn-submit-create-user").click();

    await expect(page.getByTestId("create-success")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("create-user-modal")).not.toBeVisible({ timeout: 5000 });

    // Logout Admin
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // 3. New user logs in and encounters mandatory password change screen
    await page.locator("#email").fill(tempEmail);
    await page.locator("#password").fill(tempInitialPw);
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible({ timeout: 10000 });
    await page.locator("#current-password").fill(tempInitialPw);
    await page.locator("#new-password").fill(newSecurePw);
    await page.locator("#confirm-password").fill(newSecurePw);
    await page.getByRole("button", { name: "Continue" }).click();

    // Successfully transitioned into dashboard
    await expect(page.getByRole("heading", { name: /My Tickets|Welcome/i })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("header").getByText(`Regr User ${uid}`)).toBeVisible();

    // Logout and re-login with new password
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    await page.locator("#email").fill(tempEmail);
    await page.locator("#password").fill(newSecurePw);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByRole("heading", { name: /My Tickets|Welcome/i })).toBeVisible({ timeout: 10000 });
  });

  /**
   * Test 2: Ticket Creation, Attachments, Public Comments, and Confidential Internal Notes (AC-14)
   */
  test("Regression 2: Ticket creation, file attachments, public comments, and confidential internal notes", async ({ page }) => {
    test.setTimeout(60000);

    // 1. Requester signs in and creates ticket
    await page.goto("/");
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByTestId("requester-dashboard-view")).toBeVisible({ timeout: 10000 });
    await page.getByTestId("quick-create-ticket-btn").click();
    await expect(page.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible({ timeout: 10000 });

    const uid = Date.now().toString().slice(-5);
    const summary = `Regression Smoke Ticket ${uid}`;
    await page.locator("#categoryId").selectOption({ label: "Network" });
    await page.locator("#relatedSystemId").selectOption({ label: "Campus Wi-Fi" });
    await page.locator("#requestedPriority").selectOption("MEDIUM");
    await page.locator("#summary").fill(summary);
    await page.locator("#description").fill(`Testing regression flows across all features #${uid}`);

    // Attach valid PNG image during creation (BR-12, BR-13)
    const PNG_1X1 = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64"
    );
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: `smoke-log-${uid}.png`,
      mimeType: "image/png",
      buffer: PNG_1X1,
    });

    await page.getByRole("button", { name: "Submit Ticket" }).click();

    const successBanner = page.locator(".zen-alert-success");
    await expect(successBanner).toBeVisible({ timeout: 10000 });
    const match = (await successBanner.innerText()).match(/TKT-\d{4}-\d{6}/);
    expect(match).not.toBeNull();
    const ticketNumber = match![0];

    // Go to My Tickets and open newly created ticket
    await page.getByTestId("nav-my-tickets-tab").click();
    await page.locator("tr", { hasText: ticketNumber }).first().click();
    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

    // Post a public comment as Requester
    const commentInput = page.locator("textarea").first();
    await commentInput.fill("I noticed packet drops intermittently.");
    await page.getByRole("button", { name: "Post Comment" }).click();
    await expect(page.getByText("I noticed packet drops intermittently.")).toBeVisible({ timeout: 10000 });

    // Verify Requester cannot see Internal Notes tab
    await expect(page.getByTestId("tab-internal-notes")).not.toBeVisible();

    // Logout Requester
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // 2. Staff signs in and views ticket
    await page.locator("#email").fill("alex.thompson@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.getByTestId("nav-ticket-queue-tab").click();
    await page.locator('[data-testid="search-input"]').fill(ticketNumber);
    await page.waitForTimeout(500);
    await page.locator("tr", { hasText: ticketNumber }).first().locator('[data-testid="view-details-btn"]').click();
    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

    // Staff sees Requester's public comment and attachment
    await expect(page.getByText("I noticed packet drops intermittently.")).toBeVisible();
    await expect(page.getByText(`smoke-log-${uid}.png`)).toBeVisible();

    // Staff posts confidential internal note
    await page.getByTestId("tab-internal-notes").click();
    await page.getByTestId("internal-note-input").fill("Checked AP switch port. Fiber optics link looks stable.");
    await page.getByTestId("post-note-btn").click();
    await expect(page.getByText("Checked AP switch port. Fiber optics link looks stable.")).toBeVisible({ timeout: 10000 });

    // Logout Staff
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // 3. Requester signs back in and confirms internal note is NEVER exposed
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await page.getByTestId("nav-my-tickets-tab").click();
    await page.locator("tr", { hasText: ticketNumber }).first().click();
    await expect(page.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

    // Confirm confidential note is not leaked in the DOM or UI
    await expect(page.getByText("Checked AP switch port")).toHaveCount(0);
    await expect(page.getByTestId("tab-internal-notes")).not.toBeVisible();
  });

  /**
   * Test 3: Administrator User Management and Safety Invariants (AC-14)
   */
  test("Regression 3: Administrator user management, search filtering, and self-deactivation safety", async ({ page }) => {
    test.setTimeout(60000);

    // Sign in as Administrator
    await page.goto("/");
    await page.locator("#email").fill("john.smith@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Open User Management
    await page.locator("header").getByRole("button", { name: "User Management" }).click();
    await expect(page.getByTestId("user-management-page")).toBeVisible({ timeout: 10000 });

    // Check Active Admins Badge
    const activeAdminsBadge = page.getByTestId("active-admins-count-badge");
    await expect(activeAdminsBadge).toBeVisible();
    await expect(activeAdminsBadge).toContainText(/Active Admins:/i);

    // Search for self (John Smith) and open edit modal
    const searchInput = page.getByTestId("search-users-input");
    await searchInput.fill("john.smith@toktickit.com");
    await page.waitForTimeout(500);

    const selfRow = page.locator("tr", { hasText: "john.smith@toktickit.com" });
    await expect(selfRow.first()).toBeVisible();
    await selfRow.first().getByRole("button", { name: /edit/i }).click();

    // Verify self-deactivation warning is present and active checkbox is disabled
    await expect(page.getByTestId("edit-user-modal")).toBeVisible();
    await expect(page.getByTestId("self-deactivation-warning")).toBeVisible();
    await expect(page.getByTestId("edit-active-checkbox")).toBeDisabled();
  });
});
