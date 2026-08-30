import { defineConfig, devices } from "@playwright/test";
import { loadEnv } from "./tests/e2e/helpers/env";
import { assertTestEnvironment } from "./tests/e2e/helpers/guard";

// E2E tests hit a real Next.js server backed by a real MySQL + Redis — the
// money-critical flows (checkout, stock decrement, admin status changes) are
// exactly the code we must not fake.
//
// That database MUST be a throwaway: .env.test overrides .env here, and the
// guard aborts the run if DATABASE_URL still resolves to a hosted/production
// host. The check runs at config load, before the web server is spawned, so
// a misconfigured run dies before Next.js can open a connection.
loadEnv();
// ONE call, covering every external connection: database, Redis, R2 bucket,
// mail and SMS delivery modes. It replaces the pair of per-service checks that
// used to live here — Redis was added to that pair only after a run against the
// production Upstash, and a guard that grows one entry per incident is always
// one connection behind. New integrations are declared in EXTERNAL_CONNECTIONS
// in helpers/guard.ts, and helpers/guard.spec.ts proves the guard still fires.
assertTestEnvironment();

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
    // The test server has no reverse proxy in front of it, so getClientIp()
    // can establish no trusted client IP and the fail-closed per-IP limiters
    // deny EVERY login and checkout. .env.test sets TRUSTED_PROXY=vercel;
    // this supplies the header that mode reads, standing in for the proxy.
    // A fixed value is correct here: the suite is one logical client, and
    // global-setup clears the counters between runs.
    extraHTTPHeaders: { "x-vercel-forwarded-for": "203.0.113.10" },
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    // CI builds first (see workflow) and runs the production server; locally
    // reuse a dev server you already have running, or start one.
    command: process.env.CI ? "npm run start" : "npm run dev",
    url: baseURL,
    // Next loads .env itself and does NOT read .env.test, so the test-only
    // values loaded into THIS process above are passed down explicitly.
    // Without this the server keeps .env's production DATABASE_URL/REDIS_URL
    // and no TRUSTED_PROXY at all.
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "",
      REDIS_URL: process.env.REDIS_URL ?? "",
      TRUSTED_PROXY: process.env.TRUSTED_PROXY ?? "vercel",
    },
    // A server already running on this port was started from .env — i.e.
    // against PRODUCTION TiDB and Upstash — and reusing it would point the
    // whole suite at live data while the guard above reports everything is
    // fine (the guard checks this process's env, not the server's).
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
