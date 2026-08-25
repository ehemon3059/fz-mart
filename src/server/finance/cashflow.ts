import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";

// ─────────────────────────────────────────────────────────────
// Cash flow
// ─────────────────────────────────────────────────────────────
//
// "How much money came in and went out?" — deliberately NOT the same question
// as the monthly P&L, and the two are expected to disagree.
//
//   PROFIT is accrual: goods become a cost when they are SOLD, whenever the
//   supplier was actually paid.
//   CASH is timing: money counts on the day it moves, whether or not the goods
//   have sold — or even arrived.
//
// A month can be profitable and cash-negative (you paid for next season's stock
// in advance) or the reverse (you sold from stock paid for months ago). Both
// numbers are true; they answer different questions, and a shop that watches
// only profit can run out of money while doing well.
//
// WHAT COUNTS AS CASH IN
//   • Online payments, on the day they were confirmed.
//   • COD, on the day the order was DELIVERED — that is when the courier
//     collects. The COD portion is total − paidAmount, so an order paid part
//     online and part on delivery isn't counted twice.
//
// WHAT COUNTS AS CASH OUT
//   • Supplier payments, on their paidOn date.
//   • Manual expenses, on incurredOn.
//   • Advertising, on spentOn.
//   • Courier charges for orders delivered in the period.
//
// ONE HONEST LIMITATION, stated rather than hidden: couriers here typically
// remit COD net of their own fee, so the two courier figures above often move
// as a single settlement rather than as separate cash events. The NET is right
// either way; the gross in/out are slightly overstated on both sides.

const TTL_SECONDS = 300;

export interface CashFlowLine {
  label: string;
  amount: number;
  /** A short "why this figure is what it is", shown under the label. */
  note?: string;
}

export interface CashFlowReport {
  inflows: CashFlowLine[];
  outflows: CashFlowLine[];
  totalIn: number;
  totalOut: number;
  /** totalIn − totalOut. Negative means the month consumed cash. */
  net: number;
}

/**
 * Cash movement over a date range.
 *
 * `start`/`end` bound the date the money moved, not the date an order was
 * placed — which is the whole distinction this report exists to draw.
 */
export async function getCashFlowReport(start: Date, end: Date): Promise<CashFlowReport> {
  const key = `report:cashflow:${start.toISOString().slice(0, 10)}:${end
    .toISOString()
    .slice(0, 10)}`;

  return getOrSetCache(key, TTL_SECONDS, async () => {
    // Orders delivered in the window — the moment COD cash is collected.
    const deliveredLogs = await prisma.orderStatusLog.findMany({
      where: { toStatus: "DELIVERED", createdAt: { gte: start, lte: end } },
      select: { orderId: true },
      distinct: ["orderId"],
    });
    const deliveredIds = deliveredLogs.map((l) => l.orderId);

    const [deliveredOrders, onlinePayments, supplierPayments, expenses, adSpend] =
      await Promise.all([
        deliveredIds.length
          ? prisma.order.findMany({
              where: { id: { in: deliveredIds } },
              select: { total: true, paidAmount: true, shippingCost: true },
            })
          : Promise.resolve([]),
        // Only payments that actually succeeded moved money.
        prisma.payment.aggregate({
          where: { status: "SUCCESS", updatedAt: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.supplierPayment.aggregate({
          where: { paidOn: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: { incurredOn: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        prisma.adSpend.aggregate({
          where: { spentOn: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);

    // COD collected = what the customer still owed on delivery. Clamped at zero
    // so an over-recorded prepayment can't subtract from the day's takings.
    const codCollected = deliveredOrders.reduce(
      (sum, o) => sum + Math.max(0, o.total - o.paidAmount),
      0,
    );
    const courierCost = deliveredOrders.reduce((sum, o) => sum + o.shippingCost, 0);

    const onlineIn = onlinePayments._sum?.amount ?? 0;
    const suppliersOut = supplierPayments._sum?.amount ?? 0;
    const expensesOut = expenses._sum?.amount ?? 0;
    const adsOut = adSpend._sum?.amount ?? 0;

    const inflows: CashFlowLine[] = [
      {
        label: "Cash on delivery collected",
        amount: codCollected,
        note: `${deliveredOrders.length} order(s) delivered`,
      },
      { label: "Online payments received", amount: onlineIn },
    ];

    const outflows: CashFlowLine[] = [
      { label: "Paid to suppliers", amount: suppliersOut, note: "Recorded against purchase orders" },
      { label: "Courier charges", amount: courierCost, note: "On orders delivered in this period" },
      { label: "Advertising", amount: adsOut },
      { label: "Other expenses", amount: expensesOut },
    ];

    const totalIn = inflows.reduce((s, l) => s + l.amount, 0);
    const totalOut = outflows.reduce((s, l) => s + l.amount, 0);

    return { inflows, outflows, totalIn, totalOut, net: totalIn - totalOut };
  });
}
