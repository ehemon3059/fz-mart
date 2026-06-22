"use server";

import { revalidatePath } from "next/cache";
import { shipOrder, syncShipmentStatus, CourierServiceError } from "@/server/courier";

export interface CourierActionResult {
  error?: string;
}

export async function createShipment(orderId: number): Promise<CourierActionResult> {
  try {
    await shipOrder(orderId);
  } catch (err) {
    if (err instanceof CourierServiceError) {
      return { error: err.message };
    }
    console.error("[admin] courier shipment creation failed:", err);
    return { error: "Failed to create shipment. See server logs." };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

export async function refreshShipmentStatus(orderId: number): Promise<CourierActionResult> {
  try {
    await syncShipmentStatus(orderId);
  } catch (err) {
    if (err instanceof CourierServiceError) {
      return { error: err.message };
    }
    console.error("[admin] courier status sync failed:", err);
    return { error: "Failed to sync status. See server logs." };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}
