"use server";

import { redirect } from "next/navigation";
import { createOrder, CheckoutError, type CheckoutItemInput } from "@/server/orders/createOrder";
import { enqueueMailJob } from "@/jobs/enqueue";
import { getFraudCheck } from "@/server/fraud";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";

// Fake/prank COD orders are a real cost (courier pickup fees, wasted stock
// hold) — limited per PHONE and per IP, not just generically, so one bad
// actor on either axis can't flood checkout. Limits are generous enough for
// a real shopper retrying a typo, tight enough to stop a script.
const PHONE_LIMIT = 5;
const PHONE_WINDOW_SECONDS = 60 * 10; // 10 minutes
const IP_LIMIT = 10;
const IP_WINDOW_SECONDS = 60 * 10;

export interface PlaceOrderResult {
  error?: string;
}

export async function placeOrder(
  items: CheckoutItemInput[],
  formData: FormData,
): Promise<PlaceOrderResult> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const shippingZoneId = Number(formData.get("shippingZoneId"));

  if (!customerName || customerName.length < 2) {
    return { error: "Please enter your full name." };
  }
  // Bangladeshi mobile numbers: 01[3-9]XXXXXXXX (11 digits).
  if (!/^01[3-9]\d{8}$/.test(customerPhone)) {
    return { error: "Please enter a valid phone number (e.g. 017XXXXXXXX)." };
  }
  if (customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)) {
    return { error: "Please enter a valid email address, or leave it blank." };
  }
  if (!address || address.length < 5) {
    return { error: "Please enter a delivery address." };
  }
  if (!shippingZoneId || Number.isNaN(shippingZoneId)) {
    return { error: "Please select a delivery zone." };
  }
  if (items.length === 0) {
    return { error: "Your cart is empty." };
  }

  const phoneLimit = await rateLimit("checkout:phone", customerPhone, PHONE_LIMIT, PHONE_WINDOW_SECONDS);
  if (!phoneLimit.allowed) {
    return {
      error: "Too many orders from this phone number recently. Please try again later.",
    };
  }

  const ip = await getClientIp();
  if (ip) {
    const ipLimit = await rateLimit("checkout:ip", ip, IP_LIMIT, IP_WINDOW_SECONDS);
    if (!ipLimit.allowed) {
      return { error: "Too many orders from this network recently. Please try again later." };
    }
  }

  let orderNo: string;
  try {
    const order = await createOrder({
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      address,
      shippingZoneId,
      items,
    });
    orderNo = order.orderNo;

    // Fire-and-forget: enqueue only, never awaited as part of checkout
    // latency. If this throws (e.g. Redis briefly unreachable), the order
    // has already been saved — we log and move on rather than failing
    // checkout over a notification.
    if (customerEmail) {
      enqueueMailJob({
        type: "order-confirmation",
        to: customerEmail,
        orderNo: order.orderNo,
        customerName: order.customerName,
        items: order.items.map((item) => ({
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        total: order.total,
      }).catch((err) => console.error("[checkout] failed to enqueue confirmation mail:", err));
    }

    // Fraud check is informational only — it surfaces a risk indicator to
    // admin (see order list/detail) but never blocks or fails checkout.
    // A flaky or wrong fraud-API response must never cost a real sale.
    getFraudCheck(customerPhone).catch((err) =>
      console.error("[checkout] fraud check failed (non-blocking):", err),
    );
  } catch (err) {
    if (err instanceof CheckoutError) {
      return { error: err.message };
    }
    console.error("[checkout] order creation failed:", err);
    return { error: "Something went wrong placing your order. Please try again." };
  }

  redirect(`/order-confirmation/${orderNo}`);
}
