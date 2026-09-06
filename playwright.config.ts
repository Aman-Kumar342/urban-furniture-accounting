import { defineConfig, devices } from "@playwright/test";

// E2E runs against a real production build talking to a real Postgres database — the same
// stack that ships. Point at an already-running server with E2E_BASE_URL, otherwise Playwright
// builds nothing and just starts `next start` on :3100 (see webServer below).
const BASE_URL = process.env.E2E_BASE_URL || "http://127.0.0.1:3100";

export default defineConfig({
  testDir: "./e2e",
  // The suite drives real accounting workflows against one shared database, so order matters and
  // parallelism would race the ledger. Keep it deterministic.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI ? [["github"], ["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: /mobile\.spec\.ts/,
    },
    {
      // The staff workspace and customer portal both have to be usable on a phone. This project
      // re-runs the mobile spec at a real Pixel 5 viewport.
      name: "mobile",
      use: { ...devices["Pixel 5"] },
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run start -- -p 3100",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
