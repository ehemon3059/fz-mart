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
      select: { orderId: true, createdAt: true },
      distinct: ["orderId"],
    });
    const deliveredIds = deliveredLogs.map((l) => l.orderId);
    const deliveredAt = new Map(deliveredLogs.map((l) => [l.orderId, l.createdAt]));

    const [deliveredOrders, onlinePayments, refundedPayments, supplierPayments, expenses, adSpend] =
      await Promise.all([
        deliveredIds.length
          ? prisma.order.findMany({
              where: { id: { in: deliveredIds } },
              select: {
                id: true,
                total: true,
                shippingCost: true,
                // Dated payments rather than the order's mutable paidAmount —
                // see the note on codCollected below.
                payments: {
                  where: { paidAt: { not: null } },
                  select: { amount: true, paidAt: true },
                },
              },
            })
          : Promise.resolve([]),
        // Money that came IN, dated by paidAt — when the payment actually
        // succeeded. A payment later refunded still came in on that day, so
        // REFUNDED rows count here too and the refund is subtracted as an
        // outflow in ITS OWN period below. Excluding them instead would
        // rewrite a closed period: last month's takings shrinking because of
        // something done today.
        prisma.payment.aggregate({
          where: {
            status: { in: ["SUCCESS", "REFUNDED"] },
            paidAt: { gte: start, lte: end },
          },
          _sum: { amount: true },
        }),
        // Money that went back OUT, dated by refundedAt rather than by the
        // row's last-modified stamp, so it lands in the period the refund was
        // actually made.
        prisma.payment.aggregate({
          where: { refundedAt: { gte: start, lte: end } },
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

    // COD collected = what the customer still owed ON THE DAY OF DELIVERY.
    //
    // Deliberately NOT `total - paidAmount`: paidAmount is a live column that a
    // refund decrements, so reading it recomputes history — refunding an online
    // payment today would raise the COD figure reported for the month the order
    // was delivered in, a number that was never true in a period that closed.
    // Summing payments stamped at or before the delivery reconstructs what was
    // genuinely outstanding when the courier knocked, and stays fixed forever.
    //
    // Clamped at zero so an over-recorded prepayment can't subtract from the
    // day's takings.
    const codCollected = deliveredOrders.reduce((sum, o) => {
      const on = deliveredAt.get(o.id);
      const prepaid = o.payments.reduce(
        (paid, p) => (on && p.paidAt && p.paidAt <= on ? paid + p.amount : paid),
        0,
      );
      return sum + Math.max(0, o.total - prepaid);
    }, 0);
    const courierCost = deliveredOrders.reduce((sum, o) => sum + o.shippingCost, 0);

    const onlineIn = onlinePayments._sum?.amount ?? 0;
    const refundsOut = refundedPayments._sum?.amount ?? 0;
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
      // Without this line refunded money simply vanished from the report: it
      // left the bank, but appeared nowhere as having gone.
      { label: "Refunds paid out", amount: refundsOut, note: "Online payments returned" },
    ];

    const totalIn = inflows.reduce((s, l) => s + l.amount, 0);
    const totalOut = outflows.reduce((s, l) => s + l.amount, 0);

    return { inflows, outflows, totalIn, totalOut, net: totalIn - totalOut };
  });
}
