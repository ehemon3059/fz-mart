import { Worker, type Job } from "bullmq";
import { prisma } from "@/lib/prisma";
import { QUEUE_NAMES } from "@/lib/queue";
import { getConversionConfig } from "@/server/settings/conversion";
import { recoveryLink } from "@/server/cart";
import { primeSiteUrl } from "@/server/settings/site";
import { enqueueSmsJob, enqueueMailJob } from "@/jobs/enqueue";
import type { CartJob } from "./types";

// Sends the abandoned-cart reminder when the delayed job fires — but only if
// the cart is still genuinely abandoned: not ordered, not already reminded,
// and unchanged since the job was scheduled (cartVersion match). One SMS
// and/or email per cart.
export function createCartsWorker(connection: { url: string }) {
  return new Worker<CartJob>(
    QUEUE_NAMES.carts,
    async (job: Job<CartJob>) => {
      if (job.data.type !== "abandoned-cart") return;

      const config = await getConversionConfig();
      if (!config.abandonedCartEnabled) return;

      const cart = await prisma.cartSession.findUnique({ where: { id: job.data.cartId } });
      if (!cart) return;
      if (cart.orderedAt || cart.reminderSentAt) return; // already handled
      // The customer touched the cart after this job was scheduled — a newer
      // job will cover it; skip to avoid double-sending.
      if (cart.updatedAt.toISOString() !== job.data.cartVersion) return;

      await primeSiteUrl(); // recovery link must use the admin-configured domain
      const link = recoveryLink(cart.recoveryToken);
      const message = config.abandonedCartMessage.replace("{link}", link);

      if (cart.phone) {
        await enqueueSmsJob({ type: "abandoned-cart", to: cart.phone, message }).catch((e) =>
          console.error("[cart] failed to enqueue recovery SMS:", e),
        );
      }
      if (cart.email) {
        await enqueueMailJob({
          type: "abandoned-cart",
          to: cart.email,
          recoveryUrl: link,
        }).catch((e) => console.error("[cart] failed to enqueue recovery mail:", e));
      }

      await prisma.cartSession.update({
        where: { id: cart.id },
        data: { reminderSentAt: new Date() },
      });
    },
    { connection: { url: connection.url, maxRetriesPerRequest: null } },
  );
}
