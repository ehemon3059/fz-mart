import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import bcrypt from "bcrypt";
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session-cookie";

// Admin sessions live in Redis, identified by a random session id stored in
// an httpOnly, secure cookie. A JWT in localStorage is exfiltratable via XSS;
// a server-validated session id in an httpOnly cookie is not readable by
// client-side JS at all.

export { SESSION_COOKIE };
// Two independent limits. IDLE is the Redis TTL, pushed forward on every
// authenticated read, so an unused session dies quietly. ABSOLUTE is checked
// against issuedAt on read and cannot be extended by activity — a stolen
// cookie is worthless after it, however busy the attacker keeps the session.
export const SESSION_IDLE_TTL_SECONDS = 60 * 60 * 8; // 8 hours
export const SESSION_ABSOLUTE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const BCRYPT_COST = 12;

interface SessionData {
  adminId: number;
  username: string;
  role: string;
}

/** What actually lives in Redis: the snapshot plus its issue time. */
interface StoredSession extends SessionData {
  /** Epoch ms the session was created. Never rewritten — see updateSession. */
  issuedAt: number;
}

function sessionKey(sessionId: string): string {
  return `admin_session:${sessionId}`;
}

// Redis has no "find keys by admin" without SCAN, so each admin gets a set of
// their live session ids. It's what makes "sign out everywhere" on a password
// change possible. The set is a best-effort index, not the authority: a missing
// entry only costs us a session we failed to revoke, never a false grant.
//
// DRIFT: set members do NOT disappear when the session key they name expires —
// Redis expires the key, not references to it. An admin logging in daily for a
// year would accumulate ~365 dead ids. The set's own TTL does not fix this: it
// is refreshed on every login (see createSession), so an active admin's index
// never actually expires and simply grows. readLiveSessionIds therefore prunes
// on read; see the comment there.
function adminSessionsKey(adminId: number): string {
  return `admin_sessions:${adminId}`;
}

/**
 * Members of the index whose session key still exists, pruning the rest.
 *
 * Chosen over "just put a TTL on the set" because that alternative doesn't
 * actually bound anything: the set's expiry is pushed forward by each new
 * login, so the set of a regularly-active admin — precisely the account with
 * the most members — is the one that never expires. Pruning is also what makes
 * the count trustworthy, which a future "you have N active sessions" screen
 * needs and a TTL could never provide.
 *
 * Cost is one pipelined EXISTS per member, on a set that this function keeps
 * small, and only on the rare paths that read the index (revocation) — never
 * on the per-request session read.
 */
async function readLiveSessionIds(adminId: number): Promise<string[]> {
  const ids = await redis.smembers(adminSessionsKey(adminId));
  if (ids.length === 0) return [];

  const pipeline = redis.pipeline();
  for (const id of ids) pipeline.exists(sessionKey(id));
  const results = await pipeline.exec();

  const live: string[] = [];
  const dead: string[] = [];
  ids.forEach((id, i) => {
    // A pipeline entry is [error, value]. Treat an errored probe as LIVE: it is
    // better to keep a dead id (harmless — deleting it again is a no-op) than
    // to drop a live one from the index and lose the ability to revoke it.
    const entry = results?.[i];
    const errored = !entry || entry[0];
    if (errored || entry[1] === 1) live.push(id);
    else dead.push(id);
  });

  if (dead.length > 0) {
    await redis.srem(adminSessionsKey(adminId), ...dead);
  }
  return live;
}

// Accepts either the username or the email address. Invited admins get an
// auto-derived username (email local-part), so they naturally try to sign in
// with their email — look that up too rather than failing them.
export async function verifyAdminCredentials(identifier: string, password: string) {
  const value = identifier.trim();
  const admin =
    (await prisma.adminUser.findUnique({ where: { username: value } })) ??
    (value.includes("@")
      ? await prisma.adminUser.findUnique({ where: { email: value.toLowerCase() } })
      : null);
  if (!admin) return null;
  const valid = await bcrypt.compare(password, admin.passwordHash);
  return valid ? admin : null;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/** Creates a session in Redis and returns the session id to set as a cookie. */
export async function createSession(data: SessionData): Promise<string> {
  const sessionId = randomBytes(32).toString("hex");
  const stored: StoredSession = { ...data, issuedAt: Date.now() };
  await redis
    .multi()
    .set(sessionKey(sessionId), JSON.stringify(stored), "EX", SESSION_IDLE_TTL_SECONDS)
    .sadd(adminSessionsKey(data.adminId), sessionId)
    // The index can outlive every session in it, so give it its own ceiling:
    // the absolute window, refreshed as each new session joins.
    .expire(adminSessionsKey(data.adminId), SESSION_ABSOLUTE_TTL_SECONDS)
    .exec();
  return sessionId;
}

/**
 * Overwrite an existing session's mutable snapshot in place. Used when a field
 * shown in the admin header — e.g. the username — changes and the current
 * session should reflect it without re-login.
 *
 * issuedAt is deliberately carried over from the existing record, never reset:
 * otherwise a username change would silently restart the absolute window.
 */
export async function updateSession(sessionId: string, data: SessionData): Promise<void> {
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return; // Session already gone — nothing to refresh.
  const existing = JSON.parse(raw) as StoredSession;
  const stored: StoredSession = { ...data, issuedAt: existing.issuedAt };
  // Keep whatever idle time the session had left rather than granting a fresh
  // window; getSession has already slid it forward for this request.
  const ttl = await redis.ttl(sessionKey(sessionId));
  await redis.set(
    sessionKey(sessionId),
    JSON.stringify(stored),
    "EX",
    ttl > 0 ? ttl : SESSION_IDLE_TTL_SECONDS,
  );
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  // Read on every admin render. If Redis is unreachable, treat the admin as
  // logged out rather than crashing the page (they can sign in again once
  // Redis is back).
  try {
    const raw = await redis.get(sessionKey(sessionId));
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredSession;

    // Absolute cap. Sessions written before issuedAt existed have no cap to
    // check against — treat them as expired rather than as immortal.
    const issuedAt = typeof stored.issuedAt === "number" ? stored.issuedAt : 0;
    if (Date.now() - issuedAt > SESSION_ABSOLUTE_TTL_SECONDS * 1000) {
      await destroySession(sessionId, stored.adminId);
      return null;
    }

    // Slide the idle window forward. This is the only place it moves.
    await redis.expire(sessionKey(sessionId), SESSION_IDLE_TTL_SECONDS);

    const { issuedAt: _issuedAt, ...data } = stored;
    return data;
  } catch (err) {
    console.error("[auth] session read failed, treating as logged out:", (err as Error).message);
    return null;
  }
}

/**
 * Drop one session. `adminId` lets us also prune the index entry; it's optional
 * because callers holding only a cookie may not know it — a stale entry is then
 * cleaned up by the next revokeOtherAdminSessions sweep.
 */
export async function destroySession(sessionId: string, adminId?: number): Promise<void> {
  let ownerId = adminId;
  if (ownerId === undefined) {
    const raw = await redis.get(sessionKey(sessionId)).catch(() => null);
    if (raw) {
      try {
        ownerId = (JSON.parse(raw) as StoredSession).adminId;
      } catch {
        // Unparseable record — delete the key below and leave the index alone.
      }
    }
  }
  const tx = redis.multi().del(sessionKey(sessionId));
  if (ownerId !== undefined) tx.srem(adminSessionsKey(ownerId), sessionId);
  await tx.exec();
}

/**
 * The actual revocation, without the failure handling. Exported for the
 * security worker, which retries this directly and needs the error to
 * propagate so BullMQ can count the attempt as failed.
 */
export async function revokeAdminSessionsOrThrow(
  adminId: number,
  keepId?: string,
): Promise<number> {
  const ids = await readLiveSessionIds(adminId);
  const doomed = keepId ? ids.filter((id) => id !== keepId) : ids;
  if (doomed.length === 0) return 0;
  const tx = redis.multi();
  for (const id of doomed) tx.del(sessionKey(id));
  tx.srem(adminSessionsKey(adminId), ...doomed);
  await tx.exec();
  return doomed.length;
}

/**
 * Revoke every session belonging to `adminId` except (optionally) `keepId`.
 * Called whenever the account's credentials change: a password change, a
 * password reset, or disabling 2FA. Without this, a stolen cookie survives the
 * exact events a user performs to get rid of an attacker.
 *
 * Failure here must not throw: the new password is already committed and the
 * admin has been told it works, so rejecting now would be a lie. But a swallowed
 * failure is worse than useless — this function exists for the moment an account
 * is compromised, and a Redis blip at that moment leaves the attacker signed in
 * with nobody the wiser. So a failure does three things instead:
 *
 *   1. reports to Sentry at error level, tagged security.session_revocation_failed
 *   2. queues a retry with backoff, so a transient outage self-heals
 *   3. escalates if the retry cannot even be queued — that combination means
 *      nothing will fix this on its own and a human has to look.
 */
export async function revokeOtherAdminSessions(
  adminId: number,
  keepId?: string,
  reason = "credential-change",
): Promise<void> {
  try {
    await revokeAdminSessionsOrThrow(adminId, keepId);
  } catch (err) {
    const { reportSecurityFailure } = await import("@/lib/security-report");
    await reportSecurityFailure("security.session_revocation_failed", err, {
      subject: "admin",
      subjectId: adminId,
      reason,
      keptSessionId: keepId ? "yes" : "none",
    });

    try {
      const { enqueueSecurityJob } = await import("@/jobs/enqueue");
      await enqueueSecurityJob({
        type: "revoke-sessions",
        subject: "admin",
        subjectId: String(adminId),
        keepId,
        reason,
      });
    } catch (queueErr) {
      // Revocation failed AND the retry could not be scheduled. Nothing will
      // recover this without intervention, so it is reported at its own event
      // name rather than folded into the failure above.
      await reportSecurityFailure("security.session_revocation_unrecoverable", queueErr, {
        subject: "admin",
        subjectId: adminId,
        reason,
        note: "Revocation failed and no retry could be queued; sessions may still be live.",
      });
    }
  }
}

// ── Pending 2FA login state ──────────────────────────────────────
// Between a correct password and a correct TOTP code, the login is held in a
// short-lived Redis record (NOT a full session) keyed by a random token in a
// separate cookie. It grants nothing except the right to submit a code.
const PENDING_2FA_TTL_SECONDS = 5 * 60;
export const PENDING_2FA_COOKIE = "fz_admin_2fa";

function pending2faKey(token: string): string {
  return `admin_2fa_pending:${token}`;
}

export async function createPending2fa(adminId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await redis.set(pending2faKey(token), String(adminId), "EX", PENDING_2FA_TTL_SECONDS);
  return token;
}

export async function readPending2fa(token: string): Promise<number | null> {
  const raw = await redis.get(pending2faKey(token));
  return raw ? Number(raw) : null;
}

export async function consumePending2fa(token: string): Promise<void> {
  await redis.del(pending2faKey(token));
}

/** Reads the current admin session from cookies, for use in server components/actions. */
export async function getCurrentAdmin(): Promise<SessionData | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getSession(sessionId);
}

/**
 * Auth gate for admin server actions. Middleware only checks that the session
 * cookie EXISTS (it can't reach Redis from the Edge runtime), and layouts run
 * during render — after a server action has already executed. So every admin
 * action must validate the session itself; this redirects to login when it
 * isn't valid.
 */
export async function requireAdmin(): Promise<SessionData> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
