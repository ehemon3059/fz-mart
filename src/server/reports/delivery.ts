import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";

// Delivery-performance audit: per courier, per month — how FAST (days SHIPPED→
// DELIVERED, avg + p90) and how RELIABLY (failed-delivery rate) each courier
// delivers, plus the average shipping cost the shop pays per delivered order.
//
// No new tracking: everything is derived from OrderStatusLog (which timestamps
// every transition), CourierShipment.courierName, and Order.shippingCost.
//
// Cache: 60s TTL, same short window the other reports use (stock.ts / orders.ts)
// — heavy aggregation the admin tolerates being slightly stale.
//
// p90 note: MariaDB 10.4's percentile support is unreliable across versions, so
// we fetch per-order delivery durations in SQL and compute avg + p90 in JS. The
// row set is one row per delivered-with-courier order in the window — small.

const TTL_SECONDS = 60;

export interface CourierDeliveryRow {
  /** "YYYY-MM" of the delivered/terminal event. */
  month: string;
  courier: string;
  /** Delivered orders for this courier in this month. */
  delivered: number;
  /** Delivered + failed (returned/cancelled after shipping) — the shipped base. */
  shipped: number;
  /** returned/cancelled after shipping. */
  failed: number;
  /** failed / shipped as a percentage (0..100, 1 dp). */
  failureRate: number;
  /** Mean days SHIPPED→DELIVERED across delivered orders (1 dp, null if none). */
  avgDaysToDeliver: number | null;
  /** 90th-percentile days SHIPPED→DELIVERED (1 dp, null if none). */
  p90DaysToDeliver: number | null;
  /** Mean Order.shippingCost per delivered order, paisa (null if none). */
  avgShippingCost: number | null;
}

interface DeliveredDurationRow {
  month: string;
  courier: string;
  days: number;
  shippingCost: number;
}

interface TerminalCountRow {
  month: string;
  courier: string;
  delivered: bigint;
  failed: bigint;
}

/**
 * Delivery performance for every courier, bucketed by the month of the terminal
 * event (delivery date for delivered orders; return/cancel date for failures).
 * Bounded to [start, end] on that terminal event so the numbers reconcile with
 * the Orders report's delivered/returned counts for the same window.
 */
export async function getDeliveryReport(
  start: Date,
  end: Date,
): Promise<CourierDeliveryRow[]> {
  const key = `report:delivery:${start.toISOString()}:${end.toISOString()}`;

  return getOrSetCache(key, TTL_SECONDS, async () => {
    // 1. Per delivered-with-courier order: courier, delivery month, days from
    //    SHIPPED (earliest SHIPPED log, else consignment creation) to DELIVERED,
    //    and the shop's shipping cost. One row per delivered order.
    const durationRows = await prisma.$queryRaw<DeliveredDurationRow[]>`
      SELECT
        DATE_FORMAT(del.deliveredAt, '%Y-%m')                        AS month,
        cs.courierName                                               AS courier,
        GREATEST(
          TIMESTAMPDIFF(HOUR, COALESCE(shp.shippedAt, cs.createdAt), del.deliveredAt),
          0
        ) / 24                                                       AS days,
        o.shippingCost                                               AS shippingCost
      FROM CourierShipment cs
      JOIN \`Order\` o ON o.id = cs.orderId AND o.status = 'DELIVERED'
      JOIN (
        SELECT orderId, MIN(createdAt) AS deliveredAt
        FROM OrderStatusLog
        WHERE toStatus = 'DELIVERED'
        GROUP BY orderId
      ) del ON del.orderId = o.id
      LEFT JOIN (
        SELECT orderId, MIN(createdAt) AS shippedAt
        FROM OrderStatusLog
        WHERE toStatus = 'SHIPPED'
        GROUP BY orderId
      ) shp ON shp.orderId = o.id
      WHERE del.deliveredAt >= ${start} AND del.deliveredAt <= ${end}
    `;

    // 2. Per courier per month: delivered vs failed (returned/cancelled AFTER
    //    shipping). A shipment exists only if the order was handed to a courier,
    //    so any RETURNED/CANCELLED with a CourierShipment was shipped-then-failed.
    //    Bucketed by the terminal event's month so it aligns with (1).
    const countRows = await prisma.$queryRaw<TerminalCountRow[]>`
      SELECT
        DATE_FORMAT(term.terminalAt, '%Y-%m') AS month,
        cs.courierName                        AS courier,
        SUM(CASE WHEN o.status = 'DELIVERED' THEN 1 ELSE 0 END)                 AS delivered,
        SUM(CASE WHEN o.status IN ('RETURNED', 'CANCELLED') THEN 1 ELSE 0 END)  AS failed
      FROM CourierShipment cs
      JOIN \`Order\` o ON o.id = cs.orderId
      JOIN (
        SELECT orderId, MIN(createdAt) AS terminalAt
        FROM OrderStatusLog
        WHERE toStatus IN ('DELIVERED', 'RETURNED', 'CANCELLED')
        GROUP BY orderId
      ) term ON term.orderId = o.id
      WHERE o.status IN ('DELIVERED', 'RETURNED', 'CANCELLED')
        AND term.terminalAt >= ${start} AND term.terminalAt <= ${end}
      GROUP BY month, cs.courierName
    `;

    // Group durations by (month, courier) to compute avg + p90 + avg cost in JS.
    const durationsByKey = new Map<string, DeliveredDurationRow[]>();
    for (const r of durationRows) {
      const k = `${r.month}||${r.courier}`;
      const list = durationsByKey.get(k) ?? [];
      list.push(r);
      durationsByKey.set(k, list);
    }

    const rows: CourierDeliveryRow[] = countRows.map((c) => {
      const delivered = Number(c.delivered);
      const failed = Number(c.failed);
      const shipped = delivered + failed;
      const durations = durationsByKey.get(`${c.month}||${c.courier}`) ?? [];
      const days = durations.map((d) => Number(d.days));

      return {
        month: c.month,
        courier: c.courier,
        delivered,
        shipped,
        failed,
        failureRate: shipped > 0 ? round1((failed / shipped) * 100) : 0,
        avgDaysToDeliver: days.length ? round1(mean(days)) : null,
        p90DaysToDeliver: days.length ? round1(percentile(days, 90)) : null,
        avgShippingCost: durations.length
          ? Math.round(mean(durations.map((d) => Number(d.shippingCost))))
          : null,
      };
    });

    // Newest month first, then courier alphabetically.
    rows.sort((a, b) => (a.month === b.month ? a.courier.localeCompare(b.courier) : a.month < b.month ? 1 : -1));
    return rows;
  });
}

function mean(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Linear-interpolated percentile (p in 0..100) over an unsorted numeric array. */
function percentile(xs: number[], p: number): number {
  if (xs.length === 1) return xs[0];
  const sorted = [...xs].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (rank - lo);
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}
