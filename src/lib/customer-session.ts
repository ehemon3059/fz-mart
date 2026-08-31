import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redis } from "@/lib/redis";
import { CUSTOMER_SESSION_COOKIE } from "@/lib/customer-session-cookie";
import { secureCookieOptions } from "@/lib/cookie-security";

// Customer sessions live in Redis, identified by a random session id stored
// in an httpOnly, secure cookie — same rationale as admin sessions in
// lib/auth.ts (a server-validated session id can't be read or forged by
// client-side JS, unlike a JWT in localStorage).

export { CUSTOMER_SESSION_COOKIE };
// Same two-limit model as admin sessions (see lib/auth.ts), with a shopper's
// tolerance for re-login rather than an operator's: the idle window is long
// enough that a returning customer stays signed in between visits, while the
// absolute cap still retires the session eventually.
const SESSION_IDLE_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const SESSION_ABSOLUTE_TTL_SECONDS = 60 * 60 * 24 * 180; // 180 days

interface CustomerSessionData {
  customerId: string;
  email: string;
}

/** What actually lives in Redis: the snapshot plus its issue time. */
interface StoredCustomerSession extends CustomerSessionData {
  /** Epoch ms the session was created. Never rewritten. */
  issuedAt: number;
}

function sessionKey(sessionId: string): string {
  return `customer_session:${sessionId}`;
}

// Per-customer index of live session ids, mirroring admin_sessions:* — the
// thing that makes revoking every session of one account possible at all.
// Best-effort: a missing entry only means a session we failed to revoke, never
// a false grant.
//
// Same drift problem as the admin index, worse in degree: a customer's idle
// window is 30 days, so dead ids linger far longer. Pruned on read below —
// see readLiveSessionIds in lib/auth.ts for why pruning beats a set TTL.
function customerSessionsKey(customerId: string): string {
  return `customer_sessions:${customerId}`;
}

/** Members whose session key still exists, pruning the rest. */
async function readLiveSessionIds(customerId: string): Promise<string[]> {
  const ids = await redis.smembers(customerSessionsKey(customerId));
  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.exists(sessionKey(id));
  const results = await pipeline.exec();

  const live: string[] = [];
  const dead: string[] = [];
  ids.forEach((id, i) => {
    // Errored probe counts as live — never drop an id we might need to revoke.
    const entry = results?.[i];
    const errored = !entry || entry[0];
    if (errored || entry[1] === 1) live.push(id);
    else dead.push(id);
  });

  if (dead.length > 0) {
    await redis.srem(customerSessionsKey(customerId), ...dead);
  }
  return live;
}

/** Creates a session in Redis and returns the session id to set as a cookie. */
export async function createCustomerSession(data: CustomerSessionData): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  const stored: StoredCustomerSession = { ...data, issuedAt: Date.now() };
  await redis
    .multi()
    .set(sessionKey(sessionId), JSON.stringify(stored), "EX", SESSION_IDLE_TTL_SECONDS)
    .sadd(customerSessionsKey(data.customerId), sessionId)
    .expire(customerSessionsKey(data.customerId), SESSION_ABSOLUTE_TTL_SECONDS)
    .exec();
  return sessionId;
}

export async function getCustomerSessionById(sessionId: string): Promise<CustomerSessionData | null> {
  // Read on every page via getCurrentCustomer(). If Redis is unreachable, treat
  // the visitor as logged out rather than crashing the render.
  try {
    const raw = await redis.get(sessionKey(sessionId));
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredCustomerSession;

    // Absolute cap. Records written before issuedAt existed have nothing to
    // check against — expire them rather than letting them live forever.
    const issuedAt = typeof stored.issuedAt === "number" ? stored.issuedAt : 0;
    if (Date.now() - issuedAt > SESSION_ABSOLUTE_TTL_SECONDS * 1000) {
      await destroyCustomerSession(sessionId, stored.customerId);
      return null;
    }

    // Slide the idle window forward. This is the only place it moves.
    await redis.expire(sessionKey(sessionId), SESSION_IDLE_TTL_SECONDS);

    const { issuedAt: _issuedAt, ...data } = stored;
    return data;
  } catch (err) {
    console.error("[customer-session] read failed, treating as logged out:", (err as Error).message);
    return null;
  }
}

/**
 * Drop one session. `customerId` lets us prune the index entry too; it's
 * optional because a caller holding only a cookie may not know it.
 */
export async function destroyCustomerSession(
  sessionId: string,
  customerId?: string,
): Promise<void> {
  let ownerId = customerId;
  if (ownerId === undefined) {
    const raw = await redis.get(sessionKey(sessionId)).catch(() => null);
    if (raw) {
      try {
        ownerId = (JSON.parse(raw) as StoredCustomerSession).customerId;
      } catch {
        // Unparseable record — delete the key below, leave the index alone.
      }
    }
  }
  const tx = redis.multi().del(sessionKey(sessionId));
  if (ownerId !== undefined) tx.srem(customerSessionsKey(ownerId), sessionId);
  await tx.exec();
}

/**
 * The actual revocation, without the failure handling. Exported for the
 * security worker — see revokeAdminSessionsOrThrow in lib/auth.ts.
 */
export async function revokeCustomerSessionsOrThrow(
  customerId: string,
  keepId?: string,
): Promise<number> {
  const ids = await readLiveSessionIds(customerId);
  const doomed = keepId ? ids.filter((id) => id !== keepId) : ids;
  if (doomed.length === 0) return 0;
  const tx = redis.multi();
  for (const id of doomed) tx.del(sessionKey(id));
  tx.srem(customerSessionsKey(customerId), ...doomed);
  await tx.exec();
  return doomed.length;
}

/**
 * Revoke every session for one customer, except (optionally) `keepId`.
 * Customers authenticate by magic link or Google, so there is no password
 * change to trigger this today; it exists so a "sign out everywhere" control,
 * or a support-side eviction, has a correct implementation to call rather than
 * inventing one.
 *
 * Same failure contract as revokeOtherAdminSessions: never throws, always
 * reports, always schedules a retry.
 */
export async function revokeCustomerSessions(
  customerId: string,
  keepId?: string,
  reason = "credential-change",
): Promise<void> {
  try {
    await revokeCustomerSessionsOrThrow(customerId, keepId);
  } catch (err) {
    const { reportSecurityFailure } = await import("@/lib/security-report");
    await reportSecurityFailure("security.session_revocation_failed", err, {
      subject: "customer",
      subjectId: customerId,
      reason,
    });

    try {
      const { enqueueSecurityJob } = await import("@/jobs/enqueue");
      await enqueueSecurityJob({
        type: "revoke-sessions",
        subject: "customer",
        subjectId: customerId,
        keepId,
        reason,
      });
    } catch (queueErr) {
      await reportSecurityFailure("security.session_revocation_unrecoverable", queueErr, {
        subject: "customer",
        subjectId: customerId,
        reason,
        note: "Revocation failed and no retry could be queued; sessions may still be live.",
      });
    }
  }
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
    ...(await secureCookieOptions()),
    // Tracks the ABSOLUTE cap: the server slides the Redis idle TTL on
    // activity, so a cookie expiring at the idle mark would sign out a
    // customer whose session is still live.
    maxAge: SESSION_ABSOLUTE_TTL_SECONDS,
  });
}

export async function clearCustomerSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(CUSTOMER_SESSION_COOKIE);
}
