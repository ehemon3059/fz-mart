import { Queue, type ConnectionOptions } from "bullmq";

// Queue producers (the app side). Workers live in src/jobs/ and run as a
// SEPARATE process — see the deployment note in the blueprint.
//
// We hand BullMQ connection OPTIONS (a URL) rather than a shared ioredis
// instance: BullMQ bundles its own ioredis copy and requires
// `maxRetriesPerRequest: null`, so letting it manage its own connection avoids
// version-mismatch type conflicts with lib/redis.ts.

const globalForQueue = globalThis as unknown as {
  queues: Map<string, Queue> | undefined;
};

function getConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL;
  if (!url) throw new Error("REDIS_URL is not set.");
  return { url, maxRetriesPerRequest: null };
}

// Queue names — shared between producers here and workers in src/jobs/.
export const QUEUE_NAMES = {
  mail: "mail",
  sms: "sms",
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
