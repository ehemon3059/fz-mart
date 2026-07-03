import { prisma } from "@/lib/prisma";
import { getOrSetCache } from "@/lib/cache";

// Owner-facing analytics for the admin dashboard. Cached briefly (60s) since
// these scan orders/items and the dashboard is hit often. "Sales" recognises
// DELIVERED orders (consistent with the P&L's revenue definition).

const TTL = 60;

export interface BestSeller {
  productId: number;
  name: string;
  slug: string;
  qty: number;
  revenue: number; // paisa (unitPrice * qty, snapshotted)
}

/** Top products by quantity sold in the last `days`, among delivered orders. */
export async function getBestSellers(days: number, limit = 5): Promise<BestSeller[]> {
  return getOrSetCache(`analytics:bestsellers:${days}`, TTL, async () => {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    // Sum OrderItem qty for delivered orders in the window, grouped by product.
    const rows = await prisma.$queryRaw<
      { productId: number; name: string; slug: string; qty: bigint; revenue: bigint }[]
    >`
      SELECT p.id AS productId, p.name AS name, p.slug AS slug,
             SUM(oi.quantity) AS qty,
             SUM(oi.unitPrice * oi.quantity) AS revenue
      FROM OrderItem oi
      JOIN \`Order\` o ON o.id = oi.orderId
      JOIN Product p ON p.id = oi.productId
      WHERE o.status = 'DELIVERED' AND o.createdAt >= ${since}
      GROUP BY p.id, p.name, p.slug
      ORDER BY qty DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({
      productId: r.productId,
      name: r.name,
      slug: r.slug,
      qty: Number(r.qty),
      revenue: Number(r.revenue),
    }));
  });
}

export interface CategorySales {
  category: string;
  revenue: number; // paisa
  qty: number;
}

/** Delivered-order revenue grouped by top-level category (all-time). */
export async function getSalesByCategory(limit = 8): Promise<CategorySales[]> {
  return getOrSetCache("analytics:category-sales", TTL, async () => {
    const rows = await prisma.$queryRaw<
      { category: string; revenue: bigint; qty: bigint }[]
    >`
      SELECT c.name AS category,
             SUM(oi.unitPrice * oi.quantity) AS revenue,
             SUM(oi.quantity) AS qty
      FROM OrderItem oi
      JOIN \`Order\` o ON o.id = oi.orderId AND o.status = 'DELIVERED'
      JOIN Product p ON p.id = oi.productId
      JOIN Subcategory sc ON sc.id = p.subcategoryId
      JOIN Category c ON c.id = sc.categoryId
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `;
    return rows.map((r) => ({ category: r.category, revenue: Number(r.revenue), qty: Number(r.qty) }));
  });
}

export interface RepeatRate {
  totalCustomers: number;
  repeatCustomers: number;
  rate: number; // 0..100
}

/**
 * Repeat-customer rate by PHONE (every order has one, guest or not): the share
 * of customers who placed more than one non-cancelled order.
 */
export async function getRepeatCustomerRate(): Promise<RepeatRate> {
  return getOrSetCache("analytics:repeat-rate", TTL, async () => {
    const rows = await prisma.$queryRaw<{ orders: bigint }[]>`
      SELECT COUNT(*) AS orders
      FROM \`Order\`
      WHERE status <> 'CANCELLED' AND status <> 'PENDING_PAYMENT'
      GROUP BY customerPhone
    `;
    const totalCustomers = rows.length;
    const repeatCustomers = rows.filter((r) => Number(r.orders) > 1).length;
    const rate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
    return { totalCustomers, repeatCustomers, rate };
  });
}

export interface CourierSuccess {
  courier: string;
  delivered: number;
  failed: number; // returned + cancelled after shipping
  total: number;
  successRate: number; // 0..100
}

/**
 * COD delivery success per courier: delivered vs (returned/cancelled) for
 * orders that had a courier shipment. Courier name comes from CourierShipment.
 */
export async function getCourierSuccess(): Promise<CourierSuccess[]> {
  return getOrSetCache("analytics:courier-success", TTL, async () => {
    const rows = await prisma.$queryRaw<
      { courier: string; delivered: bigint; failed: bigint }[]
    >`
      SELECT cs.courierName AS courier,
             SUM(CASE WHEN o.status = 'DELIVERED' THEN 1 ELSE 0 END) AS delivered,
             SUM(CASE WHEN o.status IN ('RETURNED', 'CANCELLED') THEN 1 ELSE 0 END) AS failed
      FROM CourierShipment cs
      JOIN \`Order\` o ON o.id = cs.orderId
      GROUP BY cs.courierName
      ORDER BY delivered DESC
    `;
    return rows.map((r) => {
      const delivered = Number(r.delivered);
      const failed = Number(r.failed);
      const total = delivered + failed;
      return {
        courier: r.courier,
        delivered,
        failed,
        total,
        successRate: total > 0 ? Math.round((delivered / total) * 100) : 0,
      };
    });
  });
}
