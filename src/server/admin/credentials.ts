import "server-only";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// Self-service credential changes: an admin editing their OWN username and
// password. Distinct from server/admin/manage.ts, which is OWNER-only team
// management. Every change here re-verifies the caller's CURRENT password, so
// a hijacked-but-unlocked session still can't silently take over the account.

export class CredentialError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CredentialError";
  }
}

const USERNAME_RE = /^[a-zA-Z0-9._-]{3,32}$/;
const MIN_PASSWORD_LENGTH = 8;

async function assertCurrentPassword(adminId: number, currentPassword: string): Promise<void> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin) throw new CredentialError("Account not found.");
  const ok = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!ok) throw new CredentialError("Your current password is incorrect.");
}

/**
 * Change the caller's username after re-verifying their current password.
 * Returns the new username so the caller can refresh the session snapshot.
 */
export async function changeOwnUsername(
  adminId: number,
  newUsername: string,
  currentPassword: string,
): Promise<string> {
  const username = newUsername.trim();
  if (!USERNAME_RE.test(username)) {
    throw new CredentialError(
      "Username must be 3–32 characters: letters, numbers, dot, underscore or hyphen.",
    );
  }

  await assertCurrentPassword(adminId, currentPassword);

  const clash = await prisma.adminUser.findUnique({ where: { username } });
  if (clash && clash.id !== adminId) {
    throw new CredentialError("That username is already taken.");
  }
  if (clash && clash.id === adminId) {
    // No-op change — nothing to do, but not an error worth surfacing loudly.
    return username;
  }

  await prisma.adminUser.update({ where: { id: adminId }, data: { username } });
  return username;
}

/** Change the caller's password after re-verifying their current one. */
export async function changeOwnPassword(
  adminId: number,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    throw new CredentialError(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  await assertCurrentPassword(adminId, currentPassword);

  if (currentPassword === newPassword) {
    throw new CredentialError("New password must differ from your current one.");
  }

  const passwordHash = await hashPassword(newPassword);
  await prisma.adminUser.update({ where: { id: adminId }, data: { passwordHash } });
}
