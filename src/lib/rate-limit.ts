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

  try {
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
  } catch (err) {
    // Fail open: if Redis is unreachable (e.g. not provisioned on serverless),
    // allow the request rather than blocking legitimate traffic. Rate limiting
    // is best-effort abuse prevention, not a correctness guarantee.
    console.error("[rate-limit] Redis unavailable, allowing request:", (err as Error).message);
    return { allowed: true, remaining: limit, resetInSeconds: windowSeconds };
  }
}
