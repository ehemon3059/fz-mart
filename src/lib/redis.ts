import Redis from "ioredis";

// Singleton ioredis connection.
//
// Same hot-reload concern as Prisma: a new TCP connection per module reload
// leaks sockets in dev. Cache one connection on `globalThis`.
//
// Note: BullMQ requires its OWN connection(s) with `maxRetriesPerRequest: null`
// (see lib/queue.ts). This shared client is for caching, sessions, the
// IP-block set, and rate limiting — not for the queue.

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

function createRedis(): Redis {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set. Copy .env.example to .env.");
  }

  const client = new Redis(url, {
    // Fail fast on a missing/unreachable Redis rather than buffering commands
    // indefinitely, so misconfiguration surfaces immediately in development.
    maxRetriesPerRequest: 3,
    lazyConnect: false,
  });

  client.on("error", (err) => {
    console.error("[redis] connection error:", err.message);
  });

  return client;
}

export const redis = globalForRedis.redis ?? createRedis();

if (process.env.NODE_ENV !== "production") {
  globalForRedis.redis = redis;
}
