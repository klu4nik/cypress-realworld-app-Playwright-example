import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

// Same as cypress.config.ts: pull SEED_DEFAULT_USER_PASSWORD, VITE_BACKEND_PORT,
// PAGINATION_PAGE_SIZE, etc. into process.env so the specs and support helpers
// see the exact values the app was started with.
dotenv.config({ path: ".env.local" });
dotenv.config();

/**
 * Playwright port of the Cypress RealWorld App UI suite — see
 * playwright/README.md for structure, coverage status, and porting notes.
 */
export default defineConfig({
  testDir: "./playwright/tests",
  // The sign-up -> login -> onboarding -> bank-account flow is a long one;
  // 10s per test step wasn't enough headroom.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false, // tests share a live backend and its local JSON db; keep runs serial
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { open: "never" }]],
  // Resets data/database.json back to its seed state once the whole run
  // finishes — see playwright/global-teardown.ts for why this runs once
  // at the end rather than between individual tests.
  globalTeardown: "./playwright/global-teardown.ts",

  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    testIdAttribute: "data-test",
  },

  projects: [
    {
      name: "chromium-desktop",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] }, // used to exercise the isMobile() sidenav-toggle branch
    },
  ],

  // Boots the same app the Cypress suite targets.
  // Comment out if you already have `yarn dev` running locally.
  webServer: {
    command: "yarn dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
