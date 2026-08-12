import { test, expect } from "@playwright/test";
import { Queue } from "bullmq";
import { prisma, E2E_PRODUCTS, uniquePhone } from "./helpers/db";
import {
  addProductToCart,
  fillCheckoutForm,
  submitCheckout,
  expectOrderConfirmed,
} from "./helpers/checkout";

// Background-job coverage: a COD checkout with an email address must produce
// an order-confirmation mail job, and the worker must drain it.
//
// IMPORTANT — two delivery modes, and the spec must not pass vacuously:
//   MAIL_DELIVERY=queue  → job goes to the BullMQ "mail" queue; a running
//                          worker (`npm run worker`) drains it and writes MailLog.
//   MAIL_DELIVERY=inline → sent inside the request; the queue stays empty and
//                          MailLog is written synchronously. (This is the
//                          default, and what .env currently sets.)
// The queue-drain assertions are skipped unless MAIL_DELIVERY=queue, because
// asserting "queue empties" under inline delivery would pass without ever
// exercising the worker.

const MAIL_DELIVERY = (process.env.MAIL_DELIVERY ?? "inline").toLowerCase();
const QUEUE_MODE = MAIL_DELIVERY === "queue";

test.afterAll(async () => {
  await prisma.$disconnect();
});

/** Places a real COD order carrying an email address, returns orderNo + email. */
async function placeOrderWithEmail(page: import("@playwright/test").Page) {
  const email = `e2e-${Date.now()}@example.com`;
  await addProductToCart(page, E2E_PRODUCTS.checkout);
  await page.goto("/checkout");
  await fillCheckoutForm(page, { name: "E2E Worker Flow", phone: uniquePhone() });
  await page.getByPlaceholder("Email (optional)").fill(email);
  expect(await submitCheckout(page)).toBe("success");
  const orderNo = await expectOrderConfirmed(page);
  return { orderNo, email };
}

test("COD checkout with an email produces an order-confirmation mail record", async ({ page }) => {
  const { orderNo, email } = await placeOrderWithEmail(page);

  const order = await prisma.order.findUniqueOrThrow({ where: { orderNo } });
  expect(order.status).toBe("PENDING");

  // MailLog is written by processMailJob in BOTH modes — inline within the
  // request, or by the worker after it drains the queue. Polling covers the
  // async case without making the inline case flaky.
  await expect
    .poll(() => prisma.mailLog.count({ where: { to: email } }), { timeout: 30_000 })
    .toBeGreaterThan(0);

  const log = await prisma.mailLog.findFirstOrThrow({
    where: { to: email },
    orderBy: { id: "desc" },
  });
  expect(log.template).toContain("order");
  // SMTP is not configured in the test env, so a FAILED status is expected and
  // fine — what matters is that the job ran and was recorded, not that a real
  // message left the building.
  expect(["SENT", "FAILED", "PENDING"]).toContain(log.status);
});

test("the BullMQ mail queue drains after checkout", async ({ page }) => {
  test.skip(
    !QUEUE_MODE,
    "MAIL_DELIVERY is not 'queue' — mail is sent inline, so nothing reaches the queue. " +
      "Set MAIL_DELIVERY=queue in .env.test and run `npm run worker` to exercise this.",
  );
  const redisUrl = process.env.REDIS_URL;
  test.skip(!redisUrl, "REDIS_URL is not set — no queue to inspect.");

  const queue = new Queue("mail", {
    connection: { url: redisUrl!, maxRetriesPerRequest: null },
  });

  try {
    await placeOrderWithEmail(page);

    // The job must appear...
    await expect
      .poll(async () => (await queue.getJobCounts("waiting", "active", "completed")).completed, {
        timeout: 30_000,
        message:
          "No mail job completed. Is the worker running? Start it with `npm run worker`.",
      })
      .toBeGreaterThan(0);

    // ...and the backlog must clear, proving the worker consumed it rather
    // than the job merely being enqueued.
    await expect
      .poll(
        async () => {
          const counts = await queue.getJobCounts("waiting", "active", "delayed");
          return counts.waiting + counts.active + counts.delayed;
        },
        { timeout: 30_000 },
      )
      .toBe(0);
  } finally {
    await queue.close();
  }
});
