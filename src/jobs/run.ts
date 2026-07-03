// Standalone worker process entrypoint. Run with `npm run worker` (dev) or
// as a supervised process (PM2/systemd) in production — see deployment
// notes in the blueprint. This does NOT run inside Next.js; it's a second
// process against the same Redis + MySQL, which is why this project targets
// a VPS rather than serverless (serverless has no persistent worker).
import * as Sentry from "@sentry/node";
import { createMailWorker } from "./mail.worker";
import { createSmsWorker } from "./sms.worker";
import { createPaymentsWorker } from "./payments.worker";
import { createCartsWorker } from "./carts.worker";
import { createMaintenanceWorker, scheduleMaintenance } from "./maintenance.worker";

// Opt-in error reporting for the worker process (separate from the Next app,
// so it needs its own init). No-op unless SENTRY_DSN is set.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  });
}

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is not set.");
}

const mailWorker = createMailWorker({ url: redisUrl });
const smsWorker = createSmsWorker({ url: redisUrl });
const paymentsWorker = createPaymentsWorker({ url: redisUrl });
const cartsWorker = createCartsWorker({ url: redisUrl });
const maintenanceWorker = createMaintenanceWorker({ url: redisUrl });
// Register the daily repeatable schedule (idempotent).
scheduleMaintenance({ url: redisUrl }).catch((err) =>
  console.error("[maintenance] failed to schedule digest:", err),
);

mailWorker.on("completed", (job) => console.log(`[mail] sent: ${job.id} (${job.data.type})`));
mailWorker.on("failed", (job, err) =>
  console.error(`[mail] failed: ${job?.id} (${job?.data.type}) -`, err.message),
);

smsWorker.on("completed", (job) => console.log(`[sms] sent: ${job.id} (${job.data.type})`));
smsWorker.on("failed", (job, err) =>
  console.error(`[sms] failed: ${job?.id} (${job?.data.type}) -`, err.message),
);

paymentsWorker.on("completed", (job) =>
  console.log(`[payments] processed: ${job.id} (${job.data.type})`),
);
paymentsWorker.on("failed", (job, err) =>
  console.error(`[payments] failed: ${job?.id} (${job?.data.type}) -`, err.message),
);

// Report worker job failures to Sentry (no-op when unconfigured).
for (const worker of [mailWorker, smsWorker, paymentsWorker, cartsWorker, maintenanceWorker]) {
  worker.on("failed", (job, err) => {
    if (process.env.SENTRY_DSN) {
      Sentry.captureException(err, { extra: { jobId: job?.id, jobName: job?.name } });
    }
  });
}

cartsWorker.on("completed", (job) =>
  console.log(`[carts] processed: ${job.id} (${job.data.type})`),
);
cartsWorker.on("failed", (job, err) =>
  console.error(`[carts] failed: ${job?.id} (${job?.data.type}) -`, err.message),
);

maintenanceWorker.on("failed", (job, err) =>
  console.error(`[maintenance] failed: ${job?.id} (${job?.data.type}) -`, err.message),
);

console.log("Worker process started — listening on queues: mail, sms, payments, carts, maintenance");

async function shutdown() {
  console.log("Shutting down worker...");
  await Promise.all([
    mailWorker.close(),
    smsWorker.close(),
    paymentsWorker.close(),
    cartsWorker.close(),
    maintenanceWorker.close(),
  ]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
