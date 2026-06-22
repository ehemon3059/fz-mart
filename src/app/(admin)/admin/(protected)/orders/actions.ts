"use server";

import { revalidatePath } from "next/cache";
import type { OrderStatus } from "@prisma/client";
import { updateOrderStatus, InvalidTransitionError } from "@/server/orders/admin";
import { enqueueSmsJob } from "@/jobs/enqueue";

export interface ActionResult {
  error?: string;
}

export async function advanceOrderStatus(
  orderId: number,
  newStatus: OrderStatus,
): Promise<ActionResult> {
  let order;
  try {
    order = await updateOrderStatus(orderId, newStatus);
  } catch (err) {
    if (err instanceof InvalidTransitionError) {
      return { error: err.message };
    }
    throw err;
  }

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
