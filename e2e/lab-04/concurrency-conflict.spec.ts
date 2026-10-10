import { test, expect } from "@playwright/test";

test.describe("Lab 4 E2E Suite: Concurrency Collision & UI Recovery Flow (E2E-05)", () => {
  /**
   * E2E-05: Context A updates status, Context B updates same ticket, receives 409 STALE_UPDATE,
   * conflict banner displayed, reloads ticket, and successfully updates (AC-08, BR-14, UI-05).
   */
  test("Context A updates status, Context B updates same ticket, receives 409, and recovers on reload", async ({ browser }) => {
    test.setTimeout(60000);

    // 1. Create two separate browser contexts
    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    // Context A: Sign in as IT Staff (Alex Thompson)
    await pageA.goto("/");
    await pageA.locator("#email").fill("alex.thompson@toktickit.com");
    await pageA.locator("#password").fill("Password123!");
    await pageA.getByRole("button", { name: /sign in/i }).click();
    await expect(pageA.getByTestId("staff-dashboard-view")).toBeVisible({ timeout: 10000 });

    // Create a fresh ticket in Context A to guarantee clean known state
    await pageA.getByTestId("quick-create-ticket-btn").click();
    await expect(pageA.getByRole("heading", { name: "Create IT Support Ticket" })).toBeVisible({ timeout: 10000 });

    const uniqueId = Date.now().toString().slice(-5);
    await pageA.locator("#categoryId").waitFor({ state: "visible" });
    await pageA.locator("#categoryId").selectOption({ label: "Network" });
    await pageA.locator("#relatedSystemId").selectOption({ label: "Campus Wi-Fi" });
    await pageA.locator("#requestedPriority").selectOption("HIGH");
    await pageA.locator("#summary").fill(`OCC Test Ticket ${uniqueId}`);
    await pageA.locator("#description").fill(`Testing OCC collision 409 handling and recovery #${uniqueId}`);
    await pageA.getByRole("button", { name: "Submit Ticket" }).click();

    const successAlert = pageA.locator(".zen-alert-success");
    await expect(successAlert).toBeVisible({ timeout: 10000 });
    const match = (await successAlert.innerText()).match(/TKT-\d{4}-\d{6}/);
    expect(match).not.toBeNull();
    const ticketNumber = match![0];

    // Open ticket detail in Context A
    await pageA.getByTestId("nav-ticket-queue-tab").click();
    await pageA.locator('[data-testid="search-input"]').fill(ticketNumber);
    await pageA.waitForTimeout(500);
    await pageA.locator("tr", { hasText: ticketNumber }).first().locator('[data-testid="view-details-btn"]').click();
    await expect(pageA.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

    // Context B: Sign in as Administrator (John Smith)
    await pageB.goto("/");
    await pageB.locator("#email").fill("john.smith@toktickit.com");
    await pageB.locator("#password").fill("Password123!");
    await pageB.getByRole("button", { name: /sign in/i }).click();
    await expect(pageB.getByTestId("staff-dashboard-view")).toBeVisible({ timeout: 10000 });

    // Context B opens the EXACT same ticket detail
    await pageB.getByTestId("nav-ticket-queue-tab").click();
    await pageB.locator('[data-testid="search-input"]').fill(ticketNumber);
    await pageB.waitForTimeout(500);
    await pageB.locator("tr", { hasText: ticketNumber }).first().locator('[data-testid="view-details-btn"]').click();
    await expect(pageB.getByTestId("ticket-number")).toBeVisible({ timeout: 10000 });

    // Context A updates status to IN_PROGRESS (version increments in DB: 0 -> 1)
    await pageA.getByTestId("status-select").selectOption("IN_PROGRESS");
    await pageA.getByTestId("update-status-btn").click();
    await expect(pageA.getByTestId("success-banner")).toBeVisible({ timeout: 10000 });

    // Context B attempts to update status using stale version 0
    await pageB.getByTestId("status-select").selectOption("CANCELLED");
    await pageB.getByTestId("update-status-btn").click();

    // Context B must receive 409 and show conflict banner (AC-08, BR-14, UI-05)
    await expect(pageB.getByTestId("ticket-conflict-banner")).toBeVisible({ timeout: 10000 });
    await expect(pageB.getByTestId("ticket-conflict-banner")).toContainText(/Another staff member has updated this ticket/i);

    // Context B clicks reload button to refresh ticket data and version
    await pageB.getByTestId("reload-conflict-ticket-btn").click();
    await expect(pageB.getByTestId("ticket-conflict-banner")).not.toBeVisible({ timeout: 10000 });

    // In Context B, ticket status is now updated to IN_PROGRESS
    const currentStatusBadge = pageB.locator(".badge", { hasText: /In Progress/i });
    await expect(currentStatusBadge.first()).toBeVisible({ timeout: 10000 });

    // Context B can now successfully advance ticket without conflict
    await pageB.getByTestId("status-select").selectOption("WAITING_FOR_REQUESTER");
    await pageB.getByTestId("update-status-btn").click();
    await expect(pageB.getByTestId("success-banner")).toBeVisible({ timeout: 10000 });

    await contextA.close();
    await contextB.close();
  });
});
