"use server";

import { trackOrder } from "@/server/orders/getOrder";

export interface TrackResult {
  error?: string;
  order?: Awaited<ReturnType<typeof trackOrder>>;
}

export async function lookupOrder(formData: FormData): Promise<TrackResult> {
  const orderNo = String(formData.get("orderNo") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!orderNo || !phone) {
    return { error: "Please enter both your order number and phone number." };
  }

  const order = await trackOrder(orderNo, phone);
  if (!order) {
    return { error: "No matching order found. Check your order number and phone." };
  }
  return { order };
}
