import "server-only";

/*
 * Reporting for security-control failures — the cases where a protection we
 * rely on did not run.
 *
 * These are NOT ordinary errors. A failed session revocation means someone
 * asked us to evict an attacker and we did not, so it must reach a human
 * rather than a log line nobody reads. Everything here is deliberately
 * fail-safe: reporting a problem must never itself throw into the caller,
 * because the caller is already handling a partially-failed security action.
 */

export type SecurityEvent =
  | "security.session_revocation_failed"
  | "security.session_revocation_retry_scheduled"
  | "security.session_revocation_unrecoverable";

interface SecurityContext {
  /** Numeric admin id or string customer id, whichever applies. */
  subjectId?: string | number;
  subject?: "admin" | "customer";
  reason?: string;
  [key: string]: unknown;
}

/**
 * Report a security-control failure at error level, tagged so it can be
 * alerted on separately from ordinary application errors.
 *
 * Sentry is imported lazily and only when configured, matching the pattern in
 * src/instrumentation.ts — the app must work with no DSN set.
 */
export async function reportSecurityFailure(
  event: SecurityEvent,
  error: unknown,
  context: SecurityContext = {},
): Promise<void> {
  // Always log locally, whether or not Sentry is configured. A deployment
  // without a DSN still deserves the evidence.
  console.error(
    `[security] ${event}`,
    JSON.stringify(context),
    error instanceof Error ? error.message : String(error),
  );

  if (!process.env.SENTRY_DSN) return;

  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(error instanceof Error ? error : new Error(String(error)), {
      level: "error",
      tags: {
        security_event: event,
        // Tagged rather than buried in `extra` so it is filterable and
        // alertable in the Sentry UI without a search over payloads.
        subject: context.subject ?? "unknown",
      },
      extra: { ...context, securityEvent: event },
    });
  } catch (err) {
    // Sentry itself failed. The console.error above already recorded the
    // original problem, which is the one that matters.
    console.error("[security] failed to report to Sentry:", (err as Error).message);
  }
}
