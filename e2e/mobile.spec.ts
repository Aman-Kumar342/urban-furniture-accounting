import { test, expect, type Page } from "@playwright/test";
import { login, loginStaff } from "./helpers";

// Runs only on the "mobile" project (Pixel 5). Verifies the workspace and portal are usable on a
// phone: the drawer navigation works and nothing overflows the viewport horizontally.
async function horizontalOverflow(page: Page) {
  return page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
}

test.describe("Mobile layout", () => {
  test("staff can navigate via the drawer, with no horizontal overflow", async ({ page }) => {
    await loginStaff(page, "accountant");
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);

    // Sidebar is a drawer on mobile — open it, then navigate.
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("link", { name: "Contacts", exact: true }).click();
    await expect(page).toHaveURL(/\/contacts$/);
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });

  test("the customer portal fits the viewport", async ({ page }) => {
    await login(page, "contact");
    await expect(page.getByRole("heading", { name: "Your invoices" })).toBeVisible();
    expect(await horizontalOverflow(page)).toBeLessThanOrEqual(1);
  });
});
