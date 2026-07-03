import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { sendSms } from "@/integrations/sms";
import { QUEUE_NAMES } from "@/lib/queue";
import { ORDER_STATUS_LABELS } from "@/config/order-status";
import type { SmsJob } from "./types";

function messageFor(job: SmsJob): string {
  // Generic jobs carry a pre-rendered body; order-status jobs are templated here.
  if (job.type !== "order-status") {
    return job.message;
  }
  const label = ORDER_STATUS_LABELS[job.status];
  return `fz-mart: Your order ${job.orderNo} is now ${label}.`;
}

export function createSmsWorker(connection: { url: string }) {
  return new Worker<SmsJob>(
    QUEUE_NAMES.sms,
    async (job: Job<SmsJob>) => {
      const message = messageFor(job.data);

      try {
        await sendSms({ to: job.data.to, message });
        await prisma.smsLog.create({
          data: { to: job.data.to, template: job.data.type, status: "SENT" },
        });
      } catch (err) {
        await prisma.smsLog.create({
          data: {
            to: job.data.to,
            template: job.data.type,
            status: "FAILED",
            error: err instanceof Error ? err.message : String(err),
          },
        });
        throw err; // rethrow so BullMQ retries with backoff
      }
    },
    { connection: { url: connection.url, maxRetriesPerRequest: null } },
  );
}
