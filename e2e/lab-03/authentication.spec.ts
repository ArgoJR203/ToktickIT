import { test, expect } from "@playwright/test";

test.describe("Lab 3 E2E Suite: Authentication & Role Workflows (E2E-01, E2E-02)", () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test for clean session
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  /**
   * E2E-01: Authentication & Role Navigation Flow (AC-01, AC-06, FR-01, FR-06)
   * Verify Requester, IT Staff, Administrator authentication, tailored navigation tabs,
   * inactive account rejection, and logout invalidation.
   */
  test("E2E-01: Complete authentication and role-tailored navigation flow", async ({ page }) => {
    await page.goto("/");

    // 1. Verify Login Screen presence
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
    const emailInput = page.locator("#email");
    const passwordInput = page.locator("#password");
    const signInBtn = page.getByRole("button", { name: /sign in/i });

    // 2. Inactive Account Rejection (AC-05, BR-01)
    await emailInput.fill("robert.taylor@example.com"); // Inactive Requester in seed
    await passwordInput.fill("Password123!");
    await signInBtn.click();

    // Verify safe error message is displayed
    const errorAlert = page.locator('[role="alert"]');
    await expect(errorAlert).toBeVisible({ timeout: 10000 });
    await expect(errorAlert).toContainText(/Invalid email or password/i);

    // 3. Login as Requester (Jennifer Anderson)
    await emailInput.fill("jennifer.anderson@example.com");
    await passwordInput.fill("Password123!");
    await signInBtn.click();

    // Verify Requester Dashboard & Role Badge
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });
    const header = page.locator("header");
    await expect(header.getByText("Jennifer Anderson")).toBeVisible();
    await expect(header.getByTestId("role-badge")).toHaveText(/Requester/i);

    // Verify Requester Navigation: My Tickets and Create Ticket visible; Ticket Queue & User Management hidden
    await expect(header.getByRole("button", { name: "My Tickets" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Create Ticket" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Ticket Queue" })).not.toBeVisible();
    await expect(header.getByRole("button", { name: "User Management" })).not.toBeVisible();

    // Logout as Requester (AC-06)
    await header.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // 4. Login as IT Staff (Alex Thompson)
    await emailInput.fill("alex.thompson@toktickit.com");
    await passwordInput.fill("Password123!");
    await signInBtn.click();

    // Verify IT Staff Dashboard & Role Badge
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });
    await expect(header.getByText("Alex Thompson")).toBeVisible();
    await expect(header.getByTestId("role-badge")).toHaveText(/IT Staff/i);

    // Verify IT Staff Navigation: Ticket Queue and Create Ticket visible; User Management hidden
    await expect(header.getByRole("button", { name: "Ticket Queue" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Create Ticket" })).toBeVisible();
    await expect(header.getByRole("button", { name: "User Management" })).not.toBeVisible();

    // Logout as IT Staff
    await header.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // 5. Login as Administrator (John Smith)
    await emailInput.fill("john.smith@toktickit.com");
    await passwordInput.fill("Password123!");
    await signInBtn.click();

    // Verify Administrator Dashboard & Role Badge
    await expect(header.getByText("John Smith")).toBeVisible({ timeout: 10000 });
    await expect(header.getByTestId("role-badge")).toHaveText(/Administrator/i);

    // Verify Administrator Navigation: User Management and Ticket Queue visible
    await expect(header.getByRole("button", { name: "User Management" })).toBeVisible();
    await expect(header.getByRole("button", { name: "Ticket Queue" })).toBeVisible();

    // Logout as Administrator
    await header.getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  });

  /**
   * E2E-02: Initial Password Login and Change (AC-02, BR-02, Handout §10)
   * User marked with mustChangePassword: true is gated to password change screen.
   * Dynamic checklist validates criteria. Application enters normal dashboard only after change.
   */
  test("E2E-02: Initial password login and mandatory change workflow", async ({ page }) => {
    // Generate a fresh unique email and user with mustChangePassword = true via admin API
    // First, login as Admin to provision a test user
    await page.goto("/");
    await page.locator("#email").fill("john.smith@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.locator("header").getByText("John Smith")).toBeVisible({ timeout: 10000 });

    // Navigate to User Management
    await page.locator("header").getByRole("button", { name: "User Management" }).click();
    await expect(page.getByTestId("btn-create-user")).toBeVisible();

    // Create a new user with initial password
    const testId = Date.now().toString().slice(-6);
    const testEmail = `pwchange.tester.${testId}@example.com`;
    const initialPw = "InitialPass123!";
    const newPw = "FinalSecret456!";

    await page.getByTestId("btn-create-user").click();
    await expect(page.getByTestId("create-user-modal")).toBeVisible();

    await page.getByTestId("create-name-input").fill(`David Tester ${testId}`);
    await page.getByTestId("create-email-input").fill(testEmail);
    await page.getByTestId("create-role-select").selectOption("REQUESTER");
    await page.getByTestId("create-password-input").fill(initialPw);
    await page.getByTestId("btn-submit-create-user").click();

    // Wait for user to be created and modal to close
    await expect(page.getByTestId("create-success")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("create-user-modal")).not.toBeVisible({ timeout: 5000 });

    // Logout Admin
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    // 1. Login as the newly created user requiring password change
    await page.locator("#email").fill(testEmail);
    await page.locator("#password").fill(initialPw);
    await page.getByRole("button", { name: /sign in/i }).click();

    // 2. Verify Gated Mandatory Password Change screen
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/You must change your initial password before continuing/i)).toBeVisible();

    // Verify main navigation header links are NOT visible (app is completely gated)
    await expect(page.locator("header").getByRole("button", { name: "My Tickets" })).not.toBeVisible();
    await expect(page.locator("header").getByRole("button", { name: "Create Ticket" })).not.toBeVisible();

    const currentPwInput = page.locator("#current-password");
    const newPwInput = page.locator("#new-password");
    const confirmPwInput = page.locator("#confirm-password");
    const submitChangeBtn = page.getByRole("button", { name: "Continue" });

    // Submit button should initially be disabled
    await expect(submitChangeBtn).toBeDisabled();

    // 3. Test interactive validation checklist (BR-07)
    await currentPwInput.fill(initialPw);
    await newPwInput.fill("short"); // failing length, uppercase, number
    await confirmPwInput.fill("short");
    await expect(submitChangeBtn).toBeDisabled();

    // Fill valid new password
    await newPwInput.fill(newPw);
    await confirmPwInput.fill(newPw);

    // Verify submit button is now enabled
    await expect(submitChangeBtn).toBeEnabled();

    // 4. Submit password change
    await submitChangeBtn.click();

    // 5. Verify successful transition to normal application (My Tickets dashboard)
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("header").getByText(`David Tester ${testId}`)).toBeVisible();
    await expect(page.locator("header").getByRole("button", { name: "My Tickets" })).toBeVisible();

    // 6. Logout and verify subsequent login directly enters app without prompt
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    await page.locator("#email").fill(testEmail);
    await page.locator("#password").fill(newPw);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Directly reaches My Tickets without password change prompt
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).not.toBeVisible();
  });
});
