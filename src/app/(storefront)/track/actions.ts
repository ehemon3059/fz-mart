"use server";

import { trackOrder } from "@/server/orders/getOrder";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

export interface TrackResult {
  error?: string;
  order?: Awaited<ReturnType<typeof trackOrder>>;
}

// Public, unauthenticated lookup by (orderNo, phone). Rate-limited per IP so it
// can't be used to brute-force order numbers against a phone (or vice versa).
const LOOKUP_LIMIT = 20;
const LOOKUP_WINDOW_SECONDS = 60 * 5;

export async function lookupOrder(formData: FormData): Promise<TrackResult> {
  const orderNo = String(formData.get("orderNo") ?? "").trim().toUpperCase();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!orderNo || !phone) {
    return { error: "Please enter both your order number and phone number." };
  }

  const ip = await getClientIp();
  if (ip) {
    const limit = await rateLimit("track:ip", ip, LOOKUP_LIMIT, LOOKUP_WINDOW_SECONDS);
    if (!limit.allowed) {
      return { error: "Too many lookups. Please wait a few minutes and try again." };
    }
  }

  const order = await trackOrder(orderNo, phone);
  if (!order) {
    return { error: "No matching order found. Check your order number and phone." };
  }
  return { order };
}
