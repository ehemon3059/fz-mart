import { getQueue, QUEUE_NAMES } from "@/lib/queue";
import type { CartJob, MailJob, PaymentJob, SmsJob } from "./types";

// Producer-side enqueue helpers. Called from server/orders/* — never
// awaited as part of the user-facing response; the order save completes
// instantly and the worker process (separate from Next.js) sends the
// notification asynchronously.

export async function enqueueMailJob(job: MailJob): Promise<void> {
  await getQueue(QUEUE_NAMES.mail).add(job.type, job);
}

export async function enqueueSmsJob(job: SmsJob): Promise<void> {
  await getQueue(QUEUE_NAMES.sms).add(job.type, job);
}

/** Arm a delayed payment-expiry check; delayMs from now. */
export async function enqueuePaymentJob(job: PaymentJob, delayMs: number): Promise<void> {
  await getQueue(QUEUE_NAMES.payments).add(job.type, job, { delay: delayMs });
}

/** Arm a delayed abandoned-cart reminder; delayMs from now. */
export async function enqueueCartJob(job: CartJob, delayMs: number): Promise<void> {
  await getQueue(QUEUE_NAMES.carts).add(job.type, job, { delay: delayMs });
}
