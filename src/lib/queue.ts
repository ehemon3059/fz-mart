import { Queue, type ConnectionOptions } from "bullmq";
import { redisOptionsFor } from "@/lib/redis";

// Queue producers (the app side). Workers live in src/jobs/ and run as a
// SEPARATE process — see the deployment note in the blueprint.
//
// We hand BullMQ connection OPTIONS (a URL) rather than a shared ioredis
// instance: BullMQ bundles its own ioredis copy and requires
// `maxRetriesPerRequest: null`, so letting it manage its own connection avoids
// version-mismatch type conflicts with lib/redis.ts.
//
// Serverless note (Vercel): no worker process runs, so jobs enqueued here are
// simply never consumed — that's acceptable for a demo. Enqueue calls must not
// break the flows that make them; see the try/catch in src/jobs/enqueue.ts.

const globalForQueue = globalThis as unknown as {
  queues: Map<string, Queue> | undefined;
};

/**
 * Whether a job queue is even usable in this environment. Producers short-
 * circuit on this so a missing REDIS_URL doesn't throw on the request path.
 */
export function isQueueEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}

function getConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set.");
  // Enable TLS for `rediss://` URLs (Upstash) so the BullMQ connection matches
  // the shared client's transport. Cap retries so producing against a dead
  // Redis rejects quickly instead of buffering forever.
  return { url, ...redisOptionsFor(url), maxRetriesPerRequest: null };
}

// Queue names — shared between producers here and workers in src/jobs/.
export const QUEUE_NAMES = {
  mail: "mail",
  sms: "sms",
  payments: "payments",
  carts: "carts",
  maintenance: "maintenance",
} as const;

const queues = globalForQueue.queues ?? new Map<string, Queue>();
if (process.env.NODE_ENV !== "production") globalForQueue.queues = queues;

export function getQueue(name: (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES]): Queue {
  let q = queues.get(name);
  if (!q) {
    q = new Queue(name, {
      connection: getConnection(),
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 2000 },
        removeOnComplete: 1000,
        removeOnFail: 5000,
      },
    });
    queues.set(name, q);
  }
  return q;
}
