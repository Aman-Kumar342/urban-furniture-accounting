import { test, expect } from "@playwright/test";
import { login, loginStaff } from "./helpers";

test.describe("RBAC and customer-portal isolation", () => {
  test("a customer lands in the portal, not the staff workspace", async ({ page }) => {
    await login(page, "contact");
    await expect(page).toHaveURL(/\/portal$/);
    await expect(page.getByRole("heading", { name: "Your invoices" })).toBeVisible();
    // The staff sidebar groups must not be present in the customer chrome.
    await expect(page.getByText("Chart of Accounts")).toHaveCount(0);
  });

  test("a customer cannot reach staff screens (redirected to the portal)", async ({ page }) => {
    await login(page, "contact");
    await expect(page).toHaveURL(/\/portal$/);

    for (const staffRoute of ["/contacts", "/sales-orders", "/journal-entries", "/reports/profit-loss"]) {
      await page.goto(staffRoute);
      await expect(page, `contact should be bounced from ${staffRoute}`).toHaveURL(/\/portal$/);
    }
  });

  test("staff APIs reject a customer session with 403", async ({ page }) => {
    await login(page, "contact");
    await expect(page).toHaveURL(/\/portal$/);

    // Fetch from inside the page so the browser sends the (Secure) session cookie — this hits the
    // real API boundary as the signed-in contact. Wrong role → 403 (not merely unauthenticated).
    for (const api of ["/api/contacts", "/api/accounts", "/api/journal-entries"]) {
      const status = await page.evaluate((url) => fetch(url).then((r) => r.status), api);
      expect(status, `${api} should be forbidden for a contact`).toBe(403);
    }
  });

  test("the customer portal exposes no way to pay (payments are staff-only)", async ({ page }) => {
    await login(page, "contact");
    await expect(page.getByRole("button", { name: /pay/i })).toHaveCount(0);
  });

  test("staff cannot open the customer portal (redirected to the workspace)", async ({ page }) => {
    await loginStaff(page, "accountant");
    await page.goto("/portal");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Sales orders" })).toBeVisible();
  });
});
