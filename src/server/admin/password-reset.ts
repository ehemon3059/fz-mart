import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

// Admin password-reset core. Mirrors the customer magic-link model: a random,
// single-use, short-lived token, kept after use for audit rather than deleted.

export const RESET_TOKEN_TTL_MINUTES = 30;
export const MIN_PASSWORD_LENGTH = 8;

/**
 * Issue a reset token for the admin owning `email`, or return null if no admin
 * has that address. The caller MUST treat null the same as success to avoid
 * leaking which emails map to an account (enumeration).
 */
export async function createResetTokenForEmail(
  email: string,
): Promise<{ token: string; email: string; username: string } | null> {
  const admin = await prisma.adminUser.findUnique({ where: { email } });
  if (!admin || !admin.email) return null;

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: {
      adminId: admin.id,
      token,
      expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000),
    },
  });

  return { token, email: admin.email, username: admin.username };
}

/** A token is usable only if it exists, is unused, and hasn't expired. */
export async function findValidResetToken(token: string) {
  const row = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;
  return row;
}

/**
 * Consume a valid token and set the new password in one transaction, so a
 * token can never be spent without the password actually changing (and vice
 * versa). Returns false if the token is no longer valid.
 */
export async function resetPasswordWithToken(
  token: string,
  newPassword: string,
): Promise<boolean> {
  const row = await findValidResetToken(token);
  if (!row) return false;

  const passwordHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.adminUser.update({
      where: { id: row.adminId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
    // Invalidate any other outstanding tokens for this admin so a second
    // in-flight reset link can't be used after the password has changed.
    prisma.passwordResetToken.updateMany({
      where: { adminId: row.adminId, usedAt: null },
      data: { usedAt: new Date() },
    }),
  ]);

  return true;
}
