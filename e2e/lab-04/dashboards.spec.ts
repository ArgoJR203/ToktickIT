import { test, expect } from "@playwright/test";

test.describe("Lab 4 E2E Suite: Dashboards Metrics & Drill-down Navigation (E2E-03)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
  });

  /**
   * E2E-03.1: Requester Dashboard metrics, refresh, and drill-down navigation (AC-02, AC-12, BR-15)
   */
  test("Requester dashboard displays scoped metrics and navigates to filtered ticket list via drill-down", async ({ page }) => {
    test.setTimeout(60000);

    // 1. Sign in as Requester (Jennifer Anderson)
    await page.locator("#email").fill("jennifer.anderson@example.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Verify Requester Dashboard landing view
    await expect(page.getByTestId("requester-dashboard-view")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Welcome, Jennifer!/i })).toBeVisible();

    // Verify all 4 Requester metric cards
    await expect(page.getByTestId("metric-total-open")).toBeVisible();
    await expect(page.getByTestId("metric-waiting-requester")).toBeVisible();
    await expect(page.getByTestId("metric-resolved")).toBeVisible();
    await expect(page.getByTestId("metric-closed")).toBeVisible();

    // Verify refresh dashboard button works without error
    await page.getByTestId("refresh-dashboard-btn").click();
    await expect(page.getByTestId("metric-total-open")).toBeVisible();

    // Test drill-down: My Open Tickets -> My Tickets list filtered
    await page.getByTestId("drilldown-total-open").click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });

    // Navigate back to Dashboard via Header tab
    await page.getByTestId("nav-dashboard-tab").click();
    await expect(page.getByTestId("requester-dashboard-view")).toBeVisible({ timeout: 10000 });

    // Test drill-down: Waiting on Me -> My Tickets list
    await page.getByTestId("drilldown-waiting-requester").click();
    await expect(page.getByRole("heading", { name: "My Tickets" })).toBeVisible({ timeout: 10000 });

    // Logout
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  });

  /**
   * E2E-03.2: IT Staff Dashboard operational counts, queue drill-down, and no admin stats (AC-10, AC-12, BR-16)
   */
  test("IT Staff dashboard displays 5 operational cards, queue drill-down, and excludes admin statistics", async ({ page }) => {
    test.setTimeout(60000);

    // 1. Sign in as IT Staff (Alex Thompson)
    await page.locator("#email").fill("alex.thompson@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Verify Staff Dashboard landing view
    await expect(page.getByTestId("staff-dashboard-view")).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("heading", { name: /Welcome back, Alex!/i })).toBeVisible();

    // Verify all 5 Operational Metric Cards
    await expect(page.getByTestId("metric-unassigned")).toBeVisible();
    await expect(page.getByTestId("metric-open")).toBeVisible();
    await expect(page.getByTestId("metric-in-progress")).toBeVisible();
    await expect(page.getByTestId("metric-waiting-requester")).toBeVisible();
    await expect(page.getByTestId("metric-assigned-to-me")).toBeVisible();

    // Verify Recent Queue panel & Quick Actions
    await expect(page.getByTestId("recent-queue-panel")).toBeVisible();
    await expect(page.getByTestId("quick-actions-panel")).toBeVisible();

    // CRITICAL: IT Staff must NOT see Administrator Statistics card (Role Isolation, BR-17)
    await expect(page.getByTestId("admin-stats-card")).not.toBeVisible();

    // Test drill-down: Unassigned -> Ticket Queue filtered by unassigned
    await page.getByTestId("drilldown-unassigned").click();
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });

    // Return to dashboard
    await page.getByTestId("nav-dashboard-tab").click();
    await expect(page.getByTestId("staff-dashboard-view")).toBeVisible({ timeout: 10000 });

    // Test drill-down: My Assigned -> Ticket Queue filtered by assigned to me
    await page.getByTestId("drilldown-assigned-to-me").click();
    await expect(page.getByRole("heading", { name: "Ticket Queue" })).toBeVisible({ timeout: 10000 });

    // Logout
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  });

  /**
   * E2E-03.3: Administrator Dashboard includes user account summary statistics (AC-11, BR-17)
   */
  test("Administrator dashboard displays operational cards AND admin statistics card", async ({ page }) => {
    test.setTimeout(60000);

    // 1. Sign in as Administrator (John Smith)
    await page.locator("#email").fill("john.smith@toktickit.com");
    await page.locator("#password").fill("Password123!");
    await page.getByRole("button", { name: /sign in/i }).click();

    // Verify Dashboard view
    await expect(page.getByTestId("staff-dashboard-view")).toBeVisible({ timeout: 10000 });

    // Verify Administrator Statistics Card IS visible for admin (AC-11, BR-17)
    const adminStatsCard = page.getByTestId("admin-stats-card");
    await expect(adminStatsCard).toBeVisible({ timeout: 10000 });

    // Verify statistical items in Admin Statistics Card
    await expect(adminStatsCard).toContainText(/Total Accounts:/i);
    await expect(adminStatsCard).toContainText(/IT Staff:/i);
    await expect(adminStatsCard).toContainText(/Requesters:/i);

    // Logout
    await page.locator("header").getByRole("button", { name: /logout/i }).click();
    await expect(page.getByRole("heading", { name: "Sign in to your account" })).toBeVisible();
  });
});
