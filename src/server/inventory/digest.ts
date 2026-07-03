import { prisma } from "@/lib/prisma";
import { getLowStockProducts } from "./index";
import { getInventoryConfig } from "@/server/settings/inventory";
import { enqueueMailJob } from "@/jobs/enqueue";

// Builds and queues the daily low-stock digest to every active OWNER/MANAGER
// admin with an email. No-op when the digest is disabled or nothing is low.
export async function sendLowStockDigest(): Promise<void> {
  const config = await getInventoryConfig();
  if (!config.digestEnabled) return;

  const low = await getLowStockProducts();
  if (low.length === 0) return;

  const recipients = await prisma.adminUser.findMany({
    where: { isActive: true, role: { in: ["OWNER", "MANAGER"] }, email: { not: null } },
    select: { email: true },
  });

  const products = low.map((p) => ({ name: p.name, stock: p.stock, threshold: p.lowStockThreshold }));
  for (const r of recipients) {
    if (!r.email) continue;
    await enqueueMailJob({ type: "low-stock-digest", to: r.email, products }).catch((e) =>
      console.error("[inventory] digest enqueue failed:", e),
    );
  }
}
