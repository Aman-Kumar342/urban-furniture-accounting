import { test, expect } from "@playwright/test";
import { login, loginStaff, USERS } from "./helpers";

test.describe("Authentication", () => {
  test("unauthenticated visitor is sent to the login page", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/); // may carry ?next=
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  });

  test("a deep link, then login, returns the visitor to where they were headed", async ({ page }) => {
    await page.goto("/sales-orders");
    await expect(page).toHaveURL(/\/login\?next=/);
    await page.getByLabel("Login ID").fill(USERS.accountant.email);
    await page.getByLabel("Password").fill(USERS.accountant.password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/sales-orders$/);
  });

  test("wrong password shows a clear inline error and does not sign in", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Login ID").fill(USERS.accountant.email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Invalid Login ID or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("accountant signs in and lands on the dashboard", async ({ page }) => {
    await loginStaff(page, "accountant");
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("heading", { name: "Purchase orders" })).toBeVisible();
  });

  test("sign out returns to the login page and the session is cleared", async ({ page }) => {
    await loginStaff(page, "accountant");
    await page.getByRole("button", { name: /sign out|log ?out/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    // Session gone: revisiting a protected route bounces back to login.
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("admin can sign in", async ({ page }) => {
    await login(page, "admin");
    await expect(page.getByRole("heading", { name: "Sales orders" })).toBeVisible();
  });
});
