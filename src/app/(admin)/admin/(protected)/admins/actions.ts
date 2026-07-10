"use server";

import { revalidatePath } from "next/cache";
import { requireOwner } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import {
  inviteAdmin,
  setAdminRole,
  setAdminActive,
  deleteAdmin,
  AdminManageError,
} from "@/server/admin/manage";
import { enqueueMailJob } from "@/jobs/enqueue";
import { isAdminRole, ROLE_LABELS } from "@/lib/permissions";
import { siteUrl } from "@/lib/seo";
import { primeSiteUrl } from "@/server/settings/site";
import { getCompanyInfo } from "@/server/settings/company";

export interface ActionResult {
  error?: string;
  success?: string;
}

export async function inviteAdminAction(formData: FormData): Promise<ActionResult> {
  const admin = await requireOwner();

  const email = String(formData.get("email") ?? "").trim();
  const roleRaw = String(formData.get("role") ?? "");
  if (!isAdminRole(roleRaw)) return { error: "Please choose a valid role." };

  let invited;
  try {
    invited = await inviteAdmin(email, roleRaw);
  } catch (err) {
    if (err instanceof AdminManageError) return { error: err.message };
    throw err;
  }

  // Email the invitee a set-password link. The domain comes from the
  // admin-configured Site URL (Appearance → Site URL), and the brand name +
  // role are shown in the invite-specific template.
  await primeSiteUrl();
  const company = await getCompanyInfo();
  const setupUrl = `${siteUrl()}/admin/reset-password?token=${invited.token}`;
  await enqueueMailJob({
    type: "admin-invite",
    to: email,
    setupUrl,
    username: invited.username,
    roleLabel: ROLE_LABELS[roleRaw],
    companyName: company.copyrightText,
  }).catch((e) => console.error("[admins] failed to enqueue invite mail:", e));

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "admin.invite",
    detail: `Invited ${email} as ${roleRaw}`,
  });

  revalidatePath("/admin/admins");
  return { success: `Invitation sent to ${email}.` };
}

export async function changeRoleAction(targetId: number, formData: FormData): Promise<ActionResult> {
  const admin = await requireOwner();
  const roleRaw = String(formData.get("role") ?? "");
  if (!isAdminRole(roleRaw)) return { error: "Invalid role." };

  try {
    await setAdminRole(targetId, admin.id, roleRaw);
  } catch (err) {
    if (err instanceof AdminManageError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "admin.role_change",
    detail: `Set admin #${targetId} role to ${roleRaw}`,
  });

  revalidatePath("/admin/admins");
  return { success: "Role updated." };
}

export async function toggleActiveAction(targetId: number, isActive: boolean): Promise<ActionResult> {
  const admin = await requireOwner();

  try {
    await setAdminActive(targetId, admin.id, isActive);
  } catch (err) {
    if (err instanceof AdminManageError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: isActive ? "admin.activate" : "admin.deactivate",
    detail: `Admin #${targetId} ${isActive ? "activated" : "deactivated"}`,
  });

  revalidatePath("/admin/admins");
  return { success: isActive ? "Admin activated." : "Admin deactivated." };
}

export async function deleteAdminAction(targetId: number): Promise<ActionResult> {
  const admin = await requireOwner();

  try {
    await deleteAdmin(targetId, admin.id);
  } catch (err) {
    if (err instanceof AdminManageError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "admin.delete",
    detail: `Deleted admin #${targetId}`,
  });

  revalidatePath("/admin/admins");
  return { success: "Admin deleted." };
}
