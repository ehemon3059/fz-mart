import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { enqueueCartJob } from "@/jobs/enqueue";
import { getConversionConfig } from "@/server/settings/conversion";
import { siteUrl } from "@/lib/seo";

// Abandoned-cart persistence + recovery. Carts are saved server-side for
// IDENTIFIED customers (one live CartSession per customerId). A delayed job
// (armed at save time) sends a reminder if the cart is still unfinished after
// the configured delay.

export interface SavedCartItem {
  productId: number;
  variantId: number | null;
  name: string;
  price: number;
  quantity: number;
  slug: string;
  imageUrl: string | null;
}

/**
 * Upsert an identified customer's cart and (re)arm the recovery reminder.
 * No-op when abandoned-cart recovery is disabled. The job re-checks freshness
 * via cartVersion, so re-saving on each checkout visit doesn't double-send.
 */
export async function saveCartForCustomer(params: {
  customerId: string;
  email: string | null;
  phone: string | null;
  items: SavedCartItem[];
  subtotal: number;
}): Promise<void> {
  const config = await getConversionConfig();
  if (!config.abandonedCartEnabled || params.items.length === 0) return;

  const existing = await prisma.cartSession.findUnique({
    where: { customerId: params.customerId },
  });

  const cart = await prisma.cartSession.upsert({
    where: { customerId: params.customerId },
    create: {
      customerId: params.customerId,
      email: params.email,
      phone: params.phone,
      items: params.items as unknown as Prisma.InputJsonValue,
      subtotal: params.subtotal,
      recoveryToken: existing?.recoveryToken ?? randomBytes(20).toString("hex"),
    },
    update: {
      email: params.email,
      phone: params.phone,
      items: params.items as unknown as Prisma.InputJsonValue,
      subtotal: params.subtotal,
      // A new cart activity resets the recovery cycle.
      reminderSentAt: null,
      recoveredAt: null,
      orderedAt: null,
    },
  });

  await enqueueCartJob(
    { type: "abandoned-cart", cartId: cart.id, cartVersion: cart.updatedAt.toISOString() },
    config.abandonedCartDelayHours * 60 * 60 * 1000,
  ).catch((err) => console.error("[cart] failed to arm recovery job:", err));
}

/** Mark a customer's cart as ordered so no reminder is sent. */
export async function markCartOrdered(customerId: string): Promise<void> {
  await prisma.cartSession
    .updateMany({ where: { customerId, orderedAt: null }, data: { orderedAt: new Date() } })
    .catch((err) => console.error("[cart] failed to mark ordered:", err));
}

export async function getCartByToken(token: string) {
  return prisma.cartSession.findUnique({ where: { recoveryToken: token } });
}

/** Attribute a recovery when the customer returns via the reminder link. */
export async function markCartRecovered(token: string): Promise<void> {
  await prisma.cartSession.updateMany({
    where: { recoveryToken: token, recoveredAt: null },
    data: { recoveredAt: new Date() },
  });
}

export function recoveryLink(token: string): string {
  return `${siteUrl()}/cart/restore/${token}`;
}

/** Admin report: reminder + recovery counts, and the recently-reminded carts. */
export async function getAbandonedCartReport() {
  const [remindersSent, recovered, ordered, recent] = await Promise.all([
    prisma.cartSession.count({ where: { reminderSentAt: { not: null } } }),
    prisma.cartSession.count({ where: { recoveredAt: { not: null } } }),
    prisma.cartSession.count({ where: { reminderSentAt: { not: null }, orderedAt: { not: null } } }),
    prisma.cartSession.findMany({
      where: { reminderSentAt: { not: null } },
      orderBy: { reminderSentAt: "desc" },
      take: 50,
      select: {
        id: true,
        email: true,
        phone: true,
        subtotal: true,
        reminderSentAt: true,
        recoveredAt: true,
        orderedAt: true,
      },
    }),
  ]);
  const recoveryRate = remindersSent > 0 ? Math.round((recovered / remindersSent) * 100) : 0;
  return { remindersSent, recovered, ordered, recoveryRate, recent };
}
