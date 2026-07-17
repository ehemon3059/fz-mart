import Redis, { type RedisOptions } from "ioredis";

// Singleton ioredis connection.
//
// Same hot-reload concern as Prisma: a new TCP connection per module reload
// leaks sockets in dev. Cache one connection on `globalThis`.
//
// Serverless note (Vercel): Redis may be unreachable or unconfigured. This
// client must NEVER crash the app on connection failure — errors are logged
// and commands reject, but the process stays up. Callers that use Redis for
// non-critical paths (cache, rate limiting) should tolerate rejections.
//
// Note: BullMQ requires its OWN connection(s) with `maxRetriesPerRequest: null`
// (see lib/queue.ts). This shared client is for caching, sessions, the
// IP-block set, and rate limiting — not for the queue.

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

/**
 * Base ioredis options shared by this client and the BullMQ connections.
 * Enables TLS when the URL uses the `rediss://` scheme (Upstash and other
 * managed Redis providers). ioredis infers TLS from `rediss://` on its own,
 * but we set it explicitly so managed providers that need an SNI servername
 * connect reliably.
 */
export function redisOptionsFor(url: string): RedisOptions {
  const isTls = url.startsWith("rediss://");
  const options: RedisOptions = {};
  if (isTls) {
    try {
      options.tls = { servername: new URL(url).hostname };
    } catch {
      options.tls = {};
    }
  }
  return options;
}

function createRedis(): Redis {
  // Fall back to a localhost URL when REDIS_URL is unset so construction never
  // throws at import time. The client connects lazily, so an unreachable Redis
  // simply causes commands to reject (which helpers below tolerate) rather than
  // crashing app startup on serverless.
  const url = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  if (!process.env.REDIS_URL) {
    console.warn("[redis] REDIS_URL is not set — Redis-backed features will be unavailable.");
  }

  const client = new Redis(url, {
    ...redisOptionsFor(url),
    // Connect on first command rather than at import time, so a slow or
    // unreachable Redis never blocks or crashes app startup on serverless.
    lazyConnect: true,
    // Bound the retries so a command against a dead Redis rejects quickly
    // instead of buffering forever.
    maxRetriesPerRequest: 3,
    // Cap reconnection backoff so a persistently-down Redis doesn't spin.
    retryStrategy: (times) => Math.min(times * 200, 2000),
  });

  // An 'error' listener is required, otherwise ioredis throws the error as an
  // unhandled exception and crashes the process. This swallows it to a log.
  client.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });

  return client;
}

export const redis: Redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
