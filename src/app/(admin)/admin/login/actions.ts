"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  verifyAdminCredentials,
  createSession,
  destroySession,
  SESSION_COOKIE,
} from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export interface LoginResult {
  error?: string;
}

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // matches Redis TTL in lib/auth.ts

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

  const sessionId = await createSession({
    adminId: admin.id,
    username: admin.username,
    role: admin.role,
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });

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
