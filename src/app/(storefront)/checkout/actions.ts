"use server";

import { redirect } from "next/navigation";
import { createOrder, CheckoutError, type CheckoutItemInput } from "@/server/orders/createOrder";
import { enqueueMailJob } from "@/jobs/enqueue";
import { getFraudCheck } from "@/server/fraud";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/client-ip";
import { getCurrentCustomer } from "@/lib/customer-session";
import { initiateOnlinePayment } from "@/server/payments";
import {
  getCheckoutPaymentOptions,
  isPaymentProviderKey,
  type PaymentProviderKey,
} from "@/server/settings/payments";
import { validateCoupon, CouponError } from "@/server/coupons";
import { cartSubtotalPaisa } from "@/server/coupons/cart";
import { getConversionConfig } from "@/server/settings/conversion";
import { saveCartForCustomer, markCartOrdered, type SavedCartItem } from "@/server/cart";
import { prisma } from "@/lib/prisma";
import {
  sendOtp,
  verifyOtp,
  isPhoneVerified,
  isRepeatBuyer,
  clearPhoneVerification,
  OtpError,
} from "@/server/checkout/otp";
import type { PaymentMethod } from "@prisma/client";

const PHONE_RE = /^01[3-9]\d{8}$/;

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
  /** Set when COD checkout needs the phone verified before the order is placed. */
  otpRequired?: boolean;
}

export interface OtpResult {
  error?: string;
  sent?: boolean;
  verified?: boolean;
  cooldownSeconds?: number;
}

/** Send an OTP to the customer's phone for COD verification. */
export async function requestCheckoutOtp(phone: string): Promise<OtpResult> {
  if (!PHONE_RE.test(phone)) return { error: "Enter a valid phone number first." };
  const config = await getConversionConfig();
  if (!config.otpEnabled) return { sent: true }; // feature off — nothing to do
  if (await isRepeatBuyer(phone)) return { verified: true }; // trusted buyer

  // Rate-limit code requests per phone and per IP.
  const perPhone = await rateLimit("otp:phone", phone, 5, 60 * 15);
  if (!perPhone.allowed) return { error: "Too many code requests. Try again later." };
  const ip = await getClientIp();
  if (ip) {
    const perIp = await rateLimit("otp:ip", ip, 15, 60 * 15);
    if (!perIp.allowed) return { error: "Too many code requests from this network." };
  }

  try {
    const { cooldownSeconds } = await sendOtp(phone);
    return { sent: true, cooldownSeconds };
  } catch (err) {
    if (err instanceof OtpError) return { error: err.message };
    console.error("[checkout] failed to send OTP:", err);
    return { error: "Could not send the code. Please try again." };
  }
}

/** Verify the OTP the customer entered. */
export async function confirmCheckoutOtp(phone: string, code: string): Promise<OtpResult> {
  try {
    await verifyOtp(phone, code);
    return { verified: true };
  } catch (err) {
    if (err instanceof OtpError) return { error: err.message };
    console.error("[checkout] failed to verify OTP:", err);
    return { error: "Could not verify the code. Please try again." };
  }
}

export interface ApplyCouponResult {
  error?: string;
  code?: string;
  discount?: number;
}

/**
 * Persist a logged-in customer's cart for abandoned-cart recovery. Called on
 * checkout entry. No-op for guests or when the feature is off.
 */
export async function syncCart(items: SavedCartItem[]): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  const record = await prisma.customer.findUnique({
    where: { id: customer.customerId },
    select: { email: true },
  });
  const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
  await saveCartForCustomer({
    customerId: customer.customerId,
    email: record?.email ?? customer.email ?? null,
    phone: null, // phone isn't known until the order form is filled
    items,
    subtotal,
  }).catch((err) => console.error("[checkout] syncCart failed:", err));
}

/**
 * Preview a coupon for the current cart. Recomputes the subtotal from server
 * prices, so the discount shown is the discount that will actually apply. The
 * phone isn't known yet, so per-customer limits are only checked at checkout.
 */
export async function applyCoupon(
  items: CheckoutItemInput[],
  code: string,
): Promise<ApplyCouponResult> {
  try {
    const subtotal = await cartSubtotalPaisa(items);
    if (subtotal <= 0) return { error: "Your cart is empty." };
    const result = await validateCoupon(code, subtotal, null);
    return { code: result.code, discount: result.discount };
  } catch (err) {
    if (err instanceof CouponError) return { error: err.message };
    console.error("[checkout] coupon preview failed:", err);
    return { error: "Could not check that coupon. Please try again." };
  }
}

export async function placeOrder(
  items: CheckoutItemInput[],
  formData: FormData,
): Promise<PlaceOrderResult> {
  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const customerNote = String(formData.get("customerNote") ?? "").trim().slice(0, 90);
  const shippingZoneId = Number(formData.get("shippingZoneId"));
  const couponCode = String(formData.get("couponCode") ?? "").trim() || undefined;

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

  // Payment choice — re-validated against the ADMIN settings server-side, so
  // a crafted form can't force an online/partial order while the feature is
  // off, or pick a disabled provider.
  const methodRaw = String(formData.get("paymentMethod") ?? "COD");
  const paymentMethod: PaymentMethod =
    methodRaw === "ONLINE" || methodRaw === "PARTIAL" ? methodRaw : "COD";
  let provider: PaymentProviderKey | null = null;
  if (paymentMethod !== "COD") {
    const options = await getCheckoutPaymentOptions();
    if (!options.onlineEnabled) {
      return { error: "Online payment is not available right now. Please choose Cash on Delivery." };
    }
    if (paymentMethod === "PARTIAL" && !options.partialEnabled) {
      return { error: "Partial advance payment is not available right now." };
    }
    const providerRaw = String(formData.get("paymentProvider") ?? "");
    if (!isPaymentProviderKey(providerRaw) || !options.providers.some((p) => p.key === providerRaw)) {
      return { error: "Please choose a payment method." };
    }
    provider = providerRaw;
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

  // Phone OTP gate for COD (anti-fraud). Online/partial payment already proves
  // intent, so it's only enforced for COD, and repeat (delivered) buyers skip it.
  if (paymentMethod === "COD") {
    const conversion = await getConversionConfig();
    if (conversion.otpEnabled && !(await isRepeatBuyer(customerPhone))) {
      if (!(await isPhoneVerified(customerPhone))) {
        return { otpRequired: true };
      }
    }
  }

  const currentCustomer = await getCurrentCustomer();

  let orderNo: string;
  let gatewayUrl: string | null = null;
  try {
    const order = await createOrder({
      customerId: currentCustomer?.customerId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || undefined,
      address,
      customerNote: customerNote || undefined,
      shippingZoneId,
      items,
      paymentMethod,
      couponCode,
    });
    orderNo = order.orderNo;

    if (paymentMethod !== "COD" && provider) {
      // Stock is now reserved; hand the customer to the gateway. Full online
      // pays the whole total; partial advance pays just the delivery charge
      // (the standard BD anti-fake-order rule).
      const amountPaisa = paymentMethod === "ONLINE" ? order.total : order.deliveryCharge;
      try {
        gatewayUrl = await initiateOnlinePayment(
          {
            id: order.id,
            orderNo: order.orderNo,
            customerName: order.customerName,
            customerPhone: order.customerPhone,
            customerEmail: order.customerEmail,
          },
          provider,
          amountPaisa,
        );
      } catch (err) {
        console.error("[checkout] failed to initiate online payment:", err);
        return {
          error:
            "Could not reach the payment gateway. Your order was not confirmed — please try again or choose Cash on Delivery.",
        };
      }
    }

    // Fire-and-forget: enqueue only, never awaited as part of checkout
    // latency. If this throws (e.g. Redis briefly unreachable), the order
    // has already been saved — we log and move on rather than failing
    // checkout over a notification.
    // Online orders get their confirmation mail on PAYMENT (server/payments),
    // not here — a PENDING_PAYMENT order isn't confirmed yet.
    if (customerEmail && paymentMethod === "COD") {
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
    if (err instanceof CheckoutError || err instanceof CouponError) {
      return { error: err.message };
    }
    console.error("[checkout] order creation failed:", err);
    return { error: "Something went wrong placing your order. Please try again." };
  }

  // One-time-use: consume the phone verification so it can't be replayed for
  // a second order. Best-effort — never block the confirmation on it.
  clearPhoneVerification(customerPhone).catch(() => {});

  // Stop any abandoned-cart reminder for this customer now that they ordered.
  if (currentCustomer) {
    markCartOrdered(currentCustomer.customerId).catch(() => {});
  }

  if (gatewayUrl) {
    redirect(gatewayUrl);
  }
  redirect(`/order-confirmation/${orderNo}`);
}
