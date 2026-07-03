"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import {
  updateOrderStatus,
  addOrderNote,
  bulkUpdateStatus,
  updateOrderFinancials,
  InvalidTransitionError,
} from "@/server/orders/admin";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { takaToPaisa } from "@/lib/money";
import { enqueueSmsJob } from "@/jobs/enqueue";
import { markPaymentRefunded, PaymentFlowError } from "@/server/payments";

export interface ActionResult {
  error?: string;
}

export interface BulkActionResult extends ActionResult {
  updated?: number;
  skipped?: number;
}

// Only forward, low-risk transitions are exposed for batch use; destructive
// moves (cancel/return) stay one-at-a-time on the order detail page.
const BULK_ALLOWED: OrderStatus[] = ["CONFIRMED", "SHIPPED"];

export async function advanceOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
): Promise<ActionResult> {
  const admin = await requirePermission("orders");

  let order;
  try {
    order = await updateOrderStatus(orderId, newStatus, admin.username);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { error: err.message };
    }
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "order.status_change",
    detail: `Order ${order.orderNo} → ${newStatus}`,
  });

  // Fire-and-forget: the status change has already been saved; a queue
  // hiccup must never undo or block it.
  enqueueSmsJob({
    type: "order-status",
    to: order.customerPhone,
    orderNo: order.orderNo,
    status: order.status,
  }).catch((err) => console.error("[admin] failed to enqueue status SMS:", err));

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

export async function bulkAdvanceStatus(
  orderIds: number[],
  newStatus: OrderStatus,
): Promise<BulkActionResult> {
  const admin = await requirePermission("orders");

  if (!BULK_ALLOWED.includes(newStatus)) {
    return { error: "That status can't be applied in bulk." };
  }
  if (orderIds.length === 0) {
    return { error: "No orders selected." };
  }

  const { updatedOrders, skipped } = await bulkUpdateStatus(
    orderIds,
    newStatus,
    admin.username,
  );

  // Same fire-and-forget notification as a single advance, one per order moved.
  for (const order of updatedOrders) {
    enqueueSmsJob({
      type: "order-status",
      to: order.customerPhone,
      orderNo: order.orderNo,
      status: order.status,
    }).catch((err) => console.error("[admin] failed to enqueue status SMS:", err));
  }

  revalidatePath("/admin/orders");
  return { updated: updatedOrders.length, skipped };
}

export async function saveOrderFinancials(
  orderId: number,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("orders");

  const shippingCost = Number(formData.get("shippingCost") ?? 0);
  const returnShippingCost = Number(formData.get("returnShippingCost") ?? 0);
  const paymentGatewayFee = Number(formData.get("paymentGatewayFee") ?? 0);
  const returnRestockable = formData.get("returnRestockable") === "on";

  if (
    [shippingCost, returnShippingCost, paymentGatewayFee].some(
      (n) => !Number.isFinite(n) || n < 0,
    )
  ) {
    return { error: "Costs must be zero or positive numbers." };
  }

  // The form collects Taka; convert to the paisa the DB stores.
  await updateOrderFinancials(orderId, {
    shippingCost: takaToPaisa(shippingCost),
    returnShippingCost: takaToPaisa(returnShippingCost),
    paymentGatewayFee: takaToPaisa(paymentGatewayFee),
    returnRestockable,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/reports/finance");
  return {};
}

export async function markPaymentRefundedAction(
  orderId: number,
  paymentId: number,
): Promise<ActionResult> {
  const admin = await requirePermission("orders");

  try {
    await markPaymentRefunded(paymentId, admin.username);
  } catch (err) {
    if (err instanceof PaymentFlowError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "payment.refund",
    detail: `Marked payment #${paymentId} (order ${orderId}) refunded`,
  });

  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath("/admin/reports/finance");
  return {};
}

export async function createOrderNote(
  orderId: number,
  body: string,
): Promise<ActionResult> {
  const admin = await requirePermission("orders");

  try {
    await addOrderNote(orderId, body, admin.username);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not add note." };
  }

  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}
