import { test, expect } from "@playwright/test";

test.describe("Lab 3 E2E Suite: Administrator User Management & Safety (E2E-04)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  /**
   * E2E-04: Administrator User Lifecycle, Safety Rules & Password Reset (AC-13..16)
   * Create user with initial password, enforce self-deactivation safety alert & disabled switch,
   * preserve last active admin, edit user profile, and assign new temporary initial password.
   */
  test("E2E-04: Administrator user lifecycle, safety enforcement, and credential management", async ({ page }) => {
    // 1. Login as Administrator (John Smith)
    await page.goto("/");
    await page.locator("#email").fill("john.smith@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.locator("header").getByText("John Smith")).toBeVisible({ timeout: 10000 });

    // Navigate to User Management
    await page.locator("header").getByRole("button", { name: "User Management" }).click();
    await expect(page.getByTestId("user-management-page")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("users-table")).toBeVisible();

    // Verify Active Admins count badge is displayed
    const activeAdminsBadge = page.getByTestId("active-admins-count-badge");
    await expect(activeAdminsBadge).toBeVisible();
    await expect(activeAdminsBadge).toContainText(/Active Admins:/i);

    // 2. Administrator Creates a New User with Initial Password (AC-13, FR-18, API-20)
    const uniqueId = Date.now().toString().slice(-6);
    const newStaffName = `E2E Staff Member ${uniqueId}`;
    const newStaffEmail = `staff.e2e.${uniqueId}@toktickit.com`;
    const initialPassword = "InitialSecret123!";

    await page.getByTestId("btn-create-user").click();
    await expect(page.getByTestId("create-user-modal")).toBeVisible();

    await page.getByTestId("create-name-input").fill(newStaffName);
    await page.getByTestId("create-email-input").fill(newStaffEmail);
    await page.getByTestId("create-role-select").selectOption("IT_STAFF");
    await page.getByTestId("create-password-input").fill(initialPassword);

    await page.getByTestId("btn-submit-create-user").click();

    // Verify creation success and modal dismiss
    await expect(page.getByTestId("create-success")).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId("create-user-modal")).not.toBeVisible({ timeout: 5000 });

    // Verify newly created user in table
    const searchInput = page.getByTestId("search-users-input");
    await searchInput.fill(newStaffEmail);
    await page.waitForTimeout(500);

    const createdUserRow = page.locator("tr", { hasText: newStaffEmail });
    await expect(createdUserRow).toBeVisible({ timeout: 5000 });
    await expect(createdUserRow).toContainText(newStaffName);
    await expect(createdUserRow.getByTestId("role-badge")).toHaveText(/IT Staff/i);
    await expect(createdUserRow.getByTestId("badge-must-change-password")).toBeVisible();

    // 3. Administrator Self-Deactivation Protection (AC-14, BR-21, API-22)
    // Clear search filter to show all users
    await searchInput.fill("");
    await page.waitForTimeout(500);

    const adminRow = page.locator("tr", { hasText: "john.smith@toktickit.com" });
    await expect(adminRow).toBeVisible();
    await adminRow.getByRole("button", { name: /edit/i }).click();

    // Verify Edit Modal opens with Safety Alerts
    await expect(page.getByTestId("edit-user-modal")).toBeVisible();
    await expect(page.getByTestId("self-deactivation-warning")).toBeVisible();
    await expect(page.getByTestId("self-deactivation-warning")).toContainText(
      /cannot deactivate (your|their) own/i
    );

    // Verify Active checkbox is strictly disabled
    const adminActiveSwitch = page.getByTestId("edit-active-checkbox");
    await expect(adminActiveSwitch).toBeDisabled();

    // Close modal
    await page.getByTestId("edit-user-modal").getByRole("button", { name: "Close" }).first().click();
    await expect(page.getByTestId("edit-user-modal")).not.toBeVisible();

    // 4. Edit User Profile Details & Reset Password (AC-16, FR-20, API-24)
    // Re-find the created staff member
    await searchInput.fill(newStaffEmail);
    await page.waitForTimeout(500);

    const targetRow = page.locator("tr", { hasText: newStaffEmail });
    await targetRow.getByRole("button", { name: /edit/i }).click();
    await expect(page.getByTestId("edit-user-modal")).toBeVisible();

    // For non-self, active switch is enabled
    const userActiveSwitch = page.getByTestId("edit-active-checkbox");
    await expect(userActiveSwitch).toBeEnabled();

    // Update name
    const updatedName = `${newStaffName} (Updated)`;
    await page.getByTestId("edit-name-input").fill(updatedName);
    await page.getByTestId("btn-submit-edit-user").click();
    await expect(page.getByTestId("edit-success")).toBeVisible({ timeout: 5000 });

    // 5. Assign New Temporary Password (API-24, AC-16)
    const newTempPassword = "NewTemporaryPass456!";
    await page.getByTestId("reset-password-input").fill(newTempPassword);
    await page.getByTestId("btn-reset-password").click();

    await expect(page.getByTestId("reset-password-success")).toBeVisible({ timeout: 5000 });
    await expect(page.getByTestId("reset-password-success")).toContainText(
      /must change their password upon their next login/i
    );

    // Close modal
    await page.getByTestId("edit-user-modal").getByRole("button", { name: "Close" }).first().click();
    await expect(page.getByTestId("edit-user-modal")).not.toBeVisible();

    // 6. Verify target user can login with new temporary password and is prompted to change it
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();

    await page.locator("#email").fill(newStaffEmail);
    await page.locator("#password").fill(newTempPassword);
    await page.getByRole("button", { name: /sign in/i }).click();

    // User is immediately gated by mandatory password change screen
    await expect(page.getByRole("heading", { name: /Change Your Password/i })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/You must change your initial password before continuing/i)).toBeVisible();
  });
});
