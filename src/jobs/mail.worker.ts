import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/integrations/mail";
import {
  orderConfirmationHtml,
  magicLinkHtml,
  passwordResetHtml,
  adminInviteHtml,
  abandonedCartHtml,
  backInStockHtml,
  lowStockDigestHtml,
} from "@/integrations/mail/templates";
import { RESET_TOKEN_TTL_MINUTES } from "@/server/admin/password-reset";
import { QUEUE_NAMES } from "@/lib/queue";
import type { MailJob } from "./types";

// Runs in the separate worker process (see jobs/run.ts), NOT inside Next.js.
// Every attempt — success or failure — is written to MailLog so failures are
// auditable even though BullMQ retries automatically with backoff.

function subjectFor(job: MailJob): string {
  switch (job.type) {
    case "order-confirmation":
      return `Order ${job.orderNo} confirmed — fz-mart`;
    case "magic-link":
      return "Your fz-mart sign-in link";
    case "password-reset":
      return "Reset your fz-mart admin password";
    case "admin-invite":
      return `You've been invited to ${job.companyName || "fz-mart"} as ${job.roleLabel}`;
    case "abandoned-cart":
      return "You left items in your cart — fz-mart";
    case "back-in-stock":
      return `${job.productName} is back in stock — fz-mart`;
    case "low-stock-digest":
      return `Low stock: ${job.products.length} product(s) need restocking — fz-mart`;
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
    case "magic-link":
      return magicLinkHtml(job.loginUrl);
    case "password-reset":
      return passwordResetHtml({
        resetUrl: job.resetUrl,
        username: job.username,
        ttlMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    case "admin-invite":
      return adminInviteHtml({
        setupUrl: job.setupUrl,
        username: job.username,
        roleLabel: job.roleLabel,
        companyName: job.companyName,
        ttlMinutes: RESET_TOKEN_TTL_MINUTES,
      });
    case "abandoned-cart":
      return abandonedCartHtml(job.recoveryUrl);
    case "back-in-stock":
      return backInStockHtml({ productName: job.productName, productUrl: job.productUrl });
    case "low-stock-digest":
      return lowStockDigestHtml(job.products);
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
