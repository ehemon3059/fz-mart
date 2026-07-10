import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { encrypt, decrypt } from "@/lib/crypto";
import { generateTotpSecret, verifyTotp, totpAuthUri } from "@/lib/totp";
import { qrToSvg } from "@/lib/qr";

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
): Promise<{ secret: string; uri: string; qrSvg: string }> {
  const secret = generateTotpSecret();
  await prisma.adminUser.update({
    where: { id: adminId },
    data: { twoFactorSecret: encrypt(secret), twoFactorEnabled: false },
  });
  const uri = totpAuthUri(secret, username);
  return { secret, uri, qrSvg: qrToSvg(uri, { scale: 5 }) };
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
  // silently strip 2FA. Accept either a TOTP code or a one-time backup code —
  // an admin who has lost their authenticator recovers via a backup code.
  const trimmed = code.trim();
  const ok =
    verifyTotp(decrypt(admin.twoFactorSecret), trimmed) ||
    (await verifyBackupCode(adminId, trimmed));
  if (!ok) {
    throw new TwoFactorError("That code didn't match.");
  }
  await prisma.adminUser.update({
    where: { id: adminId },
    // Clearing the secret also orphans the backup codes; remove them too so a
    // future re-enrolment starts with a clean set.
    data: { twoFactorSecret: null, twoFactorEnabled: false },
  });
  await prisma.adminBackupCode.deleteMany({ where: { adminId } });
}

/** Verify a code at login time against the stored secret. */
export async function verifyLoginCode(adminId: number, code: string): Promise<boolean> {
  const admin = await prisma.adminUser.findUnique({ where: { id: adminId } });
  if (!admin?.twoFactorSecret || !admin.twoFactorEnabled) return false;
  return verifyTotp(decrypt(admin.twoFactorSecret), code);
}

// ── Backup codes ──────────────────────────────────────────────────────────
// One-time recovery codes for when the admin can't reach their authenticator
// (lost phone, reinstalled app, etc). Only the bcrypt hash is ever stored —
// same treatment as the account password — so the plaintext set can only be
// read once, at generation time, and never again afterward.

const BACKUP_CODE_COST = 10; // lighter than the password hash (12): generated
// in a batch of 10 and verified at login, where latency matters more than for
// a single password check.
const BACKUP_CODE_COUNT = 10;

/** Formats as e.g. "4F7K-9XQ2" — short enough to type, no ambiguous 0/O/1/I. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function generateBackupCode(): string {
  const bytes = randomBytes(8);
  let raw = "";
  for (let i = 0; i < 8; i++) raw += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return `${raw.slice(0, 4)}-${raw.slice(4)}`;
}

/**
 * Generate a fresh set of backup codes, replacing any existing ones (old
 * unused codes are deleted so a lost/leaked batch can't be reused). Returns
 * the plaintext codes — the ONLY time they're ever available; only bcrypt
 * hashes are persisted.
 */
export async function generateBackupCodes(adminId: number): Promise<string[]> {
  const codes = Array.from({ length: BACKUP_CODE_COUNT }, generateBackupCode);
  const hashes = await Promise.all(codes.map((c) => bcrypt.hash(c, BACKUP_CODE_COST)));
  await prisma.$transaction([
    prisma.adminBackupCode.deleteMany({ where: { adminId } }),
    prisma.adminBackupCode.createMany({
      // Store both the verification hash and the encrypted value: the hash is
      // what verifyBackupCode checks; codeEnc lets the panel show the plaintext
      // of used codes.
      data: codes.map((code, i) => ({
        adminId,
        codeHash: hashes[i],
        codeEnc: encrypt(code),
      })),
    }),
  ]);
  return codes;
}

/** How many unused backup codes remain, for the account panel's status line. */
export async function countUnusedBackupCodes(adminId: number): Promise<number> {
  return prisma.adminBackupCode.count({ where: { adminId, usedAt: null } });
}

export interface UsedBackupCode {
  /** The plaintext code (decrypted), or null for pre-encryption codes. */
  code: string | null;
  usedAt: Date;
}

/**
 * Backup-code tallies for the account panel: total in the current set, how many
 * have been used, and how many are still available. Used codes keep their row
 * (they aren't deleted), so `total` counts the whole active set.
 *
 * `usedCodes` lists consumed codes (newest first) with their plaintext value
 * and the time used. Codes generated before the `codeEnc` column existed have
 * no stored value (`code: null`) and can only show the timestamp.
 */
export async function backupCodeStats(
  adminId: number,
): Promise<{ total: number; used: number; unused: number; usedCodes: UsedBackupCode[] }> {
  const [total, usedRows] = await Promise.all([
    prisma.adminBackupCode.count({ where: { adminId } }),
    prisma.adminBackupCode.findMany({
      where: { adminId, usedAt: { not: null } },
      select: { usedAt: true, codeEnc: true },
      orderBy: { usedAt: "desc" },
    }),
  ]);
  const usedCodes: UsedBackupCode[] = usedRows.map((r) => ({
    usedAt: r.usedAt!,
    code: r.codeEnc ? safeDecrypt(r.codeEnc) : null,
  }));
  return { total, used: usedCodes.length, unused: total - usedCodes.length, usedCodes };
}

/** Decrypt, tolerating a bad/legacy value rather than throwing in a list view. */
function safeDecrypt(value: string): string | null {
  try {
    return decrypt(value);
  } catch {
    return null;
  }
}

/**
 * Verify a backup code at login and consume it on success — each code works
 * once. Comparison is by bcrypt (can't look up by hash), so this checks every
 * unused code for the admin; the set is small (≤10) so this stays fast.
 */
export async function verifyBackupCode(adminId: number, code: string): Promise<boolean> {
  const normalized = code.trim().toUpperCase();
  if (!normalized) return false;

  const unused = await prisma.adminBackupCode.findMany({
    where: { adminId, usedAt: null },
  });
  for (const row of unused) {
    if (await bcrypt.compare(normalized, row.codeHash)) {
      // Guard against a double-submit racing this same code to consume twice.
      const result = await prisma.adminBackupCode.updateMany({
        where: { id: row.id, usedAt: null },
        data: { usedAt: new Date() },
      });
      if (result.count === 1) return true;
    }
  }
  return false;
}
