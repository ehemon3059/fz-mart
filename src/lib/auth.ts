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
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
const BCRYPT_COST = 12;

interface SessionData {
  adminId: number;
  username: string;
  role: string;
}

function sessionKey(sessionId: string): string {
  return `admin_session:${sessionId}`;
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
  await redis.set(sessionKey(sessionId), JSON.stringify(data), "EX", SESSION_TTL_SECONDS);
  return sessionId;
}

export async function getSession(sessionId: string): Promise<SessionData | null> {
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

export async function destroySession(sessionId: string): Promise<void> {
  await redis.del(sessionKey(sessionId));
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
