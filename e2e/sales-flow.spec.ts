import { test, expect } from "@playwright/test";
import { loginStaff, uniq } from "./helpers";

// The end-to-end money path, driven entirely through the UI:
//   Sales order -> confirm -> invoice -> confirm (posts Dr Debtors / Cr Sales Income)
//   -> receive payment (posts Dr Bank / Cr Debtors) -> invoice PAID.
// Then the Balance Sheet must still balance — the accounting invariant, proven through the app.
test("a sale flows from order to a paid, posted invoice and the books stay balanced", async ({ page }) => {
  await loginStaff(page, "accountant");

  const customer = uniq("E2E Buyer");
  const product = uniq("E2E Oak Table");

  // Fixtures via the real API, from inside the page so the session cookie is sent.
  const created = await page.evaluate(
    async ({ customer, product }) => {
      const post = (url: string, body: unknown) =>
        fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const c = await post("/api/contacts", { name: customer, type: "CUSTOMER" });
      const p = await post("/api/products", { name: product, type: "GOODS", salesPrice: 12000, cost: 7000, categoryName: "E2E Furniture" });
      return { c: c.status, p: p.status };
    },
    { customer, product },
  );
  expect(created).toEqual({ c: 201, p: 201 });

  // 1. Draft the sales order (quantity defaults to 1; unit price auto-fills from the product).
  await page.goto("/sales-orders/new");
  await page.getByLabel("Customer").selectOption({ label: customer });
  await page
    .locator("select")
    .filter({ has: page.locator("option", { hasText: product }) })
    .selectOption({ label: product });
  await page.getByRole("button", { name: "Create sales order" }).click();

  // On the order — confirm it (click the action, then the confirmation).
  await expect(page.getByRole("button", { name: "Confirm order" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm order" }).click();
  await page.getByRole("button", { name: "Confirm order" }).click();

  // 2. Generate the customer invoice from the confirmed order.
  await expect(page.getByRole("button", { name: "Create invoice" })).toBeVisible();
  await page.getByRole("button", { name: "Create invoice" }).click();
  await page.getByRole("button", { name: "Create invoice" }).click();

  // 3. Confirm & post the invoice.
  await expect(page).toHaveURL(/\/invoices\//);
  await expect(page.getByRole("button", { name: "Confirm invoice" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm invoice" }).click();
  await page.getByRole("button", { name: "Confirm invoice" }).click();

  // 4. Receive the full amount due -> invoice becomes Paid.
  await expect(page.getByRole("button", { name: "Receive payment" })).toBeVisible();
  await page.getByRole("button", { name: "Receive payment" }).click();
  await expect(page.getByLabel("Amount", { exact: true })).toBeVisible();
  await page.locator("form").getByRole("button", { name: "Receive payment" }).click();
  await expect(page.getByText("Paid").first()).toBeVisible();

  // 5. The invariant: after a full posting cycle the Balance Sheet still balances.
  await page.goto("/reports/balance-sheet");
  await expect(page.getByText(/^Balanced/)).toBeVisible();
});
