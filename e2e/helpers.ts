import { expect, type Page } from "@playwright/test";

// Seeded accounts (prisma/seed.ts). Dev passwords are documented, not secrets.
export const USERS = {
  admin: { email: "admin@urbanfurniture.test", password: "Admin@123" },
  accountant: { email: "accountant@urbanfurniture.test", password: "Account@123" },
  contact: { email: "nimesh@urbanfurniture.test", password: "Portal@123" },
} as const;

/** Sign in through the real login form (POST /api/auth/login sets the httpOnly session cookie). */
export async function login(page: Page, who: keyof typeof USERS) {
  const { email, password } = USERS[who];
  await page.goto("/login");
  await page.getByLabel("Login ID").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
}

/** Sign in as staff and wait until the dashboard has rendered. */
export async function loginStaff(page: Page, who: "admin" | "accountant" = "accountant") {
  await login(page, who);
  await expect(page.getByRole("heading", { name: "Sales orders" })).toBeVisible();
}

/** A collision-proof suffix so E2E-created records never clash across runs. */
export function uniq(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`;
}
