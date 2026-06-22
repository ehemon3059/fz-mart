// Just the cookie name constant, isolated in its own zero-dependency module.
// middleware.ts (Edge runtime) imports this directly instead of lib/auth.ts,
// because lib/auth.ts transitively pulls in ioredis/node:crypto which the
// Edge bundle cannot resolve.
export const SESSION_COOKIE = "fz_admin_session";
