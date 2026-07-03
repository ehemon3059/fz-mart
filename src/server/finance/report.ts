import type { ExpenseCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";

// ─────────────────────────────────────────────────────────────
// Monthly Profit & Loss
// ─────────────────────────────────────────────────────────────
//
// The single source of truth for the finance dashboard. Every figure below is
// in paisa (see lib/money.ts); the UI converts at the edge.
//
// P&L formula (standard single-vendor e-commerce accrual):
//
//   Net Revenue  = Gross Sales − Returns
//   Gross Profit = Net Revenue − COGS
//   Net Profit   = Gross Profit − Operating Expenses
//
// Two decisions make the numbers trustworthy:
//
//  1. REVENUE IS RECOGNISED ON THE EVENT DATE, not order-creation date. An order
//     counts as a sale in the month it was *delivered*, and as a return in the
//     month it was *returned* — read from the OrderStatusLog audit trail. An
//     order placed in June but delivered in July is July revenue. This is the
//     only way a "monthly" report can be correct for COD, where money is
//     realised on delivery, not at checkout.
//
//  2. COGS ONLY COUNTS GOODS SOLD *AND KEPT*. An order delivered this month but
//     since returned contributes its retail value to Gross Sales (on the
//     delivered date) but ZERO to COGS, because the goods aren't kept. If that
//     return was damaged (returnRestockable = false) its cost is booked as an
//     Inventory Loss under OpEx instead — a real cash loss, not cost of a sale.
//
// Delivery charges the customer pays (Order.deliveryCharge / the shipping half
// of Order.total) are treated as a pass-through and excluded from Gross Sales;
// the shop's own courier cost (Order.shippingCost) is the OpEx line. Basing
// revenue on `subtotal` (merchandise value) keeps sales from being inflated by
// shipping the customer merely reimburses.

export interface ExpenseBreakdownRow {
  category: ExpenseCategory;
  amount: number;
}

export interface MonthlyFinancialReport {
  // Core P&L (paisa)
  grossSales: number;
  couponDiscounts: number;
  returns: number;
  netRevenue: number;
  cogs: number;
  grossProfit: number;

  // Operating expenses (paisa)
  outboundShipping: number;
  returnShipping: number;
  gatewayFees: number;
  inventoryLoss: number;
  manualExpenses: number;
  manualExpenseBreakdown: ExpenseBreakdownRow[];
  totalOpEx: number;

  netProfit: number;

  // Context
  deliveredOrders: number;
  returnedOrders: number;
}

/** Local-time [start, end] bounds for a given year + 0-based month. */
export function monthRange(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  // Day 0 of the next month = last day of this month, at end of day.
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

// Reports tolerate brief staleness (same 60s policy as the other admin
// reports); the underlying queries scan the status log + orders + expenses.
const TTL_SECONDS = 60;

/**
 * Build the full P&L for one calendar month.
 *
 * @param year  e.g. 2026
 * @param month 0-based month index (0 = January), matching JS Date.
 */
export async function getMonthlyFinancialReport(
  year: number,
  month: number,
): Promise<MonthlyFinancialReport> {
  const { start, end } = monthRange(year, month);
  const key = `report:finance:${year}-${month}`;

  return getOrSetCache(key, TTL_SECONDS, async () => {
    // 1. Which orders were DELIVERED / RETURNED *within this month*, by the
    //    audit trail. distinct guards against any duplicate log rows.
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

    const deliveredIds = new Set(deliveredLogs.map((l) => l.orderId));
    const returnedIds = new Set(returnedLogs.map((l) => l.orderId));
    const allIds = [...new Set([...deliveredIds, ...returnedIds])];

    // 2. Load the orders touched this month, with just the financial fields.
    const orders = allIds.length
      ? await prisma.order.findMany({
          where: { id: { in: allIds } },
          select: {
            id: true,
            status: true,
            subtotal: true,
            couponDiscount: true,
            shippingCost: true,
            returnShippingCost: true,
            paymentGatewayFee: true,
            returnRestockable: true,
            items: { select: { purchaseCost: true, quantity: true } },
          },
        })
      : [];

    let grossSales = 0;
    let couponDiscounts = 0;
    let returns = 0;
    let cogs = 0;
    let outboundShipping = 0;
    let returnShipping = 0;
    let gatewayFees = 0;
    let inventoryLoss = 0;

    for (const order of orders) {
      const orderCost = order.items.reduce(
        (sum, it) => sum + it.purchaseCost * it.quantity,
        0,
      );

      if (deliveredIds.has(order.id)) {
        // Recognised as a sale this month.
        grossSales += order.subtotal;
        // Coupons are a revenue deduction — they reduce what the customer paid.
        couponDiscounts += order.couponDiscount;
        outboundShipping += order.shippingCost;
        gatewayFees += order.paymentGatewayFee;
        // COGS only if the goods are still sold-and-kept (not later returned).
        if (order.status === "DELIVERED") {
          cogs += orderCost;
        }
      }

      if (returnedIds.has(order.id)) {
        // Reverses revenue this month.
        returns += order.subtotal;
        returnShipping += order.returnShippingCost;
        // Damaged returns are a real cost with no offsetting sale → OpEx.
        if (!order.returnRestockable) {
          inventoryLoss += orderCost;
        }
      }
    }

    // 3. Manual OpEx entries dated inside the month.
    const expenses = await prisma.expense.groupBy({
      by: ["category"],
      where: { incurredOn: { gte: start, lte: end } },
      _sum: { amount: true },
    });

    const manualExpenseBreakdown: ExpenseBreakdownRow[] = expenses
      .map((e) => ({ category: e.category, amount: e._sum.amount ?? 0 }))
      .sort((a, b) => b.amount - a.amount);
    const manualExpenses = manualExpenseBreakdown.reduce((s, r) => s + r.amount, 0);

    // Coupons reduce recognised revenue (they're a discount off gross sales).
    const netRevenue = grossSales - couponDiscounts - returns;
    const grossProfit = netRevenue - cogs;
    const totalOpEx =
      outboundShipping + returnShipping + gatewayFees + inventoryLoss + manualExpenses;
    const netProfit = grossProfit - totalOpEx;

    return {
      grossSales,
      couponDiscounts,
      returns,
      netRevenue,
      cogs,
      grossProfit,
      outboundShipping,
      returnShipping,
      gatewayFees,
      inventoryLoss,
      manualExpenses,
      manualExpenseBreakdown,
      totalOpEx,
      netProfit,
      deliveredOrders: deliveredIds.size,
      returnedOrders: returnedIds.size,
    };
  });
}
