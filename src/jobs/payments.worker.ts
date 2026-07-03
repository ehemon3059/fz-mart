import { Worker, type Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { expireUnpaidOrder } from "@/server/payments";
import type { PaymentJob } from "./types";

// Consumes the delayed payment-expiry jobs armed at online checkout. The
// heavy lifting (idempotent cancel + restock) lives in server/payments so the
// same logic serves failed callbacks too; this worker is just the timer.

export function createPaymentsWorker(connection: { url: string }) {
  return new Worker<PaymentJob>(
    QUEUE_NAMES.payments,
    async (job: Job<PaymentJob>) => {
      if (job.data.type === "expire-payment") {
        await expireUnpaidOrder(job.data.orderId);
      }
    },
    { connection: { url: connection.url, maxRetriesPerRequest: null } },
  );
}
