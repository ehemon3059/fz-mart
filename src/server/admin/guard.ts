import "server-only";
import { redirect } from "next/navigation";
import type { AdminUser } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getCurrentAdmin } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";

// THE admin authorization gate. Every protected admin page (via its area
// layout) and every admin server action calls one of these — there are no
// ad-hoc role checks scattered elsewhere.
//
// Authority is the DATABASE row, re-read each request, not the session's
// snapshot: a role change or deactivation therefore takes effect on the very
// next request without waiting for the session to expire or the admin to log
// back in.

/** The live, active admin behind the current session, or null. */
export async function getActiveAdmin(): Promise<AdminUser | null> {
  const session = await getCurrentAdmin();
  if (!session) return null;
  const admin = await prisma.adminUser.findUnique({ where: { id: session.adminId } });
  if (!admin || !admin.isActive) return null;
  return admin;
}

/** Require any active admin (e.g. the dashboard). Redirects to login otherwise. */
export async function requireAdminUser(): Promise<AdminUser> {
  const admin = await getActiveAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

/**
 * Require an active admin whose role grants `permission`. Unauthenticated →
 * login; authenticated but unauthorized → dashboard (which every role can
 * see). Returns the admin so callers can log/act as them.
 */
export async function requirePermission(permission: Permission): Promise<AdminUser> {
  const admin = await requireAdminUser();
  if (!hasPermission(admin.role, permission)) {
    redirect("/admin/dashboard");
  }
  return admin;
}

/** OWNER-only shortcut (admin management). */
export async function requireOwner(): Promise<AdminUser> {
  return requirePermission("admins");
}
