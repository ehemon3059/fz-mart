// Client-side Sentry init (Next reads instrumentation-client.ts for the
// browser bundle). Opt-in: nothing loads unless NEXT_PUBLIC_SENTRY_DSN is set.
import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// Required by Next for client-side navigation instrumentation.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
