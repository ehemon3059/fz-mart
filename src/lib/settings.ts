import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";

// Typed reader/writer over the generic Setting table.
//
// Callers ask for a (group, key); encrypted values are transparently decrypted
// on read and encrypted on write. Many later features (SMTP, courier, fraud,
// SMS, GTM, Pixel) depend on this, which is why it is built in Phase 0.

export interface SettingInput {
  group: string;
  key: string;
  value: string;
  /** When true, the value is encrypted at rest before storing. */
  encrypted?: boolean;
}

/** Read a single setting value, decrypting if it was stored encrypted. */
export async function getSetting(
  group: string,
  key: string,
): Promise<string | null> {
  const row = await prisma.setting.findUnique({
    where: { group_key: { group, key } },
  });
  if (!row) return null;
  return row.isEncrypted ? decrypt(row.value) : row.value;
}

/** Read every key in a group as a plain object, decrypting as needed. */
export async function getSettingGroup(
  group: string,
): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany({ where: { group } });
  const out: Record<string, string> = {};
  for (const row of rows) {
    out[row.key] = row.isEncrypted ? decrypt(row.value) : row.value;
  }
  return out;
}

/** Upsert a single setting; encrypts the value when `encrypted` is set. */
export async function setSetting(input: SettingInput): Promise<void> {
  const { group, key, value, encrypted = false } = input;
  const stored = encrypted ? encrypt(value) : value;
  await prisma.setting.upsert({
    where: { group_key: { group, key } },
    create: { group, key, value: stored, isEncrypted: encrypted },
    update: { value: stored, isEncrypted: encrypted },
  });
}
