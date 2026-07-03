import type { OrderStatus } from "@prisma/client";

// Shared job payload shapes between producers (lib/queue.ts callers) and
// workers (jobs/*.worker.ts). Keep these JSON-serializable — BullMQ
// serializes job data to Redis.

export interface OrderConfirmationMailJob {
  type: "order-confirmation";
  to: string;
  orderNo: string;
  customerName: string;
  items: Array<{ productName: string; quantity: number; unitPrice: number }>;
  total: number;
}

export interface MagicLinkMailJob {
  type: "magic-link";
  to: string;
  loginUrl: string;
}

export interface PasswordResetMailJob {
  type: "password-reset";
  to: string;
  resetUrl: string;
  /** Admin username, shown in the email so the recipient knows which account. */
  username: string;
}

export interface AbandonedCartMailJob {
  type: "abandoned-cart";
  to: string;
  recoveryUrl: string;
}

export interface BackInStockMailJob {
  type: "back-in-stock";
  to: string;
  productName: string;
  productUrl: string;
}

export interface LowStockDigestMailJob {
  type: "low-stock-digest";
  to: string;
  products: Array<{ name: string; stock: number; threshold: number }>;
}

export type MailJob =
  | OrderConfirmationMailJob
  | MagicLinkMailJob
  | PasswordResetMailJob
  | AbandonedCartMailJob
  | BackInStockMailJob
  | LowStockDigestMailJob;

export interface OrderStatusSmsJob {
  type: "order-status";
  to: string;
  orderNo: string;
  status: OrderStatus;
}

// Generic transactional SMS with a pre-rendered message body — used for OTP,
// abandoned-cart recovery, and back-in-stock alerts (the body is built by the
// producer, not templated in the worker).
export interface GenericSmsJob {
  type: "otp" | "abandoned-cart" | "back-in-stock";
  to: string;
  message: string;
}

export type SmsJob = OrderStatusSmsJob | GenericSmsJob;

// Delayed job armed when an online-payment order is created: if the order is
// still PENDING_PAYMENT when it fires (customer never paid), the worker
// cancels the order and releases the reserved stock. A no-op if payment
// arrived in the meantime.
export interface PaymentExpiryJob {
  type: "expire-payment";
  orderId: number;
}

export type PaymentJob = PaymentExpiryJob;

// Delayed abandoned-cart reminder. `cartVersion` is the CartSession.updatedAt
// (ISO) at scheduling time — the worker only sends if the cart hasn't been
// touched since (avoids double-sending after the customer edits their cart).
export interface AbandonedCartJob {
  type: "abandoned-cart";
  cartId: number;
  cartVersion: string;
}

export type CartJob = AbandonedCartJob;

// Repeatable daily maintenance jobs.
export interface LowStockDigestJob {
  type: "low-stock-digest";
}

export type MaintenanceJob = LowStockDigestJob;
