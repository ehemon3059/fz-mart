"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import {
  beginEnrollment,
  confirmEnrollment,
  disableTwoFactor,
  generateBackupCodes,
  TwoFactorError,
} from "@/server/admin/twofactor";

export interface EnrollResult {
  error?: string;
  secret?: string;
  uri?: string;
  qrSvg?: string;
}

export interface ActionResult {
  error?: string;
  success?: string;
}

/** Any active admin can manage their OWN 2FA — no area permission required. */
export async function startTwoFactorSetup(): Promise<EnrollResult> {
  const admin = await requireAdminUser();
  const { secret, uri, qrSvg } = await beginEnrollment(admin.id, admin.username);
  return { secret, uri, qrSvg };
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

export interface BackupCodesResult {
  error?: string;
  codes?: string[];
}

/**
 * Generate a fresh set of 10 backup codes, invalidating any existing ones.
 * Requires 2FA to already be enabled — codes are a fallback for the
 * authenticator, not a standalone second factor.
 */
export async function generateBackupCodesAction(): Promise<BackupCodesResult> {
  const admin = await requireAdminUser();
  const current = await prisma.adminUser.findUnique({ where: { id: admin.id } });
  if (!current?.twoFactorEnabled) {
    return { error: "Enable two-factor authentication first." };
  }
  const codes = await generateBackupCodes(admin.id);
  await logActivity({ adminId: admin.id, actorName: admin.username, action: "admin.2fa_backup_codes_generated" });
  revalidatePath("/admin/account");
  return { codes };
}
