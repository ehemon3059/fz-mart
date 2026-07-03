import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { generateTotpSecret, verifyTotp, totpAuthUri } from "@/lib/totp";

// Optional TOTP two-factor for admin accounts. The shared secret is encrypted
// at rest (lib/crypto), like every other integration secret. Enrolment is
// two-step: store the secret with enabled=false, then require a valid code to
// flip enabled=true, proving the authenticator was set up correctly.

export class TwoFactorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TwoFactorError";
  }
}

export async function beginEnrollment(
  adminId: number,
  username: string,
): Promise<{ secret: string; uri: string }> {
  const secret = generateTotpSecret();
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { twoFactorSecret: encrypt(secret), twoFactorEnabled: false },
  });
  return { secret, uri: totpAuthUri(secret, username) };
}

export async function confirmEnrollment(adminId: number, code: string): Promise<void> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin?.twoFactorSecret) {
    throw new TwoFactorError("Start setup again — no pending secret found.");
  }
  if (!verifyTotp(decrypt(admin.twoFactorSecret), code)) {
    throw new TwoFactorError("That code didn't match. Check your authenticator and try again.");
  }
  await prisma.adminUser.update({ where: { id: adminId }, data: { twoFactorEnabled: true } });
}

export async function disableTwoFactor(adminId: number, code: string): Promise<void> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin?.twoFactorSecret || !admin.twoFactorEnabled) {
    throw new TwoFactorError("Two-factor is not enabled.");
  }
  // Require a valid current code to turn it off, so a hijacked session can't
  // silently strip 2FA.
  if (!verifyTotp(decrypt(admin.twoFactorSecret), code)) {
    throw new TwoFactorError("That code didn't match.");
  }
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  });
}

/** Verify a code at login time against the stored secret. */
export async function verifyLoginCode(adminId: number, code: string): Promise<boolean> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin?.twoFactorSecret || !admin.twoFactorEnabled) return false;
  return verifyTotp(decrypt(admin.twoFactorSecret), code);
}
