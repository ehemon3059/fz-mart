// Runs once when a new server instance starts, before it serves any request.
//
// Two jobs:
//   1. Rebuild the Redis IP-block set from the DB (without this a Redis flush
//      would silently unblock every blocked IP until someone re-saved one).
//   2. Initialise Sentry on the server/edge runtimes — ONLY when SENTRY_DSN is
//      set, so error reporting is entirely opt-in per environment.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { rebuildIpBlockSet } = await import("@/lib/ip-block");
    await rebuildIpBlockSet();
  }

  if (process.env.SENTRY_DSN) {
    const Sentry = await import("@sentry/nextjs");
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    });
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
