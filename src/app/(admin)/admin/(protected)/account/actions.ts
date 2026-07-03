"use server";

import { revalidatePath } from "next/cache";
import { requireAdminUser } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import {
  beginEnrollment,
  confirmEnrollment,
  disableTwoFactor,
  TwoFactorError,
} from "@/server/admin/twofactor";

export interface EnrollResult {
  error?: string;
  secret?: string;
  uri?: string;
}

export interface ActionResult {
  error?: string;
  success?: string;
}

/** Any active admin can manage their OWN 2FA — no area permission required. */
export async function startTwoFactorSetup(): Promise<EnrollResult> {
  const admin = await requireAdminUser();
  const { secret, uri } = await beginEnrollment(admin.id, admin.username);
  return { secret, uri };
}

export async function confirmTwoFactorSetup(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdminUser();
  const code = String(formData.get("code") ?? "").trim();
  try {
    await confirmEnrollment(admin.id, code);
  } catch (err) {
    if (err instanceof TwoFactorError) return { error: err.message };
    throw err;
  }
  await logActivity({ adminId: admin.id, actorName: admin.username, action: "admin.2fa_enabled" });
  revalidatePath("/admin/account");
  return { success: "Two-factor authentication is now enabled." };
}

export async function disableTwoFactorSetup(formData: FormData): Promise<ActionResult> {
  const admin = await requireAdminUser();
  const code = String(formData.get("code") ?? "").trim();
  try {
    await disableTwoFactor(admin.id, code);
  } catch (err) {
    if (err instanceof TwoFactorError) return { error: err.message };
    throw err;
  }
  await logActivity({ adminId: admin.id, actorName: admin.username, action: "admin.2fa_disabled" });
  revalidatePath("/admin/account");
  return { success: "Two-factor authentication disabled." };
}
