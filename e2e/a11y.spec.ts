import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { loginStaff } from "./helpers";

// Automated accessibility scan (axe-core). We fail the build only on serious/critical issues so
// the gate is meaningful rather than noisy.
async function seriousViolations(page: import("@playwright/test").Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return violations.filter((v) => v.impact === "serious" || v.impact === "critical");
}

test.describe("Accessibility (axe-core)", () => {
  test("login page has no serious/critical violations", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    const v = await seriousViolations(page);
    expect(v, JSON.stringify(v.map((x) => ({ id: x.id, nodes: x.nodes.length })), null, 2)).toEqual([]);
  });

  test("dashboard has no serious/critical violations", async ({ page }) => {
    await loginStaff(page, "accountant");
    const v = await seriousViolations(page);
    expect(v, JSON.stringify(v.map((x) => ({ id: x.id, nodes: x.nodes.length })), null, 2)).toEqual([]);
  });

  test("sales orders list has no serious/critical violations", async ({ page }) => {
    await loginStaff(page, "accountant");
    await page.goto("/sales-orders");
    await expect(page.getByRole("heading", { name: /sales orders/i })).toBeVisible();
    const v = await seriousViolations(page);
    expect(v, JSON.stringify(v.map((x) => ({ id: x.id, nodes: x.nodes.length })), null, 2)).toEqual([]);
  });
});
