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
 * REDIS IS GUARDED TOO, and for the same reason. .env.test only needs to
 * override what differs, and everything it omits falls back to .env — so a
 * .env.test carrying only DATABASE_URL silently pointed the suite at the
 * PRODUCTION Redis while the database was correctly local. That is not a
 * theoretical gap: session.spec.ts deletes session keys and expires TTLs
 * directly, which against production Redis logs real admins out. Sessions,
 * carts, rate-limit counters and the IP-block set all live there.
 *
 * Ordering note: the check runs on the ALREADY-RESOLVED process.env, after
 * .env.test has been layered over .env — so it validates what Prisma will
 * actually connect to, not what any single file happens to say.
 */

/** Hosted database and cache providers — never a test target. */
const HOSTED_HOST_PATTERNS = [
  "tidbcloud.com",
  "planetscale",
  "rds.amazonaws.com",
  "azure.com",
  "digitalocean.com",
  "aivencloud.com",
  "scalegrid",
  "clever-cloud.com",
  // Managed Redis
  "upstash.io",
  "redis-cloud.com",
  "redislabs.com",
  "redns.redis-cloud.com",
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

/** Reads a variable straight out of .env, bypassing process.env. */
function productionUrlFromEnvFile(key: string): string | null {
  let raw: string;
  try {
    raw = readFileSync(resolve(process.cwd(), ".env"), "utf8");
  } catch {
    return null;
  }
  const match = new RegExp(`^\\s*${key}\\s*=\\s*(.*)\\s*$`, "m").exec(raw);
  if (!match) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

function fail(reason: string, detail: string, fix?: string): never {
  throw new Error(
    [
      "",
      "  ✖ E2E ABORTED — refusing to run against non-test infrastructure.",
      "",
      `    ${reason}`,
      `    ${detail}`,
      "",
      "    The E2E suite WRITES: it creates an admin user, switches the",
      "    payments settings group to MOCK mode, creates a coupon,",
      "    decrements real stock, and deletes session keys from Redis.",
      "    That must never hit a live store.",
      "",
      `    Fix: ${
        fix ??
        "copy .env.test.example to .env.test and point DATABASE_URL\n" +
          "    at a throwaway local database, then run: npm run db:migrate:test"
      }`,
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
  const productionUrl = productionUrlFromEnvFile("DATABASE_URL");
  if (productionUrl && productionUrl === url) {
    fail(
      "DATABASE_URL is identical to the one in .env.",
      "Create .env.test with a separate database — see .env.test.example.",
    );
  }
}

/**
 * Throws unless REDIS_URL is a disposable local instance.
 *
 * Separate from the database check because the failure mode is different and
 * quieter: an unset REDIS_URL in .env.test does not error, it silently
 * INHERITS the production one from .env. The suite then passes while writing
 * to a live cache.
 *
 * Honours the same E2E_ALLOW_UNSAFE_DB override, so a CI job with ephemeral
 * service containers configures the exemption once.
 */
export function assertTestRedis(): void {
  if (process.env.E2E_ALLOW_UNSAFE_DB === "1") return;

  const url = process.env.REDIS_URL;
  // Unset is safe: lib/redis.ts falls back to a local default, and nothing
  // remote can be reached without an explicit URL.
  if (!url) return;

  const host = hostOf(url);
  if (!host) {
    fail(
      "REDIS_URL is not a parseable connection string.",
      `Got: ${url.slice(0, 16)}…`,
      "point REDIS_URL at a local Redis in .env.test.",
    );
  }

  const hosted = HOSTED_HOST_PATTERNS.find((p) => host.includes(p));
  if (hosted) {
    fail(
      `REDIS_URL points at a hosted provider (${hosted}).`,
      `Host: ${host}`,
      "add REDIS_URL=\"redis://127.0.0.1:6379\" to .env.test.\n" +
        "    Without it, .env.test inherits the production Redis from .env.",
    );
  }

  if (!LOCAL_HOSTS.has(host)) {
    fail(
      "REDIS_URL is not a local host.",
      `Host: ${host} — expected localhost or 127.0.0.1.`,
      "add REDIS_URL=\"redis://127.0.0.1:6379\" to .env.test.",
    );
  }

  // rediss:// to a local host is legal but signals a copied production URL.
  const productionRedis = productionUrlFromEnvFile("REDIS_URL");
  if (productionRedis && productionRedis === url) {
    fail(
      "REDIS_URL is identical to the one in .env.",
      "The suite would share a cache with the live site.",
      "set a separate REDIS_URL in .env.test.",
    );
  }
}

/* ------------------------------------------------------------------------ *
 * assertTestEnvironment — one check for EVERY external connection.
 *
 * The two functions above were each added after being burned: the database
 * check first, then the Redis check once a .env.test carrying only
 * DATABASE_URL silently inherited the production Upstash. That is the pattern
 * to break. A guard that grows one entry per incident is always exactly one
 * connection behind, and the next one to be forgotten is already visible —
 * R2_BUCKET is read by the upload path today and checked by nothing, so a
 * spec that uploads a product image writes to the client's live bucket. An
 * SMS adapter will be the one after that, and it sends real messages to real
 * phone numbers.
 *
 * So the rule is declarative and stated once: every external connection is
 * listed in EXTERNAL_CONNECTIONS below, and each must resolve to something
 * local, obviously test-named, or mocked. Adding a new integration means
 * adding a row here; the guard's own test (guard.spec.ts) fails if a known
 * dangerous value slips through.
 * ------------------------------------------------------------------------ */

type ConnectionCheck =
  | { kind: "url"; variable: string; required?: boolean }
  | { kind: "name"; variable: string; testMarkers: string[] }
  | { kind: "mode"; variable: string; safeValues: string[]; unsetIsSafe: boolean };

/**
 * Every external system a spec run can reach. `kind` selects how "is this
 * safe?" is decided, because the shape of the answer differs:
 *
 *   url   a connection string — the host must be local.
 *   name  a bare resource identifier with no host (an R2 bucket). There is no
 *         URL to inspect, so safety rests on the name declaring itself a test
 *         resource. A production bucket name simply won't contain "test".
 *   mode  a delivery switch. The safe answer is a value that sends nothing.
 */
const EXTERNAL_CONNECTIONS: ConnectionCheck[] = [
  // Databases and caches are covered in depth by the two functions above,
  // which also compare against .env; listed here so the inventory is complete.
  { kind: "url", variable: "DATABASE_URL", required: true },
  { kind: "url", variable: "REDIS_URL" },

  // Object storage. Unguarded until now: a spec that uploads a product image
  // writes into whatever bucket this names, and R2 has no "local" host to
  // check — the credentials point at Cloudflare either way. So the BUCKET NAME
  // must say it is disposable.
  { kind: "name", variable: "R2_BUCKET", testMarkers: ["test", "e2e", "dev", "local"] },

  // Mail. "inline" would really send through the configured SMTP server.
  { kind: "mode", variable: "MAIL_DELIVERY", safeValues: ["mock", "log", "none"], unsetIsSafe: true },

  // SMS/OTP is not built yet. Listed deliberately: the row exists BEFORE the
  // feature, so the day an adapter lands the guard already refuses to run
  // against a live provider. This is the whole point — the failure mode is a
  // test run that sends real messages to real customers' phones.
  { kind: "mode", variable: "SMS_PROVIDER", safeValues: ["mock", "log", "none"], unsetIsSafe: true },
];

function assertConnection(check: ConnectionCheck): void {
  const raw = process.env[check.variable]?.trim();

  if (check.kind === "mode") {
    if (!raw) {
      if (check.unsetIsSafe) return;
      fail(
        `${check.variable} is not set.`,
        `Expected one of: ${check.safeValues.join(", ")}.`,
        `set ${check.variable} to a non-delivering mode in .env.test.`,
      );
    }
    if (!check.safeValues.includes(raw.toLowerCase())) {
      fail(
        `${check.variable} is "${raw}", which DELIVERS FOR REAL.`,
        `A test run would send live messages. Expected one of: ${check.safeValues.join(", ")}.`,
        `set ${check.variable}="mock" in .env.test.`,
      );
    }
    return;
  }

  if (check.kind === "name") {
    // Unset means the feature is unconfigured, so nothing can be reached.
    if (!raw) return;
    const lower = raw.toLowerCase();
    if (!check.testMarkers.some((marker) => lower.includes(marker))) {
      fail(
        `${check.variable} is "${raw}", which is not identifiably a test resource.`,
        `Its name must contain one of: ${check.testMarkers.join(", ")}. ` +
          "There is no host to check on an object store — the name is the only signal, " +
          "so a production bucket is indistinguishable from a test one without it.",
        `set ${check.variable}="fz-mart-test" in .env.test.`,
      );
    }
    return;
  }

  // kind === "url" — delegated to the dedicated checks, which additionally
  // compare against .env. Only the "required but missing" case is handled here.
  if (!raw && check.required) {
    fail(`${check.variable} is not set.`, "Nothing to connect to.");
  }
}

/**
 * Validate EVERY external connection before any spec runs.
 *
 * Call this once from globalSetup. It subsumes assertTestDatabase and
 * assertTestRedis (both still exported, and still called, so the deep .env
 * comparisons they carry are not lost).
 */
export function assertTestEnvironment(): void {
  assertTestDatabase();
  assertTestRedis();

  // The override exempts hosts, not delivery modes: a CI job with ephemeral
  // service containers still must not send real mail or SMS. So this runs
  // regardless, and only the url-kind checks honour the exemption (inside the
  // two functions above).
  for (const check of EXTERNAL_CONNECTIONS) {
    if (check.kind === "url" && process.env.E2E_ALLOW_UNSAFE_DB === "1") continue;
    assertConnection(check);
  }
}
