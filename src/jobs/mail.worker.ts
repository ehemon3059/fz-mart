import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { processMailJob } from "./mail-send";
import type { MailJob } from "./types";

// Runs in the separate worker process (see jobs/run.ts), NOT inside Next.js.
// The actual send + MailLog write live in mail-send.ts (processMailJob), shared
// with the synchronous/serverless path — this file only wires that into a
// BullMQ Worker and lets failures propagate so BullMQ retries with backoff.

export function createMailWorker(connection: { url: string }) {
  return new Worker<MailJob>(
    QUEUE_NAMES.mail,
    async (job: Job<MailJob>) => {
      // Rethrows on failure (after logging to MailLog) → BullMQ retries.
      await processMailJob(job.data);
    },
    { connection: { url: connection.url, maxRetriesPerRequest: null } },
  );
}
