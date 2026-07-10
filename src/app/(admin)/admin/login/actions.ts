"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  verifyAdminCredentials,
  createSession,
  destroySession,
  SESSION_COOKIE,
  createPending2fa,
  readPending2fa,
  consumePending2fa,
  PENDING_2FA_COOKIE,
} from "@/lib/auth";
import { verifyLoginCode, verifyBackupCode } from "@/server/admin/twofactor";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export interface LoginResult {
  error?: string;
  /** Set when the password was correct but a TOTP code is now required. */
  twoFactorRequired?: boolean;
  /** Seconds to wait before retrying, when a rate limit was hit. */
  retryAfterSeconds?: number;
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // matches Redis TTL in lib/auth.ts
const PENDING_2FA_MAX_AGE_SECONDS = 5 * 60;

async function startSession(adminId: number, username: string, role: string): Promise<void> {
  const sessionId = await createSession({ adminId, username, role });
  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

// Gates every attempt (not just failures) so a credential-stuffing script
// can't burn through guesses for a known username, or hammer the login
// route from one IP trying many usernames.
const USERNAME_LIMIT = 5;
const USERNAME_WINDOW_SECONDS = 60 * 10;
const IP_LIMIT = 15;
const IP_WINDOW_SECONDS = 60 * 10;

export async function login(formData: FormData): Promise<LoginResult> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!username || !password) {
    return { error: "Please enter username and password." };
  }

  const usernameLimit = await rateLimit(
    "login:username",
    username,
    USERNAME_LIMIT,
    USERNAME_WINDOW_SECONDS,
  );
  if (!usernameLimit.allowed) {
    return { error: "Too many login attempts. Please try again later." };
  }

  const ip = await getClientIp();
  if (ip) {
    const ipLimit = await rateLimit("login:ip", ip, IP_LIMIT, IP_WINDOW_SECONDS);
    if (!ipLimit.allowed) {
      return { error: "Too many login attempts from this network. Please try again later." };
    }
  }

  const admin = await verifyAdminCredentials(username, password);
  if (!admin) {
    return { error: "Invalid username or password." };
  }
  // Deactivated accounts can't sign in even with correct credentials.
  if (!admin.isActive) {
    return { error: "This account has been deactivated. Contact an owner." };
  }

  // 2FA enabled: hold the login in a pending state and ask for a code instead
  // of issuing a session now.
  if (admin.twoFactorEnabled) {
    const token = await createPending2fa(admin.id);
    const store = await cookies();
    store.set(PENDING_2FA_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: PENDING_2FA_MAX_AGE_SECONDS,
    });
    return { twoFactorRequired: true };
  }

  await startSession(admin.id, admin.username, admin.role);
  redirect("/admin/dashboard");
}

export async function verifyTwoFactorLogin(formData: FormData): Promise<LoginResult> {
  const code = String(formData.get("code") ?? "").trim();
  const store = await cookies();
  const token = store.get(PENDING_2FA_COOKIE)?.value;
  if (!token) {
    return { error: "Your login attempt expired. Please sign in again." };
  }

  const adminId = await readPending2fa(token);
  if (!adminId) {
    return { error: "Your login attempt expired. Please sign in again." };
  }

  // Rate-limit code guesses per pending login.
  const limit = await rateLimit("login:2fa", String(adminId), 6, 5 * 60);
  if (!limit.allowed) {
    return {
      error: "Too many attempts. Please wait before trying again.",
      retryAfterSeconds: limit.resetInSeconds,
    };
  }

  // A backup code is longer and contains a dash (e.g. "4F7K-9XQ2"); a TOTP
  // code is always 6 digits. Try whichever shape the input matches — this
  // lets one form field accept either without a separate mode toggle needed
  // server-side (the client still offers a "use a backup code" affordance).
  const isBackupCodeShape = code.includes("-") || code.length > 6;
  const ok = isBackupCodeShape
    ? await verifyBackupCode(adminId, code)
    : await verifyLoginCode(adminId, code);
  if (!ok) {
    return { error: "Invalid code. Try again." };
  }

  const { prisma } = await import("@/lib/prisma");
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin || !admin.isActive) {
    return { error: "Account unavailable. Contact an owner." };
  }

  await consumePending2fa(token);
  store.delete(PENDING_2FA_COOKIE);
  await startSession(admin.id, admin.username, admin.role);
  redirect("/admin/dashboard");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  const sessionId = store.get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await destroySession(sessionId);
  }
  store.delete(SESSION_COOKIE);
  redirect("/admin/login");
}
