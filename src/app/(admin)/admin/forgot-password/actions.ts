"use server";

import { createResetTokenForEmail } from "@/server/admin/password-reset";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { enqueueMailJob } from "@/jobs/enqueue";

export interface ForgotPasswordResult {
  error?: string;
  sent?: boolean;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Rate-limited per email and per IP so the endpoint can't be used to spam an
// inbox or to probe which addresses have an account.
const EMAIL_LIMIT = 3;
const EMAIL_WINDOW_SECONDS = 60 * 15;
const IP_LIMIT = 10;
const IP_WINDOW_SECONDS = 60 * 15;

export async function requestPasswordReset(
  formData: FormData,
): Promise<ForgotPasswordResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!email || !EMAIL_RE.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  const emailLimit = await rateLimit("admin-reset:email", email, EMAIL_LIMIT, EMAIL_WINDOW_SECONDS);
  if (!emailLimit.allowed) {
    return { error: "Too many reset requests. Please try again later." };
  }

  const ip = await getClientIp();
  if (ip) {
    const ipLimit = await rateLimit("admin-reset:ip", ip, IP_LIMIT, IP_WINDOW_SECONDS);
    if (!ipLimit.allowed) {
      return { error: "Too many reset requests from this network. Please try again later." };
    }
  }

  const issued = await createResetTokenForEmail(email);
  if (issued) {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const resetUrl = `${baseUrl}/admin/reset-password?token=${issued.token}`;
    await enqueueMailJob({
      type: "password-reset",
      to: issued.email,
      resetUrl,
      username: issued.username,
    });
  }

  // Always report success, whether or not the email matched an account, so the
  // form can't be used to discover which addresses are registered.
  return { sent: true };
}
