import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

// Two layers, one truth: the BlockedIp DB table is what admins edit; the
// Redis SET is what gets checked on every request (O(1), no DB hit). On
// add/remove we sync both, and rebuildFromDb() restores the Redis set from
// the DB on boot so a cache flush can't silently unblock everyone.

const REDIS_SET_KEY = "blocked_ips";

export async function isIpBlocked(ip: string): Promise<boolean> {
  const result = await redis.sismember(REDIS_SET_KEY, ip);
  return result === 1;
}

export async function blockIp(ip: string, reason?: string): Promise<void> {
  await prisma.blockedIp.upsert({
    where: { ip },
    create: { ip, reason },
    update: { reason },
  });
  await redis.sadd(REDIS_SET_KEY, ip);
}

export async function unblockIp(ip: string): Promise<void> {
  await prisma.blockedIp.delete({ where: { ip } }).catch(() => {
    // already gone from the DB — still make sure Redis agrees.
  });
  await redis.srem(REDIS_SET_KEY, ip);
}

/** Rebuild the Redis set from the DB. Call once at server boot. */
export async function rebuildIpBlockSet(): Promise<void> {
  const rows = await prisma.blockedIp.findMany({ select: { ip: true } });
  await redis.del(REDIS_SET_KEY);
  if (rows.length > 0) {
    await redis.sadd(REDIS_SET_KEY, ...rows.map((r) => r.ip));
  }
}
