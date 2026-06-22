import { redis } from "@/lib/redis";

// Generic cache-aside helper: read from Redis, or compute and store with a
// TTL on miss. Every call site using this MUST document what clears the
// cache early (see callers in server/reports/) — a cache without a stated
// invalidation rule is a stale-data bug generator.

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  compute: () => Promise<T>,
): Promise<T> {
  const cached = await redis.get(key);
  if (cached !== null) {
    return JSON.parse(cached) as T;
  }
  const value = await compute();
  await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  return value;
}

export async function invalidateCache(key: string): Promise<void> {
  await redis.del(key);
}
