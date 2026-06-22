import { redis } from "@/lib/redis";

// Fixed-window rate limiter on Redis: INCR a counter keyed by (scope, identifier),
// set its expiry on the first hit in the window, reject once the limit is
// exceeded. Cheap (one round trip on the hot path) and atomic enough for
// abuse-prevention purposes — exact sliding-window precision isn't needed
// here, just "stop hammering this endpoint."

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the window resets. */
  resetInSeconds: number;
}

export async function rateLimit(
  scope: string,
  identifier: string,
  limit: number,
  windowSeconds: number,
): Promise<RateLimitResult> {
  const key = `ratelimit:${scope}:${identifier}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, windowSeconds);
  }

  const ttl = await redis.ttl(key);
  const resetInSeconds = ttl > 0 ? ttl : windowSeconds;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    resetInSeconds,
  };
}
