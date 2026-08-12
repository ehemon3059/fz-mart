import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Last line of defence for the rule in AGENTS.md / test.md: never run the E2E
 * suite against real customer or order data.
 *
 * This matters because the suite is not read-only. global-setup creates an
 * OWNER admin user, rewrites the entire `payments` settings group into MOCK
 * mode, creates a live coupon, and the specs race real checkouts that
 * decrement stock. Run once against production and the store is left with
 * mock payments enabled.
 *
 * Ordering note: the check runs on the ALREADY-RESOLVED process.env, after
 * .env.test has been layered over .env — so it validates what Prisma will
 * actually connect to, not what any single file happens to say.
 */

/** Hosted database providers — never a test target. */
const HOSTED_HOST_PATTERNS = [
  "tidbcloud.com",
  "planetscale",
  "rds.amazonaws.com",
  "azure.com",
  "digitalocean.com",
  "aivencloud.com",
  "scalegrid",
  "clever-cloud.com",
];

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0", "host.docker.internal"]);

function hostOf(url: string): string {
  // The mysql:// URL may carry a password with characters URL() tolerates but
  // that we never want to surface; only the host is read out here.
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

/** Reads DATABASE_URL straight out of .env, bypassing process.env. */
function productionUrlFromEnvFile(): string | null {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  } catch {
    return null;
  }
  const match = /^\s*DATABASE_URL\s*=\s*(.*)\s*$/m.exec(raw);
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function fail(reason: string, detail: string): never {
  throw new Error(
    [
      "",
      "  ✖ E2E ABORTED — refusing to run against a non-test database.",
      "",
      `    ${reason}`,
      `    ${detail}`,
      "",
      "    The E2E suite WRITES: it creates an admin user, switches the",
      "    payments settings group to MOCK mode, creates a coupon, and",
      "    decrements real stock. That must never hit a live store.",
      "",
      "    Fix: copy .env.test.example to .env.test and point DATABASE_URL",
      "    at a throwaway local database, then run: npm run db:migrate:test",
      "",
    ].join("\n"),
  );
}

/**
 * Throws unless DATABASE_URL looks like a disposable local test database.
 * Set E2E_ALLOW_UNSAFE_DB=1 to override (intended for a CI job that has
 * provisioned its own ephemeral service container).
 */
export function assertTestDatabase(): void {
  if (process.env.E2E_ALLOW_UNSAFE_DB === "1") return;

  const url = process.env.DATABASE_URL;
  if (!url) {
    fail("DATABASE_URL is not set.", "Nothing to connect to.");
  }

  const host = hostOf(url);
  if (!host) {
    fail("DATABASE_URL is not a parseable connection string.", `Got: ${url.slice(0, 24)}…`);
  }

  const hosted = HOSTED_HOST_PATTERNS.find((p) => host.includes(p));
  if (hosted) {
    fail(`DATABASE_URL points at a hosted provider (${hosted}).`, `Host: ${host}`);
  }

  if (!LOCAL_HOSTS.has(host)) {
    fail("DATABASE_URL is not a local host.", `Host: ${host} — expected localhost or 127.0.0.1.`);
  }

  // Same host AND same database name as .env means .env.test never took
  // effect — the likeliest real-world failure once someone runs MySQL
  // locally in production too.
  const productionUrl = productionUrlFromEnvFile();
  if (productionUrl && productionUrl === url) {
    fail(
      "DATABASE_URL is identical to the one in .env.",
      "Create .env.test with a separate database — see .env.test.example.",
    );
  }
}
