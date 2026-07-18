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
import type { MailJob } from "./types";

// Shared mail delivery — the single place that turns a MailJob into a rendered
// email, sends it over SMTP, and records the attempt in MailLog.
//
// Used by BOTH:
//   • the BullMQ worker (jobs/mail.worker.ts) when a worker process runs, and
//   • the synchronous path (sendMailNow, below) for serverless deploys where
//     there is no worker — the email is sent inside the request that triggers
//     it (see jobs/enqueue.ts).

export function subjectFor(job: MailJob): string {
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

export function htmlFor(job: MailJob): string {
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

/**
 * Send one mail job over SMTP and record the attempt in MailLog. Throws on
 * failure (after logging) so the caller can decide what to do:
 *   • the worker rethrows → BullMQ retries with backoff;
 *   • sendMailNow swallows it → the triggering request is never broken.
 */
export async function processMailJob(job: MailJob): Promise<void> {
  const subject = subjectFor(job);
  const html = htmlFor(job);

  try {
    await sendMail({ to: job.to, subject, html });
    await prisma.mailLog.create({
      data: { to: job.to, subject, template: job.type, status: "SENT" },
    });
  } catch (err) {
    await prisma.mailLog.create({
      data: {
        to: job.to,
        subject,
        template: job.type,
        status: "FAILED",
        error: err instanceof Error ? err.message : String(err),
      },
    });
    throw err;
  }
}

/**
 * Send a mail job INLINE, within the current request, and never throw. Used on
 * serverless (Vercel) where no worker drains the queue: the email is sent as
 * part of the request that triggers it. A failure is logged to MailLog (by
 * processMailJob) and to the console, but is swallowed so it can never break
 * checkout, login, password-reset, or admin-invite flows.
 *
 * Note: this awaits the SMTP round-trip, so the triggering request waits for
 * the send (typically well under a couple of seconds). Only immediate emails
 * use this path — delayed jobs (abandoned-cart, payment-expiry) still require
 * the worker and simply don't run on serverless.
 */
export async function sendMailNow(job: MailJob): Promise<void> {
  try {
    await processMailJob(job);
  } catch (err) {
    console.error(`[mail] inline send failed (${job.type} → ${job.to}):`, (err as Error).message);
  }
}
