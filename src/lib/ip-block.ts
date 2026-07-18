import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

// Two layers, one truth: the BlockedIp DB table is what admins edit; the
// Redis SET is what gets checked on every request (O(1), no DB hit). On
// add/remove we sync both, and rebuildFromDb() restores the Redis set from
// the DB on boot so a cache flush can't silently unblock everyone.

const REDIS_SET_KEY = "blocked_ips";

// Whether ANY IP is blocked, cached in-process. isIpBlocked runs in the root
// layout on EVERY request; when the block list is empty (the overwhelmingly
// common case) we skip the per-IP Redis round-trip entirely and just return
// false. This flag is refreshed lazily with a short TTL and eagerly on
// block/unblock, so a newly-blocked IP takes effect within the TTL at worst.
let anyBlockedCache: { value: boolean; at: number } | null = null;
const ANY_BLOCKED_TTL_MS = 30_000;

async function anyIpBlocked(): Promise<boolean> {
  const now = Date.now();
  if (anyBlockedCache && now - anyBlockedCache.at < ANY_BLOCKED_TTL_MS) {
    return anyBlockedCache.value;
  }
  try {
    const size = await redis.scard(REDIS_SET_KEY);
    anyBlockedCache = { value: size > 0, at: now };
    return size > 0;
  } catch {
    // Redis down → fail open (nothing blocked); don't cache the failure long.
    anyBlockedCache = { value: false, at: now };
    return false;
  }
}

export async function isIpBlocked(ip: string): Promise<boolean> {
  // Fast path: when no IPs are blocked at all, skip the membership check.
  if (!(await anyIpBlocked())) return false;

  // Fail open if Redis is unreachable so the whole site doesn't 500 — an
  // unavailable block set means "don't block", never "block everyone".
  try {
    const result = await redis.sismember(REDIS_SET_KEY, ip);
    return result === 1;
  } catch (err) {
    console.error("[ip-block] check failed, allowing request:", (err as Error).message);
    return false;
  }
}

export async function blockIp(ip: string, reason?: string): Promise<void> {
  await prisma.blockedIp.upsert({
    where: { ip },
    create: { ip, reason },
    update: { reason },
  });
  await redis.sadd(REDIS_SET_KEY, ip);
  anyBlockedCache = null; // force a refresh so the block takes effect at once
}

export async function unblockIp(ip: string): Promise<void> {
  await prisma.blockedIp.delete({ where: { ip } }).catch(() => {
    // already gone from the DB — still make sure Redis agrees.
  });
  await redis.srem(REDIS_SET_KEY, ip);
  anyBlockedCache = null;
}

/** Rebuild the Redis set from the DB. Call once at server boot. */
export async function rebuildIpBlockSet(): Promise<void> {
  const rows = await prisma.blockedIp.findMany({ select: { ip: true } });
  await redis.del(REDIS_SET_KEY);
  if (rows.length > 0) {
    await redis.sadd(REDIS_SET_KEY, ...rows.map((r) => r.ip));
  }
  anyBlockedCache = null;
}
