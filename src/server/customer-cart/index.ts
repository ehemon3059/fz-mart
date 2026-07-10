import { prisma } from "@/lib/prisma";

// The logged-in customer's live cart, persisted server-side so it follows them
// across devices, plus an append-only add-to-cart event log for the profile's
// cart-history tab.
//
// Like lib/cart-store.ts this cart is DISPLAY ONLY — checkout re-verifies price
// and stock inside a transaction, so nothing here is trusted for what gets
// charged. Guests have no rows; all of this is a no-op for them (the callers in
// account/cart-actions.ts gate on getCurrentCustomer first).
//
// Distinct from server/cart (CartSession), which is the abandoned-cart recovery
// snapshot. This module owns the CustomerCart / CustomerCartItem / CartEvent
// models that back the client profile.

/** A cart line as exchanged with the client store (lib/cart-store.ts). */
export interface CartLine {
  productId: number;
  variantId: number | null;
  quantity: number;
}

function ensureCart(customerId: string) {
  return prisma.customerCart.upsert({
    where: { customerId },
    create: { customerId },
    update: {},
  });
}

/** The customer's persisted cart lines, newest-added first. */
export async function getServerCart(customerId: string): Promise<CartLine[]> {
  const cart = await prisma.customerCart.findUnique({
    where: { customerId },
    include: { items: { orderBy: { createdAt: "desc" } } },
  });
  if (!cart) return [];
  return cart.items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId,
    quantity: i.quantity,
  }));
}

/**
 * Replace the customer's persisted cart with exactly `lines`. Used to push the
 * authoritative client cart up after a local change and on the login merge. The
 * whole set is swapped inside a transaction so the server cart never lands in a
 * half-written state. Zero/negative quantities are dropped.
 */
export async function replaceServerCart(customerId: string, lines: CartLine[]): Promise<void> {
  const clean = lines.filter((l) => l.quantity > 0);
  const cart = await ensureCart(customerId);
  await prisma.$transaction([
    prisma.customerCartItem.deleteMany({ where: { cartId: cart.id } }),
    ...(clean.length
      ? [
          prisma.customerCartItem.createMany({
            data: clean.map((l) => ({
              cartId: cart.id,
              productId: l.productId,
              variantId: l.variantId,
              quantity: l.quantity,
            })),
          }),
        ]
      : []),
  ]);
}

/**
 * Merge the customer's local (localStorage) cart into their server cart and
 * return the union — summed quantities per (product, variant) line, matching
 * cartLineKey() in lib/cart-store.ts. Called once on login so a cart built while
 * signed out is never lost. Returns the merged lines for the client to adopt.
 */
export async function mergeServerCart(customerId: string, local: CartLine[]): Promise<CartLine[]> {
  const server = await getServerCart(customerId);
  const byKey = new Map<string, CartLine>();
  const keyOf = (l: CartLine) => `${l.productId}:${l.variantId ?? ""}`;
  for (const l of [...server, ...local]) {
    if (l.quantity <= 0) continue;
    const key = keyOf(l);
    const existing = byKey.get(key);
    if (existing) existing.quantity += l.quantity;
    else byKey.set(key, { ...l });
  }
  const merged = [...byKey.values()];
  await replaceServerCart(customerId, merged);
  return merged;
}

/**
 * Record a single add-to-cart event in the append-only history log. Fire this
 * on every add (even for items later removed) so the profile's cart-history is
 * a faithful trail. quantity <= 0 is ignored.
 */
export async function logCartEvent(
  customerId: string,
  line: CartLine,
): Promise<void> {
  if (line.quantity <= 0) return;
  await prisma.cartEvent.create({
    data: {
      customerId,
      productId: line.productId,
      variantId: line.variantId,
      quantity: line.quantity,
    },
  });
}

/**
 * The customer's add-to-cart history, newest first, with the product joined for
 * display. Products deleted since the event are dropped (the row survives via
 * onDelete: Cascade only when the product is removed, so a present row always
 * has a product). Paginated by the caller via take/skip.
 */
export async function listCartEvents(customerId: string, take = 50, skip = 0) {
  return prisma.cartEvent.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    take,
    skip,
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          discountPrice: true,
          status: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      },
    },
  });
}
