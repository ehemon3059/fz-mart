// Runs once when a new server instance starts, before it serves any request.
//
// Two jobs:
//   1. Rebuild the Redis IP-block set from the DB (without this a Redis flush
//      would silently unblock every blocked IP until someone re-saved one).
//   2. Initialise Sentry on the server/edge runtimes — ONLY when SENTRY_DSN is
//      set, so error reporting is entirely opt-in per environment.
export async function register() {
  // NOTHING in here may throw. Next aborts the whole server instance when this
  // hook rejects ("Failed to prepare server: An error occurred while loading
  // instrumentation hook"), and every dynamic route — pages AND API routes,
  // /api/health included — then answers 500 with only static files still
  // served. A transient Redis or database blip at cold start must degrade a
  // feature, never take the site down, so each job is isolated below.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      const { rebuildIpBlockSet } = await import("@/lib/ip-block");
      await rebuildIpBlockSet();
    } catch (err) {
      // The block set stays as Redis last had it; isIpBlocked already fails
      // open when Redis is unreachable, so requests are served either way.
      console.error("[instrumentation] IP-block rebuild failed:", (err as Error).message);
    }
  }

  if (process.env.SENTRY_DSN) {
    try {
      const Sentry = await import("@sentry/nextjs");
      Sentry.init({
        dsn: process.env.SENTRY_DSN,
        environment: process.env.NODE_ENV,
        tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
      });
    } catch (err) {
      console.error("[instrumentation] Sentry init failed:", (err as Error).message);
    }
  }
}

// Captures errors thrown in server components / route handlers / server
// actions. No-op unless Sentry is configured.
export async function onRequestError(
  ...args: Parameters<typeof import("@sentry/nextjs").captureRequestError>
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(...args);
}
