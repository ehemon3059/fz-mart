import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer-session-cookie";

// Customer sessions live in Redis, identified by a random session id stored
// in an httpOnly, secure cookie — same rationale as admin sessions in
// lib/auth.ts (a server-validated session id can't be read or forged by
// client-side JS, unlike a JWT in localStorage).

export { CUSTOMER_SESSION_COOKIE };
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days

interface CustomerSessionData {
  customerId: string;
  email: string;
}

function sessionKey(sessionId: string): string {
  return `customer_session:${sessionId}`;
}

/** Creates a session in Redis and returns the session id to set as a cookie. */
export async function createCustomerSession(data: CustomerSessionData): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  await redis.set(sessionKey(sessionId), JSON.stringify(data), "EX", SESSION_TTL_SECONDS);
  return sessionId;
}

export async function getCustomerSessionById(sessionId: string): Promise<CustomerSessionData | null> {
  // Read on every page via getCurrentCustomer(). If Redis is unreachable, treat
  // the visitor as logged out rather than crashing the render.
  try {
    const raw = await redis.get(sessionKey(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as CustomerSessionData;
  } catch (err) {
    console.error("[customer-session] read failed, treating as logged out:", (err as Error).message);
    return null;
  }
}

export async function destroyCustomerSession(sessionId: string): Promise<void> {
  await redis.del(sessionKey(sessionId));
}

/** Reads the current customer session from cookies, for use in server components/actions. */
export async function getCurrentCustomer(): Promise<CustomerSessionData | null> {
  const store = await cookies();
  const sessionId = store.get(CUSTOMER_SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getCustomerSessionById(sessionId);
}

/** Sets the session cookie on the response — call after createCustomerSession in a route handler or server action. */
export async function setCustomerSessionCookie(sessionId: string): Promise<void> {
  const store = await cookies();
  store.set(CUSTOMER_SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_TTL_SECONDS,
    path: "/",
  });
}

export async function clearCustomerSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CUSTOMER_SESSION_COOKIE);
}
