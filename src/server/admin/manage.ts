import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { slugify } from "@/lib/slugify";
import type { AdminRole } from "@/lib/permissions";

// OWNER-only admin management. Guarded at the action layer (requireOwner);
// these functions hold the invariants that keep an owner from locking the
// whole team out.

export class AdminManageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AdminManageError";
  }
}

export async function listAdmins() {
  return prisma.adminUser.findMany({
    orderBy: [{ isActive: "desc" }, { id: "asc" }],
    select: {
      id: true,
      username: true,
      email: true,
      role: true,
      isActive: true,
      twoFactorEnabled: true,
      createdAt: true,
    },
  });
}

/** Derive a unique username from an email local-part. */
async function uniqueUsername(email: string): Promise<string> {
  const base = slugify(email.split("@")[0]) || "admin";
  let candidate = base;
  let n = 1;
  // Loops at most a handful of times in practice.
  while (await prisma.adminUser.findUnique({ where: { username: candidate } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

/**
 * Create a new admin in an invited state: active, with an unusable random
 * password. Returns a password-reset token the caller emails so the invitee
 * can set their own password (reuses the existing reset flow). Throws if the
 * email is already taken.
 */
export async function inviteAdmin(
  email: string,
  role: AdminRole,
): Promise<{ token: string; username: string }> {
  const normalized = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new AdminManageError("Please enter a valid email address.");
  }
  const existing = await prisma.adminUser.findUnique({ where: { email: normalized } });
  if (existing) {
    throw new AdminManageError("An admin with that email already exists.");
  }

  const username = await uniqueUsername(normalized);
  // Random, un-guessable placeholder hash — the invitee must go through the
  // reset link to set a real password; this can never match a login attempt.
  const placeholderHash = await hashPassword(randomBytes(32).toString("hex"));

  const admin = await prisma.adminUser.create({
    data: { username, email: normalized, role, passwordHash: placeholderHash, isActive: true },
  });

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      adminId: admin.id,
      token,
      // Invites get a longer window than a routine reset.
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { token, username };
}

/** Count active OWNERs — used to prevent removing the last one. */
async function activeOwnerCount(): Promise<number> {
  return prisma.adminUser.count({ where: { role: "OWNER", isActive: true } });
}

export async function setAdminRole(
  targetId: number,
  actingAdminId: number,
  role: AdminRole,
): Promise<void> {
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (!target) throw new AdminManageError("Admin not found.");

  // Don't let the last active owner demote themselves (or another owner) into
  // a state with zero owners.
  if (target.role === "OWNER" && role !== "OWNER" && target.isActive) {
    if ((await activeOwnerCount()) <= 1) {
      throw new AdminManageError("You can't remove the last remaining owner.");
    }
  }
  if (targetId === actingAdminId && role !== "OWNER") {
    throw new AdminManageError("You can't change your own role.");
  }

  await prisma.adminUser.update({ where: { id: targetId }, data: { role } });
}

export async function setAdminActive(
  targetId: number,
  actingAdminId: number,
  isActive: boolean,
): Promise<void> {
  if (targetId === actingAdminId && !isActive) {
    throw new AdminManageError("You can't deactivate your own account.");
  }
  const target = await prisma.adminUser.findUnique({ where: { id: targetId } });
  if (!target) throw new AdminManageError("Admin not found.");

  if (!isActive && target.role === "OWNER" && target.isActive) {
    if ((await activeOwnerCount()) <= 1) {
      throw new AdminManageError("You can't deactivate the last remaining owner.");
    }
  }

  await prisma.adminUser.update({ where: { id: targetId }, data: { isActive } });
}
