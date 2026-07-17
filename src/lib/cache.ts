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
  // Redis is a cache, not a source of truth: if it's unreachable (e.g. not
  // provisioned on a serverless deploy) we bypass it and compute directly
  // rather than letting the whole request fail.
  try {
    const cached = await redis.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
  } catch (err) {
    console.error("[cache] read failed, computing without cache:", (err as Error).message);
    return compute();
  }

  const value = await compute();
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch (err) {
    console.error("[cache] write failed, returning value uncached:", (err as Error).message);
  }
  return value;
}

export async function invalidateCache(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch (err) {
    console.error("[cache] invalidate failed:", (err as Error).message);
  }
}
