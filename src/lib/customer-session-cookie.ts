// Just the cookie name constant, isolated in its own zero-dependency module.
// middleware.ts (Edge runtime) imports this directly instead of
// lib/customer-session.ts, because that file transitively pulls in
// ioredis/node:crypto which the Edge bundle cannot resolve.
export const CUSTOMER_SESSION_COOKIE = "fz_customer_session";
