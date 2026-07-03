"use server";

import { redirect } from "next/navigation";
import {
  resetPasswordWithToken,
  MIN_PASSWORD_LENGTH,
} from "@/server/admin/password-reset";

export interface ResetPasswordResult {
  error?: string;
}

export async function resetPassword(
  token: string,
  formData: FormData,
): Promise<ResetPasswordResult> {
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.` };
  }
  if (password !== confirm) {
    return { error: "Passwords don't match." };
  }

  const ok = await resetPasswordWithToken(token, password);
  if (!ok) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }

  // Password changed — send them to sign in with the new one.
  redirect("/admin/login?reset=1");
}
