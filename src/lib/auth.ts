import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
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

export async function verifyAdminCredentials(username: string, password: string) {
  const admin = await prisma.adminUser.findUnique({ where: { username } });
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

/** Reads the current admin session from cookies, for use in server components/actions. */
export async function getCurrentAdmin(): Promise<SessionData | null> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;
  return getSession(sessionId);
}
