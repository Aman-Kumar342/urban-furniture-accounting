import { test, expect } from "@playwright/test";
import { loginStaff, uniq } from "./helpers";

// Broader coverage of the master-data create forms and the List/Kanban toggle.
test.describe("Master data", () => {
  test.beforeEach(async ({ page }) => {
    await loginStaff(page, "accountant");
  });

  test("create a contact through the form, landing on its detail", async ({ page }) => {
    await page.goto("/contacts/new");
    const name = uniq("Form Contact");
    await page.getByLabel("Name").fill(name);
    await page.getByRole("button", { name: "Create contact" }).click();
    await expect(page).toHaveURL(/\/contacts\/[0-9a-f-]+$/);
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
    await expect(page.getByLabel("Name")).toHaveValue(name);
  });

  test("create a product through the form, landing on its detail", async ({ page }) => {
    await page.goto("/products/new");
    await page.getByLabel("Product name").fill(uniq("Form Product"));
    await page.getByLabel("Sales price").fill("12000");
    await page.getByLabel("Cost").fill("7000");
    await page.getByRole("button", { name: "Create product" }).click();
    await expect(page).toHaveURL(/\/products\/[0-9a-f-]+$/);
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
  });

  test("the Contacts list switches between List and Kanban", async ({ page }) => {
    await page.goto("/contacts");
    await page.getByRole("button", { name: "Kanban view" }).click();
    await expect(page.getByRole("button", { name: "Kanban view" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "List view" }).click();
    await expect(page.getByRole("button", { name: "List view" })).toHaveAttribute("aria-pressed", "true");
  });
});
