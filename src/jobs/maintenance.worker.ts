import { Worker, Queue, type Job } from "bullmq";
import { QUEUE_NAMES } from "@/lib/queue";
import { sendLowStockDigest } from "@/server/inventory/digest";
import { pruneFunnelEvents } from "@/server/funnel/report";
import type { MaintenanceJob } from "./types";

// Repeatable daily maintenance: the low-stock digest, plus pruning funnel
// events past their 90-day retention. The repeatable schedule is (re)registered
// at worker startup — BullMQ dedupes on the repeat key, so restarts don't stack
// duplicates.
export function createMaintenanceWorker(connection: { url: string }) {
  const worker = new Worker<MaintenanceJob>(
    QUEUE_NAMES.maintenance,
    async (job: Job<MaintenanceJob>) => {
      if (job.data.type === "low-stock-digest") {
        // Daily digest job also carries the funnel-event retention prune —
        // one daily tick, both housekeeping tasks. The prune is best-effort:
        // a failure must not stop the digest from being reported as done.
        await sendLowStockDigest();
        const pruned = await pruneFunnelEvents(90).catch((err) => {
          console.error("[maintenance] funnel prune failed:", err);
          return 0;
        });
        if (pruned > 0) console.log(`[maintenance] pruned ${pruned} old funnel events`);
      }
    },
    { connection: { url: connection.url, maxRetriesPerRequest: null } },
  );
  return worker;
}

/** Register the daily 08:00 low-stock digest schedule (idempotent). */
export async function scheduleMaintenance(connection: { url: string }): Promise<void> {
  const queue = new Queue(QUEUE_NAMES.maintenance, {
    connection: { url: connection.url, maxRetriesPerRequest: null },
  });
  await queue.add(
    "low-stock-digest",
    { type: "low-stock-digest" },
    { repeat: { pattern: "0 8 * * *" }, jobId: "low-stock-digest-daily" },
  );
  await queue.close();
}
