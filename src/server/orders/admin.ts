import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextStatuses } from "@/config/order-status";
import { restockOrderItems } from "@/server/payments";

export const ORDERS_PAGE_SIZE = 20;

export interface OrderListFilter {
  status?: OrderStatus;
  /** Free-text match against order no., customer name, or phone. */
  search?: string;
  /** Inclusive lower bound on createdAt. */
  from?: Date;
  /** Inclusive upper bound on createdAt. */
  to?: Date;
  /** 1-based page number. */
  page?: number;
  pageSize?: number;
}

export interface OrderListResult {
  orders: Prisma.OrderGetPayload<{
    include: { items: true; shippingZone: true };
  }>[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Paginated, searchable order list for the admin table. Search matches order
 * number, customer name, or phone (MySQL's default collation is
 * case-insensitive, so no `mode` is needed). The date bounds filter on
 * createdAt; callers pass start-of-day / end-of-day Dates.
 */
export async function listOrders(filter: OrderListFilter = {}): Promise<OrderListResult> {
  const pageSize = filter.pageSize ?? ORDERS_PAGE_SIZE;
  const page = Math.max(1, filter.page ?? 1);

  const where: Prisma.OrderWhereInput = {};
  if (filter.status) where.status = filter.status;

  const search = filter.search?.trim();
  if (search) {
    where.OR = [
      { orderNo: { contains: search } },
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
    ];
  }

  if (filter.from || filter.to) {
    where.createdAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { items: true, shippingZone: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getOrderById(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: { items: true, shippingZone: true, courierShipment: true },
  });
}

export interface OrderFinancialsInput {
  /** Outbound courier fee the shop pays (paisa). */
  shippingCost: number;
  /** Courier fee lost on a return (paisa). */
  returnShippingCost: number;
  /** COD collection / gateway processing fee (paisa). */
  paymentGatewayFee: number;
  /** For returned orders: true = resellable, false = damaged (→ Inventory Loss). */
  returnRestockable: boolean;
}

/**
 * Persist the real per-order costs the monthly P&L aggregates. These are the
 * shop's OWN costs (courier, gateway), distinct from what the customer paid, so
 * they're editable independently of the order total and status.
 */
export async function updateOrderFinancials(
  orderId: number,
  input: OrderFinancialsInput,
) {
  return prisma.order.update({
    where: { id: orderId },
    data: {
      shippingCost: Math.max(0, Math.round(input.shippingCost)),
      returnShippingCost: Math.max(0, Math.round(input.returnShippingCost)),
      paymentGatewayFee: Math.max(0, Math.round(input.paymentGatewayFee)),
      returnRestockable: input.returnRestockable,
    },
  });
}

export class InvalidTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidTransitionError";
  }
}

/**
 * Advance an order's status, validated against the state machine in
 * config/order-status.ts. Admin can't jump arbitrarily (e.g. PENDING straight
 * to DELIVERED) — only to a status reachable from the current one.
 *
 * The update and its audit-log entry are written in a single transaction so
 * the status and its history can never drift apart. `changedBy` is the admin
 * username (null for system-originated changes).
 */
export async function updateOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
  changedBy?: string | null,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new InvalidTransitionError("Order not found.");
  }

  const allowed = nextStatuses(order.status);
  if (!allowed.includes(newStatus)) {
    throw new InvalidTransitionError(
      `Cannot move order from ${order.status} to ${newStatus}.`,
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: newStatus },
    });
    await tx.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        changedBy: changedBy ?? null,
      },
    });
    // A PENDING_PAYMENT order holds a stock reservation that was never sold —
    // cancelling it (the only manual transition allowed) releases the units.
    if (order.status === "PENDING_PAYMENT" && newStatus === "CANCELLED") {
      await restockOrderItems(tx, orderId);
    }
    return updated;
  });
}

export interface BulkStatusResult {
  /** Orders that were actually transitioned (for follow-up notifications). */
  updatedOrders: Awaited<ReturnType<typeof updateOrderStatus>>[];
  /** Count skipped because the transition was invalid from their state. */
  skipped: number;
}

/**
 * Apply the same status transition to many orders. Each order is validated and
 * logged individually via updateOrderStatus, so orders for which the move is
 * invalid (e.g. already shipped) are skipped rather than failing the batch.
 */
export async function bulkUpdateStatus(
  orderIds: number[],
  newStatus: OrderStatus,
  changedBy?: string | null,
): Promise<BulkStatusResult> {
  const updatedOrders: BulkStatusResult["updatedOrders"] = [];
  let skipped = 0;

  for (const id of orderIds) {
    try {
      updatedOrders.push(await updateOrderStatus(id, newStatus, changedBy));
    } catch (err) {
      if (err instanceof InvalidTransitionError) {
        skipped++;
        continue;
      }
      throw err;
    }
  }

  return { updatedOrders, skipped };
}

/** Full status-change history for an order, oldest first (timeline order). */
export async function getOrderStatusHistory(orderId: number) {
  return prisma.orderStatusLog.findMany({
    where: { orderId },
    orderBy: { createdAt: "asc" },
  });
}

/** Internal staff notes for an order, newest first. */
export async function getOrderNotes(orderId: number) {
  return prisma.orderNote.findMany({
    where: { orderId },
    orderBy: { createdAt: "desc" },
  });
}

export async function addOrderNote(orderId: number, body: string, author: string) {
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("Note cannot be empty.");
  }
  // Guard against notes on a non-existent order (FK would throw, but a clear
  // message is friendlier).
  const exists = await prisma.order.findUnique({
    where: { id: orderId },
    select: { id: true },
  });
  if (!exists) {
    throw new Error("Order not found.");
  }
  return prisma.orderNote.create({
    data: { orderId, body: trimmed, author },
  });
}
