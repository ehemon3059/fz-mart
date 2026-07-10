"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  syncCartAction,
  mergeCartAction,
  logCartEventAction,
} from "@/app/(storefront)/account/cart-actions";

// Client-side cart state, persisted to localStorage.
//
// This is DISPLAY ONLY. The price/qty here drive the UI, but checkout
// re-verifies price and stock server-side inside a transaction — the
// browser is never trusted as the source of truth for what gets charged.
//
// For LOGGED-IN customers the cart is additionally mirrored server-side so it
// follows them across devices, and every add is logged for the profile's
// cart-history tab. The server actions self-gate on the session, so we call
// them unconditionally here — for guests they are silent no-ops and this store
// behaves exactly as a localStorage-only cart.

export interface CartItem {
  productId: number;
  /** Selected size/option, when the product has variants. */
  variantId?: number | null;
  variantLabel?: string | null;
  slug: string;
  name: string;
  /** Unit price in paisa, as last seen by the client — display only. */
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
}

/**
 * A cart "line" is identified by product AND chosen variant, so the same
 * product in two sizes (e.g. 500ml + 1L oil) are two separate lines.
 */
export function cartLineKey(item: Pick<CartItem, "productId" | "variantId">): string {
  return `${item.productId}:${item.variantId ?? ""}`;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (key: string) => void;
  setQuantity: (key: string, quantity: number) => void;
  clear: () => void;
  /** Merge this local cart with the signed-in customer's server cart. Call once after login. */
  mergeWithServer: () => Promise<void>;
}

/** The persisted lines reduced to the shape the server actions exchange. */
function toServerLines(items: CartItem[]) {
  return items.map((i) => ({
    productId: i.productId,
    variantId: i.variantId ?? null,
    quantity: i.quantity,
  }));
}

/**
 * Push the current cart to the server (no-op for guests). Fire-and-forget: a
 * failed sync must never block the UI, and the localStorage copy remains the
 * client's source of truth until the next successful push.
 */
function pushCart(items: CartItem[]) {
  void syncCartAction(toServerLines(items)).catch((err) =>
    console.error("[cart] server sync failed:", err),
  );
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        const key = cartLineKey(item);
        const items = get().items;
        const existing = items.find((i) => cartLineKey(i) === key);
        if (existing) {
          set({
            items: items.map((i) =>
              cartLineKey(i) === key ? { ...i, quantity: i.quantity + quantity } : i,
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity }] });
        }
        // Log the add for cart-history, then mirror the whole cart up.
        void logCartEventAction({
          productId: item.productId,
          variantId: item.variantId ?? null,
          quantity,
        }).catch((err) => console.error("[cart] event log failed:", err));
        pushCart(get().items);
      },
      removeItem: (key) => {
        set({ items: get().items.filter((i) => cartLineKey(i) !== key) });
        pushCart(get().items);
      },
      setQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => cartLineKey(i) !== key) });
        } else {
          set({
            items: get().items.map((i) => (cartLineKey(i) === key ? { ...i, quantity } : i)),
          });
        }
        pushCart(get().items);
      },
      clear: () => {
        set({ items: [] });
        pushCart([]);
      },
      mergeWithServer: async () => {
        try {
          const merged = await mergeCartAction(toServerLines(get().items));
          // Adopt server quantities for lines it knows; keep local display
          // fields (name/price/image) which the server cart doesn't store.
          const local = get().items;
          const byKey = new Map(local.map((i) => [cartLineKey(i), i]));
          const items: CartItem[] = merged
            .map((m) => {
              const existing = byKey.get(
                cartLineKey({ productId: m.productId, variantId: m.variantId }),
              );
              // A merged line with no local display data (added on another
              // device) is dropped from the view; it stays in the server cart
              // and the cart page can hydrate it from the product on next load.
              return existing ? { ...existing, quantity: m.quantity } : null;
            })
            .filter((i): i is CartItem => i !== null);
          set({ items });
        } catch (err) {
          console.error("[cart] merge with server failed:", err);
        }
      },
    }),
    { name: "fz-mart-cart" },
  ),
);

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
