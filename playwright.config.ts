import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "./tests/e2e/helpers/env";

// E2E tests hit a real Next.js server backed by the real MySQL + Redis from
// .env — the money-critical flows (checkout, stock decrement, admin status
// changes) are exactly the code we must not fake.
loadEnv();

const PORT = Number(process.env.E2E_PORT ?? 3000);
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalSetup: "./tests/e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  // Checkout rate limits are per-phone/per-IP; retries with fresh phone
  // numbers are safe, but fail fast in CI to surface real breakage.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  // 90s: local runs use `npm run dev`, where the FIRST navigation to a route
  // pays an on-demand compile cost that can exceed 60s for heavier routes
  // (e.g. the payment gateway page). CI builds first, so this is headroom.
  timeout: 90_000,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI builds first (see workflow) and runs the production server; locally
    // reuse a dev server you already have running, or start one.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
