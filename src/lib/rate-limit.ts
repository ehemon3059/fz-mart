import { redis } from "@/lib/redis";
import { getClientIp } from "@/lib/ip";

// Fixed-window rate limiter on Redis: INCR a counter keyed by (scope, identifier),
// set its expiry on the first hit in the window, reject once the limit is
// exceeded. Cheap (one round trip on the hot path) and atomic enough for
// abuse-prevention purposes — exact sliding-window precision isn't needed
// here, just "stop hammering this endpoint."
//
// WHEN THE LIMITER CANNOT DECIDE (Redis unreachable, or no trusted client IP)
// there is no globally correct answer, so every call site states its own:
//
//   'closed'  Deny the request. For anything where an unlimited retry loop is
//             itself the attack — credential stuffing, OTP/2FA brute force,
//             password reset spam, order flooding, paid-API spend. A Redis
//             outage degrades these flows rather than removing the only thing
//             standing between an attacker and unlimited attempts.
//
//   'open'    Allow the request. For read-only browsing where the limiter is
//             scraping hygiene, not a security control, and denying would take
//             the storefront down over an infrastructure blip.
//
// Both branches report to Sentry (see reportLimiterFallback): a fallback is
// always an infrastructure problem, and failing closed silently would turn a
// Redis blip into a checkout outage nobody hears about until a customer calls.

export type FailureMode = "closed" | "open";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  resetInSeconds: number;
  /**
   * True when the limiter could not reach a real decision and applied
   * `failureMode` instead. Callers that want to tell "you're rate limited"
   * apart from "we're degraded" can branch on this; most don't need to.
   */
  degraded?: boolean;
}

type FallbackReason = "redis-unavailable" | "no-client-ip";

/**
 * Report a limiter fallback to Sentry — warning for an outage, error for a
 * misconfiguration (see the level note in the body).
 *
 * This is the half that makes an explicit failure mode safe to run. Failing
 * closed without alerting converts a Redis blip into a silent checkout outage;
 * failing open without alerting silently removes a security control. Either
 * way the limiter stopped working and somebody needs to know.
 *
 * Deliberately never throws and never awaits Sentry: this sits on the hot path
 * of login and checkout, and a telemetry failure must not fail the request that
 * triggered it. Sentry de-duplicates by fingerprint, so a sustained outage
 * groups into one alert rather than one per request.
 */
function reportLimiterFallback(
  scope: string,
  reason: FallbackReason,
  failureMode: FailureMode,
  err?: unknown,
): void {
  const outcome = failureMode === "closed" ? "DENYING requests" : "ALLOWING requests unlimited";
  const detail = err instanceof Error ? ` (${err.message})` : "";

  // 'no-client-ip' is reported at ERROR, not warning, and carries its own tag.
  //
  // The two reasons are not equally severe. 'redis-unavailable' is an outage:
  // real, transient, and usually already paging someone. 'no-client-ip' is a
  // MISCONFIGURATION — TRUSTED_PROXY wrong or absent — which never recovers on
  // its own and, on a 'closed' scope, means every login and every checkout is
  // being denied. assertStartupConfig() in lib/startup-config.ts now refuses to
  // boot on the obvious form of this, so anything still reaching here is the
  // subtle form: TRUSTED_PROXY is set to a valid mode, but the proxy in front
  // isn't actually supplying the header that mode trusts (e.g. "cloudflare"
  // without the nginx config in docs/deploy-cloudflare.md). That is a total
  // outage wearing the costume of a rate limit, and it must not sit in Sentry
  // at the same level as ordinary limiter noise.
  const level = reason === "no-client-ip" ? "error" : "warning";
  console.error(`[rate-limit] ${reason} for scope "${scope}" — ${outcome}.${detail}`);
  if (reason === "no-client-ip") {
    console.error(
      "[rate-limit] MISCONFIGURATION: no trusted client IP could be derived. " +
        `TRUSTED_PROXY=${process.env.TRUSTED_PROXY ?? "unset"}. ` +
        "See lib/ip.ts and docs/deploy-cloudflare.md.",
    );
  }

  if (!process.env.SENTRY_DSN) return;

  void import("@sentry/nextjs")
    .then((mod) => {
      // @sentry/nextjs resolves to a CJS build under the "node" export
      // condition, so a dynamic import() yields a namespace whose real API sits
      // on `.default`. Reading withScope straight off the namespace silently
      // gives undefined and throws into the .catch() below — i.e. NO alert,
      // which is exactly the failure this function exists to prevent. Handle
      // both shapes rather than assuming either.
      const Sentry = (
        typeof (mod as { withScope?: unknown }).withScope === "function"
          ? mod
          : ((mod as unknown as { default?: unknown }).default ?? mod)
      ) as typeof import("@sentry/nextjs");

      if (typeof Sentry?.withScope !== "function") {
        console.error("[rate-limit] Sentry API unavailable — fallback alert NOT delivered.");
        return;
      }

      Sentry.withScope((sentryScope) => {
        sentryScope.setLevel(level);
        sentryScope.setTags({
          rate_limit_scope: scope,
          rate_limit_fallback: reason,
          rate_limit_failure_mode: failureMode,
          // Distinct, greppable tag so a misconfigured deployment is one
          // Sentry search away and never buried in limiter noise.
          ...(reason === "no-client-ip" ? { config_error: "trusted-proxy" } : {}),
        });
        sentryScope.setContext("rate_limit", {
          scope,
          reason,
          failureMode,
          outcome,
          trustedProxy: process.env.TRUSTED_PROXY ?? "unset",
          error: err instanceof Error ? err.message : undefined,
        });
        // Group by (reason, scope, mode) rather than by message text, so a
        // sustained outage is one issue per affected scope, not thousands.
        sentryScope.setFingerprint(["rate-limit-fallback", reason, scope, failureMode]);
        Sentry.captureMessage(
          reason === "no-client-ip"
            ? `MISCONFIGURED TRUSTED_PROXY — no client IP; "${scope}" is ${outcome}`
            : `Rate limiter fell back to '${failureMode}' for "${scope}" (${reason})`,
          level,
        );
      });
    })
    .catch((sentryErr: unknown) => {
      // Never rethrow — this is telemetry on the login/checkout hot path. But
      // do say so loudly: a swallowed alert failure is indistinguishable from
      // "no incidents", which is how a silent outage happens.
      console.error(
        "[rate-limit] failed to report fallback to Sentry:",
        sentryErr instanceof Error ? sentryErr.message : sentryErr,
      );
    });
}

function fallbackResult(
  failureMode: FailureMode,
  limit: number,
  windowSeconds: number,
): RateLimitResult {
  return failureMode === "closed"
    ? { allowed: false, remaining: 0, resetInSeconds: windowSeconds, degraded: true }
    : { allowed: true, remaining: limit, resetInSeconds: windowSeconds, degraded: true };
}

/**
 * Rate limit by an explicit identifier (email, phone, admin id, "global", …).
 *
 * `failureMode` is required — there is no default, because the safe answer
 * differs per call site and a default is exactly how a security-critical flow
 * silently inherits the wrong one.
 */
export async function rateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
  failureMode: FailureMode,
): Promise<RateLimitResult> {
  const key = `ratelimit:${scope}:${identifier}`;

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, windowSeconds);
    }

    const ttl = await redis.ttl(key);
    const resetInSeconds = ttl > 0 ? ttl : windowSeconds;

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      resetInSeconds,
    };
  } catch (err) {
    reportLimiterFallback(scope, "redis-unavailable", failureMode, err);
    return fallbackResult(failureMode, limit, windowSeconds);
  }
}

/**
 * Rate limit keyed by the trusted client IP.
 *
 * Every per-IP limit MUST go through this rather than calling rateLimit with an
 * IP directly, because the no-IP decision belongs in exactly one place. The
 * pattern this replaces —
 *
 *     const ip = await getClientIp();
 *     if (ip) { ...limit... }        // no IP -> NO LIMIT AT ALL
 *
 * silently disables the limiter for anyone the helper can't identify, which is
 * precisely the population you most want limited.
 *
 * Note that an unidentifiable caller is a genuinely different signal from a
 * Redis outage: it usually means TRUSTED_PROXY is misconfigured (see lib/ip.ts),
 * and on a 'closed' route that is the correct thing to break loudly over. Both
 * paths alert.
 *
 * Pass `request` in route handlers; omit it in server actions and components.
 */
export async function rateLimitByIp(
  scope: string,
  limit: number,
  windowSeconds: number,
  failureMode: FailureMode,
  request?: Request,
): Promise<RateLimitResult> {
  const ip = await getClientIp(request);
  if (!ip) {
    reportLimiterFallback(scope, "no-client-ip", failureMode);
    return fallbackResult(failureMode, limit, windowSeconds);
  }
  return rateLimit(scope, ip, limit, windowSeconds, failureMode);
}
