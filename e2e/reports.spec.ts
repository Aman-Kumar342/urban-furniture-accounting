import { test, expect } from "@playwright/test";
import { loginStaff } from "./helpers";

// These assert the report screens load against the real ledger projection endpoints. The
// balance invariant itself is proved end-to-end in sales-flow.spec after a full posting cycle.
test.describe("Financial reports", () => {
  test.beforeEach(async ({ page }) => {
    await loginStaff(page, "accountant");
  });

  // Scope to <main> — the topbar renders the same section title as an <h1>.
  test("Profit & Loss renders", async ({ page }) => {
    await page.goto("/reports/profit-loss");
    await expect(page.getByRole("main").getByRole("heading", { name: "Profit & Loss" })).toBeVisible();
    // Either a populated statement or the honest empty state — never an error.
    await expect(page.getByText(/couldn't load the report/i)).toHaveCount(0);
  });

  test("Balance Sheet renders", async ({ page }) => {
    await page.goto("/reports/balance-sheet");
    await expect(page.getByRole("main").getByRole("heading", { name: "Balance Sheet" })).toBeVisible();
    await expect(page.getByText(/couldn't load the report/i)).toHaveCount(0);
  });

  test("Budget Report renders", async ({ page }) => {
    await page.goto("/reports/budget");
    await expect(page.getByRole("main").getByRole("heading", { name: "Budget Report" })).toBeVisible();
  });
});
