// Standalone worker process entrypoint. Run with `npm run worker` (dev) or
// as a supervised process (PM2/systemd) in production — see deployment
// notes in the blueprint. This does NOT run inside Next.js; it's a second
// process against the same Redis + MySQL, which is why this project targets
// a VPS rather than serverless (serverless has no persistent worker).
import { createMailWorker } from "./mail.worker";
import { createSmsWorker } from "./sms.worker";

const redisUrl = process.env.REDIS_URL;
if (!redisUrl) {
  throw new Error("REDIS_URL is not set.");
}

const mailWorker = createMailWorker({ url: redisUrl });
const smsWorker = createSmsWorker({ url: redisUrl });

mailWorker.on("completed", (job) => console.log(`[mail] sent: ${job.id} (${job.data.type})`));
mailWorker.on("failed", (job, err) =>
  console.error(`[mail] failed: ${job?.id} (${job?.data.type}) -`, err.message),
);

smsWorker.on("completed", (job) => console.log(`[sms] sent: ${job.id} (${job.data.type})`));
smsWorker.on("failed", (job, err) =>
  console.error(`[sms] failed: ${job?.id} (${job?.data.type}) -`, err.message),
);

console.log("Worker process started — listening on queues: mail, sms");

async function shutdown() {
  console.log("Shutting down worker...");
  await Promise.all([mailWorker.close(), smsWorker.close()]);
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
