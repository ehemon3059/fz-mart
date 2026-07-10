import type { AdChannel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";
import { monthRange } from "./report";
import {
  classifyOrderChannel,
  AD_CHANNELS,
  ORGANIC_CHANNEL,
  type ReportChannel,
} from "@/config/ad-channel";

// ─────────────────────────────────────────────────────────────
// Marketing report — CAC & ROAS by channel, by month
// ─────────────────────────────────────────────────────────────
//
// Ties manually-entered ad spend to ATTRIBUTED revenue so the owner sees return
// on ad spend and customer-acquisition cost, not just COGS. Every figure is
// paisa (see lib/money.ts); the UI converts at the edge — same convention as
// the P&L in report.ts.
//
// Revenue is recognised the SAME way as the P&L: an order counts in the month it
// was DELIVERED (from the OrderStatusLog audit trail), and its attributed net
// revenue is subtotal − couponDiscount (merchandise value the customer paid,
// excluding pass-through shipping). Returns are netted out via RETURNED logs in
// the same month, mirroring the P&L so the two reports reconcile.
//
// Attribution: each delivered order is classified to ONE channel by
// classifyOrderChannel (fb click id → FACEBOOK, else utm_source, else ORGANIC).
//
//   ROAS = attributed net revenue ÷ spend            (null when spend = 0)
//   CAC  = spend ÷ new-customer orders               (null when 0 new custs)
//     new customer = the order is that phone's FIRST-EVER delivered order.

export interface ChannelMarketing {
  channel: ReportChannel;
  /** Paisa. Manually-entered spend for this channel this month (0 for organic). */
  spend: number;
  /** Paisa. subtotal − coupons on delivered orders, minus returns, attributed here. */
  netRevenue: number;
  /** Delivered orders attributed to this channel this month. */
  orders: number;
  /** Of those, how many were the customer's first-ever delivered order. */
  newCustomerOrders: number;
  /** revenue ÷ spend, or null when there's no spend to divide by. */
  roas: number | null;
  /** spend ÷ newCustomerOrders (paisa), or null when no new customers. */
  cac: number | null;
}

export interface MarketingReport {
  channels: ChannelMarketing[];
  totals: {
    spend: number;
    netRevenue: number;
    orders: number;
    newCustomerOrders: number;
    /** Blended across all channels that have spend. */
    roas: number | null;
    cac: number | null;
  };
}

const TTL_SECONDS = 60;

export async function getMonthlyMarketingReport(
  year: number,
  month: number,
): Promise<MarketingReport> {
  const { start, end } = monthRange(year, month);
  const key = `report:marketing:${year}-${month}`;

  return getOrSetCache(key, TTL_SECONDS, async () => {
    // 1. Orders DELIVERED and RETURNED within the month (same basis as the P&L).
    const [deliveredLogs, returnedLogs] = await Promise.all([
      prisma.orderStatusLog.findMany({
        where: { toStatus: "DELIVERED", createdAt: { gte: start, lte: end } },
        select: { orderId: true },
        distinct: ["orderId"],
      }),
      prisma.orderStatusLog.findMany({
        where: { toStatus: "RETURNED", createdAt: { gte: start, lte: end } },
        select: { orderId: true },
        distinct: ["orderId"],
      }),
    ]);
    const deliveredIds = deliveredLogs.map((l) => l.orderId);
    const returnedIds = new Set(returnedLogs.map((l) => l.orderId));

    // 2. Load those orders with the fields needed to classify + value them.
    const orders = deliveredIds.length
      ? await prisma.order.findMany({
          where: { id: { in: deliveredIds } },
          select: {
            id: true,
            customerPhone: true,
            subtotal: true,
            couponDiscount: true,
            fbp: true,
            fbc: true,
            utmSource: true,
            utmMedium: true,
            utmCampaign: true,
          },
        })
      : [];

    // 3. New-customer test: an order is a new-customer acquisition when it is
    //    that phone's FIRST-EVER delivered order. Find each phone's earliest
    //    DELIVERED log time and compare to this order's delivery within the
    //    month; if this order is the earliest delivered one for the phone, it's
    //    an acquisition. We approximate "first delivered order" as "no earlier
    //    delivered order exists for this phone" to keep it a single query.
    const phones = [...new Set(orders.map((o) => o.customerPhone))];
    const priorDeliveredByPhone = await firstDeliveredOrderIdByPhone(phones);

    // 4. Spend by channel for the month.
    const spendRows = await prisma.adSpend.groupBy({
      by: ["channel"],
      where: { spentOn: { gte: start, lte: end } },
      _sum: { amount: true },
    });
    const spendByChannel = new Map<AdChannel, number>();
    for (const r of spendRows) spendByChannel.set(r.channel, r._sum.amount ?? 0);

    // 5. Accumulate per channel.
    const acc = new Map<
      ReportChannel,
      { netRevenue: number; orders: number; newCustomerOrders: number }
    >();
    const bump = (ch: ReportChannel) =>
      acc.get(ch) ?? { netRevenue: 0, orders: 0, newCustomerOrders: 0 };

    for (const order of orders) {
      // A delivered order that was ALSO returned this month contributes zero net
      // revenue (delivered value − returned value cancel), and isn't a kept
      // acquisition — skip it entirely so ROAS isn't inflated by churned sales.
      if (returnedIds.has(order.id)) continue;

      const channel = classifyOrderChannel(order);
      const bucket = bump(channel);
      bucket.netRevenue += order.subtotal - order.couponDiscount;
      bucket.orders += 1;
      if (priorDeliveredByPhone.get(order.customerPhone) === order.id) {
        bucket.newCustomerOrders += 1;
      }
      acc.set(channel, bucket);
    }

    // 6. Build rows for every channel that has spend OR attributed orders.
    const allChannels: ReportChannel[] = [...AD_CHANNELS, ORGANIC_CHANNEL];
    const channels: ChannelMarketing[] = [];
    for (const channel of allChannels) {
      const data = acc.get(channel) ?? { netRevenue: 0, orders: 0, newCustomerOrders: 0 };
      const spend = channel === ORGANIC_CHANNEL ? 0 : spendByChannel.get(channel) ?? 0;
      if (spend === 0 && data.orders === 0) continue; // nothing to show

      channels.push({
        channel,
        spend,
        netRevenue: data.netRevenue,
        orders: data.orders,
        newCustomerOrders: data.newCustomerOrders,
        roas: spend > 0 ? data.netRevenue / spend : null,
        cac: data.newCustomerOrders > 0 ? Math.round(spend / data.newCustomerOrders) : null,
      });
    }

    const totalSpend = channels.reduce((s, c) => s + c.spend, 0);
    const totalRevenue = channels.reduce((s, c) => s + c.netRevenue, 0);
    const totalOrders = channels.reduce((s, c) => s + c.orders, 0);
    const totalNewCust = channels.reduce((s, c) => s + c.newCustomerOrders, 0);
    // Blended ROAS/CAC count ONLY paid revenue/acquisitions against paid spend,
    // so organic revenue doesn't flatter the return figure.
    const paidRevenue = channels
      .filter((c) => c.channel !== ORGANIC_CHANNEL)
      .reduce((s, c) => s + c.netRevenue, 0);
    const paidNewCust = channels
      .filter((c) => c.channel !== ORGANIC_CHANNEL)
      .reduce((s, c) => s + c.newCustomerOrders, 0);

    return {
      channels,
      totals: {
        spend: totalSpend,
        netRevenue: totalRevenue,
        orders: totalOrders,
        newCustomerOrders: totalNewCust,
        roas: totalSpend > 0 ? paidRevenue / totalSpend : null,
        cac: paidNewCust > 0 ? Math.round(totalSpend / paidNewCust) : null,
      },
    };
  });
}

/**
 * For each phone, the order id of its EARLIEST-delivered order (by the first
 * DELIVERED status-log timestamp). An order counts as a new-customer
 * acquisition iff it equals this id. Computed across ALL history (not just the
 * month), so a repeat buyer whose first purchase was months ago is correctly
 * NOT counted as newly acquired this month.
 */
async function firstDeliveredOrderIdByPhone(
  phones: string[],
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (phones.length === 0) return result;

  // All delivered logs for orders belonging to these phones, oldest first; the
  // first log we see per phone is that phone's acquisition order.
  const logs = await prisma.orderStatusLog.findMany({
    where: { toStatus: "DELIVERED", order: { customerPhone: { in: phones } } },
    select: { orderId: true, createdAt: true, order: { select: { customerPhone: true } } },
    orderBy: { createdAt: "asc" },
  });

  for (const log of logs) {
    const phone = log.order.customerPhone;
    if (!result.has(phone)) result.set(phone, log.orderId);
  }
  return result;
}
