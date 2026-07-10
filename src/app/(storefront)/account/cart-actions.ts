"use server";

import { getCurrentCustomer } from "@/lib/customer-session";
import {
  type CartLine,
  getServerCart,
  replaceServerCart,
  mergeServerCart,
  logCartEvent,
} from "@/server/customer-cart";

// Server actions that bridge the client cart store (lib/cart-store.ts) to the
// persisted CustomerCart. Every action gates on getCurrentCustomer: for guests
// they are silent no-ops, so the store can call them unconditionally and guests
// keep their localStorage-only cart exactly as before.

/** Push the client's authoritative cart up after a local change. No-op for guests. */
export async function syncCartAction(lines: CartLine[]): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  await replaceServerCart(customer.customerId, lines);
}

/** Load the persisted cart. Returns [] for guests. */
export async function loadServerCartAction(): Promise<CartLine[]> {
  const customer = await getCurrentCustomer();
  if (!customer) return [];
  return getServerCart(customer.customerId);
}

/**
 * Merge the local cart into the server cart on login and return the union for
 * the client to adopt. Returns the local lines unchanged for guests (nothing to
 * merge into).
 */
export async function mergeCartAction(local: CartLine[]): Promise<CartLine[]> {
  const customer = await getCurrentCustomer();
  if (!customer) return local;
  return mergeServerCart(customer.customerId, local);
}

/** Record an add-to-cart event for the history log. No-op for guests. */
export async function logCartEventAction(line: CartLine): Promise<void> {
  const customer = await getCurrentCustomer();
  if (!customer) return;
  await logCartEvent(customer.customerId, line);
}
