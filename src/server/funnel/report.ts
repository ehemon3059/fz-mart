import type { FunnelEventType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

// Funnel reporting + retention. Kept free of next/headers and "server-only" so
// the standalone worker process (jobs/maintenance.worker.ts) can import the
// prune without pulling in request-scoped code. The event RECORDING path, which
// does need next/headers, lives in ./index.ts.

export interface FunnelStep {
  type: FunnelEventType;
  label: string;
  count: number;
  /** Conversion from the PREVIOUS step (%), null for the first step. */
  stepRate: number | null;
}

export interface FunnelReport {
  since: Date;
  steps: FunnelStep[];
  /** Of checkouts started, the % that did NOT become an order. */
  checkoutAbandonmentRate: number | null;
}

const STEP_LABELS: Record<FunnelEventType, string> = {
  PRODUCT_VIEW: "Product views",
  ADD_TO_CART: "Add to cart",
  CHECKOUT_START: "Checkouts started",
  ORDER_PLACED: "Orders placed",
};

const STEP_ORDER: FunnelEventType[] = [
  "PRODUCT_VIEW",
  "ADD_TO_CART",
  "CHECKOUT_START",
  "ORDER_PLACED",
];

/** 30-day (default) conversion funnel with step-to-step rates. */
export async function getFunnelReport(days = 30): Promise<FunnelReport> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const grouped = await prisma.funnelEvent.groupBy({
    by: ["type"],
    where: { createdAt: { gte: since } },
    _count: { _all: true },
  });
  const counts = new Map<FunnelEventType, number>();
  for (const row of grouped) counts.set(row.type, row._count._all);

  const steps: FunnelStep[] = STEP_ORDER.map((type, i) => {
    const count = counts.get(type) ?? 0;
    const prev = i === 0 ? null : counts.get(STEP_ORDER[i - 1]) ?? 0;
    const stepRate =
      prev == null ? null : prev > 0 ? Math.round((count / prev) * 1000) / 10 : 0;
    return { type, label: STEP_LABELS[type], count, stepRate };
  });

  // Checkout abandonment: of checkouts started, the share that didn't convert.
  // Derived from the SAME funnel events (CHECKOUT_START vs ORDER_PLACED) so it
  // doesn't double-count against the abandoned-cart table, which measures a
  // different population (identified carts that got a reminder).
  const checkoutStarts = counts.get("CHECKOUT_START") ?? 0;
  const orders = counts.get("ORDER_PLACED") ?? 0;
  const checkoutAbandonmentRate =
    checkoutStarts > 0
      ? Math.round(((checkoutStarts - orders) / checkoutStarts) * 1000) / 10
      : null;

  return { since, steps, checkoutAbandonmentRate };
}

/**
 * Delete funnel events older than the retention window. Called by the daily
 * maintenance job. Returns the number of rows removed.
 */
export async function pruneFunnelEvents(retentionDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
  const { count } = await prisma.funnelEvent.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  return count;
}
