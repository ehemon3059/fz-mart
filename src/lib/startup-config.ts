import "server-only";

/*
 * Fail at boot on missing critical config, instead of at every request.
 *
 * WHY THIS EXISTS. `TRUSTED_PROXY` unset makes getClientIp() return null, which
 * makes every 'closed' per-IP limiter deny — so login and checkout reject
 * everyone, one request at a time, while the site keeps returning 200 for
 * everything else. That is the worst possible way to surface a misconfigured
 * deployment: the container is healthy, the pages render, and the only symptom
 * is that no order ever completes. You find out from the client.
 *
 * The distinction this module draws:
 *
 *   "this request has no determinable IP"  — possibly an attacker. Deny it.
 *     That is lib/ip.ts's job and it stays exactly as it is.
 *
 *   "the app can NEVER determine any IP"   — not an attack, a broken deploy.
 *     That is this module's job, and the right response is to refuse to start.
 *
 * A container that won't start is an obvious, immediate, unmissable problem.
 * A container that starts and rejects every order is not.
 *
 * SCOPE. Only config whose absence breaks the app in a way that is silent or
 * unrecoverable belongs here. Optional integrations (Sentry, R2, SMS, payment
 * gateways) must NOT be listed: they are configured per-shop or per-environment
 * and are legitimately absent in local dev. Adding one here would trade a silent
 * outage for a boot loop, which is not an improvement.
 */

const VALID_PROXY_MODES = ["vercel", "cloudflare", "direct", "none"] as const;

/** Length of a hex-encoded AES-256 key. Mirrors KEY_LENGTH in lib/crypto.ts. */
const ENCRYPTION_KEY_HEX_LENGTH = 64;

interface Problem {
  variable: string;
  detail: string;
}

function checkTrustedProxy(problems: Problem[]): void {
  const raw = process.env.TRUSTED_PROXY?.trim().toLowerCase();

  if (!raw) {
    problems.push({
      variable: "TRUSTED_PROXY",
      detail:
        "not set. Every per-IP rate limit fails closed, so LOGIN AND CHECKOUT " +
        `WILL DENY EVERY REQUEST. Set one of: ${VALID_PROXY_MODES.join(" | ")}. ` +
        'For local dev or a direct-to-Node deployment use "direct". Note that ' +
        "\"none\" derives no client IP at all, so 'closed' limiters deny every " +
        "request — it locks the door rather than guarding it.",
    });
    return;
  }

  if (!(VALID_PROXY_MODES as readonly string[]).includes(raw)) {
    problems.push({
      variable: "TRUSTED_PROXY",
      detail:
        `is ${JSON.stringify(raw)}, which is not one of ` +
        `${VALID_PROXY_MODES.join(" | ")}. lib/ip.ts treats an unknown value as ` +
        '"none", so this silently disables client-IP derivation.',
    });
    return;
  }

  // "none" is a legitimate choice but almost never the intended one, because it
  // makes every 'closed' per-IP limiter deny unconditionally: nobody can log
  // in, check out, request an OTP or reset a password. That is indistinguishable
  // from an outage while every other page returns 200 — exactly the silent
  // failure this module exists to prevent. Not fatal (a deployment may really
  // want those routes shut), but it must never pass unremarked.
  if (raw === "none") {
    console.warn(
      '[startup-config] TRUSTED_PROXY="none": no client IP will be derived, so ' +
        "every 'closed' per-IP rate limit DENIES EVERY REQUEST — login, checkout, " +
        'OTP and password reset are all shut. Use "direct" if this host is ' +
        "reachable without a proxy and you want those routes to work.",
    );
  }
}

function checkRequired(problems: Problem[], variable: string, purpose: string): string | null {
  const value = process.env[variable]?.trim();
  if (!value) {
    problems.push({ variable, detail: `not set. ${purpose}` });
    return null;
  }
  return value;
}

function checkEncryptionKey(problems: Problem[]): void {
  const key = checkRequired(
    problems,
    "ENCRYPTION_KEY",
    "Every secret stored at rest (gateway credentials, SMTP passwords, courier " +
      "and SMS keys) is AES-256-GCM encrypted with it. Without it those settings " +
      "throw on first read, which surfaces as a broken admin page rather than a " +
      "boot failure. Generate one with: " +
      `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`,
  );
  if (!key) return;

  // Validate the SHAPE here, not just presence — a truncated or non-hex key
  // fails inside createCipheriv at first use, which is exactly the deferred,
  // hard-to-trace failure this module exists to pull forward to boot.
  if (!/^[0-9a-fA-F]+$/.test(key) || key.length !== ENCRYPTION_KEY_HEX_LENGTH) {
    problems.push({
      variable: "ENCRYPTION_KEY",
      detail:
        `must be exactly ${ENCRYPTION_KEY_HEX_LENGTH} hex characters (32 bytes); ` +
        `got ${key.length} character(s)${/^[0-9a-fA-F]*$/.test(key) ? "" : ", and it is not valid hex"}.`,
    });
  }
}

/**
 * Validate critical configuration. Throws with every problem listed at once —
 * not just the first — so a misconfigured deploy is fixed in one pass rather
 * than one restart per missing variable.
 */
export function assertStartupConfig(): void {
  const problems: Problem[] = [];

  checkTrustedProxy(problems);
  checkEncryptionKey(problems);
  checkRequired(
    problems,
    "DATABASE_URL",
    "Prisma cannot connect; every page that touches the DB returns a 500.",
  );
  checkRequired(
    problems,
    "REDIS_URL",
    "Sessions, rate limits and the IP blocklist all live in Redis. Without it " +
      "nobody can stay logged in and 'closed' limiters deny.",
  );

  if (problems.length === 0) return;

  const lines = problems.map((p) => `  - ${p.variable}: ${p.detail}`).join("\n");
  throw new Error(
    `Refusing to start — ${problems.length} critical configuration problem(s):\n\n${lines}\n\n` +
      "The app fails closed on all of these, which means it would accept traffic " +
      "and reject every login and order without any obvious sign of trouble. " +
      "Fix the variables above and restart. See .env.example.",
  );
}

/**
 * Warn — loudly, but without crashing — when a development server is pointed at
 * a remote database or Redis.
 *
 * Not a crash on purpose: debugging against a production replica is sometimes
 * genuinely what you want. But it must be impossible to FORGET which one you're
 * on, because a dev server on the default port aimed at production is a live
 * hazard sitting next to a test suite that deletes Redis keys.
 */
export function warnOnRemoteDevConnections(): void {
  if (process.env.NODE_ENV !== "development") return;

  const remote = (["DATABASE_URL", "REDIS_URL"] as const).filter((name) => {
    const raw = process.env[name];
    if (!raw) return false;
    try {
      // A bare host:port has no scheme for URL() to parse; assume remote rather
      // than silently treating an unparseable value as safe.
      const host = new URL(raw).hostname.toLowerCase();
      return !(
        host === "localhost" ||
        host === "127.0.0.1" ||
        host === "::1" ||
        host === "host.docker.internal" ||
        host.endsWith(".localhost")
      );
    } catch {
      return true;
    }
  });

  if (remote.length === 0) return;

  const banner = "!".repeat(78);
  console.warn(
    `\n${banner}\n` +
      `!! DEV SERVER IS POINTED AT REMOTE INFRASTRUCTURE: ${remote.join(", ")}\n` +
      "!!\n" +
      "!! Writes, migrations and any test run against this server hit REAL DATA.\n" +
      "!! Do not run the E2E suite while this is true — it deletes Redis keys.\n" +
      `${banner}\n`,
  );
}
