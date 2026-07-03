import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getPaymentAdapter, type VerifiedPayment, type PaymentRef } from "@/integrations/payments";
import {
  getPaymentsConfig,
  gatewayFeeFor,
  type PaymentProviderKey,
} from "@/server/settings/payments";
import { enqueueMailJob, enqueuePaymentJob } from "@/jobs/enqueue";

// Service layer for online payments. All state transitions are transactional
// and idempotent — gateways retry IPNs, customers refresh callback pages, and
// the expiry job can race a slow IPN; every path must converge on one
// consistent outcome.
//
// Stock model: an online order RESERVES stock at creation (the same atomic
// decrement COD uses). Payment success keeps the reservation; failure,
// abandonment, or admin cancel of a PENDING_PAYMENT order releases it.

/** How long a customer gets to finish paying before the order auto-cancels. */
export const PAYMENT_EXPIRY_MS = 30 * 60 * 1000;

export class PaymentFlowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PaymentFlowError";
  }
}

type TxClient = Prisma.TransactionClient;

/** Put reserved units back on the shelf for every line of an order. */
export async function restockOrderItems(tx: TxClient, orderId: number): Promise<void> {
  const items = await tx.orderItem.findMany({ where: { orderId } });
  for (const item of items) {
    if (item.variantId != null) {
      await tx.productVariant.update({
        where: { id: item.variantId },
        data: { stock: { increment: item.quantity } },
      });
    } else if (item.productId != null) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }
    // productId null = product was deleted since; nothing to restock.
  }
}

/**
 * Create the Payment row and a gateway session for an order awaiting payment;
 * returns the URL to send the customer to. Also arms the 30-minute
 * auto-cancel job.
 */
export async function initiateOnlinePayment(
  order: { id: number; orderNo: string; customerName: string; customerPhone: string; customerEmail: string | null },
  provider: PaymentProviderKey,
  amountPaisa: number,
): Promise<string> {
  const payment = await prisma.payment.create({
    data: { orderId: order.id, provider, amount: amountPaisa, status: "INITIATED" },
  });

  const adapter = getPaymentAdapter(provider);
  let result;
  try {
    result = await adapter.initiate({
      paymentId: payment.id,
      orderNo: order.orderNo,
      amountPaisa,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
    });
  } catch (err) {
    // Gateway unreachable — the payment attempt is dead on arrival. Mark it
    // and let the expiry job (armed below regardless) clean up the order if
    // the customer doesn't retry.
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "FAILED", rawPayload: { initiateError: String(err) } },
    });
    await armExpiry(order.id);
    throw err;
  }

  if (result.providerRef) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: { providerTxnId: result.providerRef },
    });
  }
  await armExpiry(order.id);
  return result.gatewayUrl;
}

async function armExpiry(orderId: number): Promise<void> {
  try {
    await enqueuePaymentJob({ type: "expire-payment", orderId }, PAYMENT_EXPIRY_MS);
  } catch (err) {
    // Queue hiccup must not fail checkout; an unexpired PENDING_PAYMENT order
    // is visible in admin and can be cancelled by hand.
    console.error("[payments] failed to arm expiry job:", err);
  }
}

async function resolvePayment(ref: PaymentRef, provider: PaymentProviderKey) {
  const payment =
    ref.kind === "paymentId"
      ? await prisma.payment.findUnique({ where: { id: ref.paymentId } })
      : await prisma.payment.findFirst({
          where: { provider, providerTxnId: ref.providerRef },
        });
  if (!payment || payment.provider !== provider) {
    throw new PaymentFlowError("Callback does not match any payment attempt.");
  }
  return payment;
}

export interface PaymentOutcome {
  orderNo: string;
  paid: boolean;
}

/**
 * Apply a provider-verified callback. Idempotent: replaying a success or a
 * failure (IPN retries, both the return URL and the IPN firing) converges.
 */
export async function handleVerifiedPayment(
  provider: PaymentProviderKey,
  verified: VerifiedPayment,
): Promise<PaymentOutcome> {
  const payment = await resolvePayment(verified.ref, provider);
  const order = await prisma.order.findUniqueOrThrow({ where: { id: payment.orderId } });

  // Already settled — duplicate callback, report the settled state.
  if (payment.status === "SUCCESS" || payment.status === "REFUNDED") {
    return { orderNo: order.orderNo, paid: true };
  }

  if (verified.outcome !== "success") {
    await failPayment(payment.id, verified.raw);
    return { orderNo: order.orderNo, paid: false };
  }

  // Amount cross-check: the gateway's settled figure must equal what we asked
  // for. A mismatch is treated as failure and left for manual review.
  if (verified.amountPaisa == null || verified.amountPaisa !== payment.amount) {
    console.error(
      `[payments] amount mismatch on payment ${payment.id}: expected ${payment.amount}, ` +
        `provider says ${verified.amountPaisa}`,
    );
    await failPayment(payment.id, verified.raw);
    return { orderNo: order.orderNo, paid: false };
  }

  const config = await getPaymentsConfig();
  const fee = gatewayFeeFor(config, provider, payment.amount);

  const updatedOrder = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "SUCCESS",
        providerTxnId: verified.providerTxnId ?? payment.providerTxnId,
        rawPayload: (verified.raw ?? undefined) as Prisma.InputJsonValue,
      },
    });

    const fresh = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
    const data: Prisma.OrderUpdateInput = {
      paidAmount: { increment: payment.amount },
      // The gateway's cut, derived from the provider's configured rate —
      // lands in the same per-order cost field the P&L already aggregates.
      paymentGatewayFee: { increment: fee },
    };

    // Promote to the normal lifecycle only from PENDING_PAYMENT. If the
    // expiry job cancelled the order a heartbeat before the IPN arrived, the
    // money is real but the stock is gone — flag for manual handling rather
    // than resurrecting a cancelled order.
    if (fresh.status === "PENDING_PAYMENT") {
      data.status = "PENDING";
      await tx.orderStatusLog.create({
        data: { orderId: fresh.id, fromStatus: "PENDING_PAYMENT", toStatus: "PENDING", changedBy: null },
      });
    } else if (fresh.status === "CANCELLED") {
      await tx.orderNote.create({
        data: {
          orderId: fresh.id,
          author: "system",
          body:
            `Payment ${payment.id} (${provider}) succeeded AFTER the order was cancelled ` +
            `— refund the customer or restore the order manually.`,
        },
      });
    }

    return tx.order.update({ where: { id: payment.orderId }, data });
  });

  // Confirmation mail goes out on payment, mirroring the COD checkout path.
  if (updatedOrder.customerEmail) {
    const items = await prisma.orderItem.findMany({ where: { orderId: updatedOrder.id } });
    enqueueMailJob({
      type: "order-confirmation",
      to: updatedOrder.customerEmail,
      orderNo: updatedOrder.orderNo,
      customerName: updatedOrder.customerName,
      items: items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
      total: updatedOrder.total,
    }).catch((err) => console.error("[payments] failed to enqueue confirmation mail:", err));
  }

  return { orderNo: updatedOrder.orderNo, paid: true };
}

/**
 * Mark one payment attempt FAILED. If that leaves the order with no
 * successful payment and still awaiting one, cancel it and release stock.
 */
async function failPayment(paymentId: number, raw: unknown): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUniqueOrThrow({ where: { id: paymentId } });
    if (payment.status !== "INITIATED") return; // already settled either way

    await tx.payment.update({
      where: { id: paymentId },
      data: { status: "FAILED", rawPayload: (raw ?? undefined) as Prisma.InputJsonValue },
    });

    const order = await tx.order.findUniqueOrThrow({ where: { id: payment.orderId } });
    if (order.status !== "PENDING_PAYMENT") return;

    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    await tx.orderStatusLog.create({
      data: { orderId: order.id, fromStatus: "PENDING_PAYMENT", toStatus: "CANCELLED", changedBy: null },
    });
    await restockOrderItems(tx, order.id);
  });
}

/**
 * Expiry-job entrypoint: cancel an order the customer abandoned at the
 * gateway and release its stock. No-op when payment arrived in time.
 */
export async function expireUnpaidOrder(orderId: number): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order || order.status !== "PENDING_PAYMENT") return;

    await tx.payment.updateMany({
      where: { orderId, status: "INITIATED" },
      data: { status: "FAILED" },
    });
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
    await tx.orderStatusLog.create({
      data: { orderId, fromStatus: "PENDING_PAYMENT", toStatus: "CANCELLED", changedBy: null },
    });
    await restockOrderItems(tx, orderId);
  });
}

/**
 * Admin marked a successful payment as refunded (money returned outside the
 * system — bKash/SSLCommerz panel). Audited via an order note; paidAmount
 * drops so COD-due math stays honest.
 */
export async function markPaymentRefunded(paymentId: number, adminUsername: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new PaymentFlowError("Payment not found.");
    if (payment.status !== "SUCCESS") {
      throw new PaymentFlowError("Only a successful payment can be marked refunded.");
    }

    await tx.payment.update({ where: { id: paymentId }, data: { status: "REFUNDED" } });
    await tx.order.update({
      where: { id: payment.orderId },
      data: { paidAmount: { decrement: payment.amount } },
    });
    await tx.orderNote.create({
      data: {
        orderId: payment.orderId,
        author: adminUsername,
        body: `Marked payment #${payment.id} (${payment.provider}, ${payment.amount / 100} Tk, txn ${payment.providerTxnId ?? "n/a"}) as REFUNDED.`,
      },
    });
  });
}

/** Payments for the admin order detail panel, oldest first. */
export async function getOrderPayments(orderId: number) {
  return prisma.payment.findMany({ where: { orderId }, orderBy: { id: "asc" } });
}
