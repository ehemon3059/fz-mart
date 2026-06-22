import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/integrations/mail";
import { orderConfirmationHtml } from "@/integrations/mail/templates";
import { QUEUE_NAMES } from "@/lib/queue";
import type { MailJob } from "./types";

// Runs in the separate worker process (see jobs/run.ts), NOT inside Next.js.
// Every attempt — success or failure — is written to MailLog so failures are
// auditable even though BullMQ retries automatically with backoff.

function subjectFor(job: MailJob): string {
  switch (job.type) {
    case "order-confirmation":
      return `Order ${job.orderNo} confirmed — fz-mart`;
  }
}

function htmlFor(job: MailJob): string {
  switch (job.type) {
    case "order-confirmation":
      return orderConfirmationHtml({
        orderNo: job.orderNo,
        customerName: job.customerName,
        items: job.items,
        total: job.total,
      });
  }
}

export function createMailWorker(connection: { url: string }) {
  return new Worker<MailJob>(
    QUEUE_NAMES.mail,
    async (job: Job<MailJob>) => {
      const subject = subjectFor(job.data);
      const html = htmlFor(job.data);

      try {
        await sendMail({ to: job.data.to, subject, html });
        await prisma.mailLog.create({
          data: {
            to: job.data.to,
            subject,
            template: job.data.type,
            status: "SENT",
          },
        });
      } catch (err) {
        await prisma.mailLog.create({
          data: {
            to: job.data.to,
            subject,
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
