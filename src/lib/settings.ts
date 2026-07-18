import { prisma } from "@/lib/prisma";
import { decrypt, encrypt } from "@/lib/crypto";
import { getOrSetCache, invalidateCache } from "@/lib/cache";

// Typed reader/writer over the generic Setting table.
//
// Callers ask for a (group, key); encrypted values are transparently decrypted
// on read and encrypted on write. Many later features (SMTP, courier, fraud,
// SMS, GTM, Pixel) depend on this, which is why it is built in Phase 0.
//
// Settings are read on nearly every request (brand palette, GTM/Pixel ids,
// locale, newsletter copy…) but change very rarely, so reads are cached in
// Redis per GROUP. A whole group is small, and most callers read a group at
// once via getSettingGroup, so one cache entry per group is the natural unit.
// Any write to a group invalidates that group's entry, so freshness is exact
// (not just TTL-bounded). If Redis is down, getOrSetCache falls through to the
// DB — see lib/cache.ts.

export interface SettingInput {
  group: string;
  key: string;
  value: string;
  /** When true, the value is encrypted at rest before storing. */
  encrypted?: boolean;
}

// Long TTL: invalidation on write is the real freshness mechanism; the TTL is
// only a safety net against a missed invalidation.
const SETTINGS_TTL_SECONDS = 3600;

function settingsCacheKey(group: string): string {
  return `settings:group:${group}`;
}

/**
 * Read every key in a group as a plain object (decrypted), cached in Redis.
 * This is the single DB-touching read; getSetting derives from it.
 */
export async function getSettingGroup(
  group: string,
): Promise<Record<string, string>> {
  return getOrSetCache(settingsCacheKey(group), SETTINGS_TTL_SECONDS, async () => {
    const rows = await prisma.setting.findMany({ where: { group } });
    const out: Record<string, string> = {};
    for (const row of rows) {
      out[row.key] = row.isEncrypted ? decrypt(row.value) : row.value;
    }
    return out;
  });
}

/** Read a single setting value from the (cached) group; null if absent. */
export async function getSetting(
  group: string,
  key: string,
): Promise<string | null> {
  const groupValues = await getSettingGroup(group);
  return groupValues[key] ?? null;
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
  // Invalidate the group so the next read reflects this write immediately.
  await invalidateCache(settingsCacheKey(group));
}
