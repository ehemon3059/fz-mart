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

export type MailJob = OrderConfirmationMailJob;

export interface OrderStatusSmsJob {
  type: "order-status";
  to: string;
  orderNo: string;
  status: OrderStatus;
}

export type SmsJob = OrderStatusSmsJob;
