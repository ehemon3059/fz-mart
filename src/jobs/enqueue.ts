import { getQueue, isQueueEnabled, QUEUE_NAMES } from "@/lib/queue";
import { sendMailNow } from "./mail-send";
import type { CartJob, MailJob, PaymentJob, SmsJob } from "./types";

// Producer-side enqueue helpers. Called from server/orders/* — never
// awaited as part of the user-facing response; the order save completes
// instantly and the worker process (separate from Next.js) sends the
// notification asynchronously.
//
// Serverless (Vercel) has no worker process, and Redis may be unconfigured or
// unreachable. Enqueueing is therefore BEST-EFFORT: every helper swallows its
// errors so checkout, payments, OTP and other flows never break because a
// background notification couldn't be queued. Jobs that fail to enqueue simply
// don't run — acceptable for a demo deployment.

// Mail delivery mode:
//   • "queue"  → add to the BullMQ mail queue for a worker to send (VPS).
//   • "inline" → send synchronously inside this request (serverless/Vercel,
//                where no worker drains the queue).
// Default is "inline" so a serverless deploy sends mail with no extra config;
// set MAIL_DELIVERY=queue when running the standalone worker (npm run worker).
const MAIL_DELIVERY = (process.env.MAIL_DELIVERY ?? "inline").toLowerCase();

async function safeEnqueue(label: string, fn: () => Promise<unknown>): Promise<void> {
  if (!isQueueEnabled()) return;
  try {
    await fn();
  } catch (err) {
    console.error(`[enqueue] ${label} failed (job dropped):`, (err as Error).message);
  }
}

export async function enqueueMailJob(job: MailJob): Promise<void> {
  // Inline delivery (default) sends within the request — the only mode that
  // works on serverless. sendMailNow never throws, so callers stay unaffected.
  if (MAIL_DELIVERY !== "queue") {
    await sendMailNow(job);
    return;
  }
  await safeEnqueue(`mail:${job.type}`, () => getQueue(QUEUE_NAMES.mail).add(job.type, job));
}

export async function enqueueSmsJob(job: SmsJob): Promise<void> {
  await safeEnqueue(`sms:${job.type}`, () => getQueue(QUEUE_NAMES.sms).add(job.type, job));
}

/** Arm a delayed payment-expiry check; delayMs from now. */
export async function enqueuePaymentJob(job: PaymentJob, delayMs: number): Promise<void> {
  await safeEnqueue(`payments:${job.type}`, () =>
    getQueue(QUEUE_NAMES.payments).add(job.type, job, { delay: delayMs }),
  );
}

/** Arm a delayed abandoned-cart reminder; delayMs from now. */
export async function enqueueCartJob(job: CartJob, delayMs: number): Promise<void> {
  await safeEnqueue(`carts:${job.type}`, () =>
    getQueue(QUEUE_NAMES.carts).add(job.type, job, { delay: delayMs }),
  );
}
