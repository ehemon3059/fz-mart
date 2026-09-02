import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  nextStatuses,
  fulfilsReservation,
  releasesReservation,
  returnsFulfilledStock,
} from "@/config/order-status";
import { recordDamagedReturn } from "@/server/inventory/ledger";
import {
  fulfilOrder,
  releaseOrder,
  returnFulfilledOrder,
} from "@/server/inventory/reservations";
import { sendPurchaseConfirmed } from "@/server/facebook/capi";

export const ORDERS_PAGE_SIZE = 10;

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

export interface CancelledOrderRow {
  id: number;
  orderNo: string;
  customerName: string;
  customerPhone: string;
  address: string;
  total: number;
  /** True when the order was placed by a signed-in customer. */
  loggedIn: boolean;
  /** The customer's cancellation reason, if they gave one. */
  reason: string | null;
  /** Who cancelled — "customer", an admin username, or null (system). */
  cancelledBy: string | null;
  /** When the order moved to CANCELLED (falls back to updatedAt). */
  cancelledAt: Date;
  createdAt: Date;
}

export interface CancelledOrdersResult {
  rows: CancelledOrderRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

/**
 * Cancelled-orders view for the admin panel. Returns each cancelled order with
 * the customer details (name / phone / address), whether they were logged in,
 * and the cancellation reason + timestamp pulled from the CANCELLED status log.
 * Searchable by order no. / name / phone, filterable by cancellation date.
 */
export async function listCancelledOrders(
  filter: { search?: string; from?: Date; to?: Date; page?: number; pageSize?: number } = {},
): Promise<CancelledOrdersResult> {
  const pageSize = filter.pageSize ?? ORDERS_PAGE_SIZE;
  const page = Math.max(1, filter.page ?? 1);

  const where: Prisma.OrderWhereInput = { status: "CANCELLED" };

  const search = filter.search?.trim();
  if (search) {
    where.OR = [
      { orderNo: { contains: search } },
      { customerName: { contains: search } },
      { customerPhone: { contains: search } },
    ];
  }

  // Date range filters on WHEN the order was cancelled — i.e. the CANCELLED
  // status-log timestamp — not when the order was placed.
  if (filter.from || filter.to) {
    where.statusLogs = {
      some: {
        toStatus: "CANCELLED",
        createdAt: {
          ...(filter.from ? { gte: filter.from } : {}),
          ...(filter.to ? { lte: filter.to } : {}),
        },
      },
    };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        statusLogs: {
          where: { toStatus: "CANCELLED" },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.order.count({ where }),
  ]);

  const rows: CancelledOrderRow[] = orders.map((o) => {
    const log = o.statusLogs[0];
    return {
      id: o.id,
      orderNo: o.orderNo,
      customerName: o.customerName,
      customerPhone: o.customerPhone,
      address: o.address,
      total: o.total,
      loggedIn: o.customerId !== null,
      reason: log?.note ?? null,
      cancelledBy: log?.changedBy ?? null,
      cancelledAt: log?.createdAt ?? o.updatedAt,
      createdAt: o.createdAt,
    };
  });

  return {
    rows,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getOrderById(id: number) {
  return prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          // Thumbnails for the Items card. The VARIANT's own photo is preferred
          // where it has one — the line names a specific option, so showing the
          // generic product shot would picture something the customer didn't
          // buy. Both are nullable: a deleted product/variant leaves the line
          // intact (SetNull) with its name snapshot, and simply no image.
          variant: { select: { imageUrl: true } },
          product: {
            select: {
              images: { select: { id: true, url: true, isPrimary: true } },
              variants: { select: { imageUrl: true } },
              colors: { select: { imageUrl: true } },
            },
          },
        },
      },
      shippingZone: true,
      courierShipment: true,
    },
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
 *
 * Stock: a transition into CANCELLED (or a resellable RETURNED) releases the
 * units this order has been holding since checkout — see releasesStock().
 *
 * `restockable` makes the resellable-vs-damaged decision part of the RETURNED
 * transition itself, rather than a flag edited separately afterwards. It is
 * applied inside the same transaction, BEFORE the stock decision is taken, so
 * the units can never be credited on a stale default and then found to be
 * damaged. Ignored for every other transition. Omitted = use whatever the order
 * already carries (defaults true), which is how the plain status dropdown on the
 * order detail page still behaves.
 */
export async function updateOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
  changedBy?: string | null,
  restockable?: boolean,
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
      data: {
        status: newStatus,
        // Settle resellable-vs-damaged as part of the move into RETURNED, so
        // the stock decision below reads the admin's actual answer rather than
        // a default that may be corrected minutes too late.
        ...(newStatus === "RETURNED" && restockable !== undefined
          ? { returnRestockable: restockable }
          : {}),
      },
    });
    await tx.orderStatusLog.create({
      data: {
        orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        changedBy: changedBy ?? null,
      },
    });

    // ── Reservation lifecycle (Phase D) ────────────────────────────────────
    // Units are RESERVED at checkout and stay on the shelf. Exactly one of the
    // branches below applies, and each is idempotent on its own Order marker,
    // so a retried job or re-entered transition can never double-apply.
    const actor = changedBy ?? "system";

    if (fulfilsReservation(order.status, newStatus)) {
      // Parcel shipped: the reservation becomes a real stock decrease, and the
      // SALE is written to the ledger now rather than at checkout.
      await fulfilOrder(tx, orderId, actor);
    } else if (releasesReservation(order.status, newStatus)) {
      // Order died before shipping. The units never left the shelf, so this
      // frees the reservation and writes NO ledger movement — nothing moved.
      await releaseOrder(tx, orderId);
    } else if (returnsFulfilledStock(order.status, newStatus, updated.returnRestockable)) {
      // Shipped goods coming back intact — a genuine stock increase.
      await returnFulfilledOrder(tx, orderId, actor);
    } else if (
      newStatus === "RETURNED" &&
      !updated.returnRestockable &&
      (order.status === "SHIPPED" || order.status === "DELIVERED")
    ) {
      // Damaged return of shipped goods. Net stock is unchanged — the units
      // left when the parcel shipped and are not sellable now — but recording
      // nothing would leave the write-off invisible, indistinguishable from
      // goods that simply stayed sold. So the ledger tells what physically
      // happened: the parcel came back (RETURN +N) and was written off
      // (DAMAGE −N).
      await recordDamagedReturn(tx, orderId, actor);
    }
    return updated;
  }).then((updated) => {
    // Owner phone-confirmed the order → report the real conversion to Meta so
    // ad delivery optimizes toward customers who genuinely confirm. Fire-and-
    // forget: a Facebook failure must never fail the status change. Fires only
    // on the actual PENDING→CONFIRMED transition, so re-confirms can't double
    // count (the state machine forbids CONFIRMED→CONFIRMED anyway).
    if (newStatus === "CONFIRMED") {
      sendPurchaseConfirmed(updated).catch((err) =>
        console.error("[orders] CAPI Purchase send failed (non-blocking):", err),
      );
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

// ─────────────────────────────────────────────────────────────
// Deletion
// ─────────────────────────────────────────────────────────────

/** What an order WAS, captured before the row is destroyed, for the audit log. */
export interface DeletedOrderSummary {
  orderNo: string;
  status: OrderStatus;
  total: number;
  customerPhone: string;
}

export interface DeleteOrdersResult {
  deleted: DeletedOrderSummary[];
  /** Orders deliberately left alone, each with the reason to show the admin. */
  blocked: { orderNo: string; reason: string }[];
}

/**
 * Permanently delete ONE order. Returns either what was deleted or why it
 * wasn't — never throws for a refusal, so a bulk run reports per-order
 * outcomes instead of dying on the first protected order.
 *
 * Deletion is a real erase, not a status change: CANCELLED already exists for
 * "this order didn't happen". This is for orders that should never have been in
 * the book at all (test rows, junk/fake COD orders). Three things therefore have
 * to be settled before the row can go, because nothing else would fix them:
 *
 *   RESERVED UNITS  an unshipped order is holding stock. Delete the row and the
 *                   reservation is leaked — units unavailable forever with
 *                   nothing left pointing at them. So the reservation is
 *                   released first, inside this transaction.
 *   COUPON COUNTER  CouponRedemption cascades away, but Coupon.timesUsed is
 *                   denormalised and does not follow a cascade.
 *   PAYMENT ROWS    Payment has no cascade on purpose. Unsettled attempts are
 *                   deleted with the order; anything that moved money blocks it.
 *
 * StockMovement rows survive with orderId set to NULL (SetNull, by schema
 * design): deleting an order must never erase the fact that stock moved.
 */
async function deleteOneOrder(
  orderId: number,
): Promise<{ deleted?: DeletedOrderSummary; blocked?: { orderNo: string; reason: string } }> {
  return prisma.$transaction(async (tx) => {
    // Lock the order row FIRST. Everything that could make this delete unsafe
    // between the checks and the delete — a gateway IPN confirming payment
    // (handleVerifiedPayment), a consignment being created — writes THIS row
    // inside its own transaction, so the lock serialises against them. The
    // columns are re-read in the same locking statement because TiDB's
    // pessimistic REPEATABLE READ keeps the snapshot pinned after a lock, so a
    // plain read here would still return pre-lock values.
    const locked = await tx.$queryRaw<
      {
        id: number;
        orderNo: string;
        status: OrderStatus;
        total: number;
        paidAmount: number;
        customerPhone: string;
      }[]
    >`
      SELECT id, orderNo, status, total, paidAmount, customerPhone
      FROM \`Order\`
      WHERE id = ${orderId}
      FOR UPDATE
    `;
    const order = locked[0];
    if (!order) {
      return { blocked: { orderNo: `#${orderId}`, reason: "it no longer exists" } };
    }

    // A consignment exists at the courier, so the parcel is out in the real
    // world and its webhooks still key on this order. Cancel/return it through
    // the status flow instead — that is what those statuses are for.
    const shipment = await tx.courierShipment.findUnique({
      where: { orderId },
      select: { consignmentId: true },
    });
    if (shipment) {
      return {
        blocked: {
          orderNo: order.orderNo,
          reason: `a courier consignment (${shipment.consignmentId}) exists for it`,
        },
      };
    }

    // Money that actually moved is never deleted — the payment rows are the
    // shop's evidence in a gateway dispute and the basis of cash-flow reports.
    // Locked for the same reason the order row is: a SUCCESS arriving mid-delete
    // must not slip past this check.
    const payments = await tx.$queryRaw<{ id: number; status: string }[]>`
      SELECT id, status FROM Payment WHERE orderId = ${orderId} FOR UPDATE
    `;
    const settled = payments.some((p) => p.status === "SUCCESS" || p.status === "REFUNDED");
    if (settled || order.paidAmount > 0) {
      return {
        blocked: { orderNo: order.orderNo, reason: "money was taken online for it" },
      };
    }

    // Put back whatever this order is still holding. Self-selecting and
    // idempotent (claims only orders with restockedAt AND fulfilledAt null), so
    // a shipped order — whose units left the shelf for good — is a no-op here,
    // as is an already-cancelled one.
    await releaseOrder(tx, orderId);

    const redemption = await tx.couponRedemption.findUnique({
      where: { orderId },
      select: { couponId: true },
    });
    if (redemption) {
      // GREATEST floors it for the same reason releaseReservationRow floors
      // `reserved`: a counter that somehow went wrong should heal toward zero,
      // not wrap negative and hand out unlimited redemptions.
      await tx.$executeRaw`
        UPDATE Coupon SET timesUsed = GREATEST(timesUsed - 1, 0) WHERE id = ${redemption.couponId}
      `;
    }

    // Only unsettled attempts can reach here — anything that moved money was
    // refused above.
    await tx.payment.deleteMany({ where: { orderId } });

    // Items, status logs, notes, return requests and the coupon redemption go
    // with it (Cascade); stock movements stay, orphaned by design.
    await tx.order.delete({ where: { id: orderId } });

    return {
      deleted: {
        orderNo: order.orderNo,
        status: order.status,
        total: order.total,
        customerPhone: order.customerPhone,
      },
    };
  });
}

/**
 * Delete many orders. Each gets its own transaction, run one at a time like
 * bulkUpdateStatus: a protected order is reported and skipped rather than
 * rolling back the ones that were fine, and concurrent transactions can't
 * deadlock against each other over the same stock rows.
 */
export async function deleteOrders(orderIds: number[]): Promise<DeleteOrdersResult> {
  const deleted: DeletedOrderSummary[] = [];
  const blocked: DeleteOrdersResult["blocked"] = [];

  for (const id of orderIds) {
    const result = await deleteOneOrder(id);
    if (result.deleted) deleted.push(result.deleted);
    if (result.blocked) blocked.push(result.blocked);
  }

  return { deleted, blocked };
}
