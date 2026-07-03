"use server";

import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { enqueueMailJob } from "@/jobs/enqueue";
import { safeRedirectPath } from "@/lib/safe-redirect";

export interface RequestMagicLinkResult {
  error?: string;
  sent?: boolean;
}

const TOKEN_TTL_MINUTES = 15;
const EMAIL_LIMIT = 5;
const EMAIL_WINDOW_SECONDS = 60 * 10;
const IP_LIMIT = 15;
const IP_WINDOW_SECONDS = 60 * 10;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestMagicLink(formData: FormData): Promise<RequestMagicLinkResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const emailLimit = await rateLimit("login:email", email, EMAIL_LIMIT, EMAIL_WINDOW_SECONDS);
  if (!emailLimit.allowed) {
    return { error: "Too many login attempts. Please try again later." };
  }

  const ip = await getClientIp();
  if (ip) {
    const ipLimit = await rateLimit("login:ip", ip, IP_LIMIT, IP_WINDOW_SECONDS);
    if (!ipLimit.allowed) {
      return { error: "Too many login attempts from this network. Please try again later." };
    }
  }

  const token = randomBytes(32).toString("hex");
  await prisma.loginToken.create({
    data: {
      email,
      token,
      expiresAt: new Date(Date.now() + TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  const next = safeRedirectPath(String(formData.get("next") ?? ""));
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const loginUrl = next
    ? `${baseUrl}/login/verify?token=${token}&next=${encodeURIComponent(next)}`
    : `${baseUrl}/login/verify?token=${token}`;

  await enqueueMailJob({ type: "magic-link", to: email, loginUrl });

  return { sent: true };
}
