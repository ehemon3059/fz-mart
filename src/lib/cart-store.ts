"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// Client-side cart state, persisted to localStorage.
//
// This is DISPLAY ONLY. The price/qty here drive the UI, but checkout
// re-verifies price and stock server-side inside a transaction — the
// browser is never trusted as the source of truth for what gets charged.

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
      },
      removeItem: (key) => {
        set({ items: get().items.filter((i) => cartLineKey(i) !== key) });
      },
      setQuantity: (key, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => cartLineKey(i) !== key) });
          return;
        }
        set({
          items: get().items.map((i) => (cartLineKey(i) === key ? { ...i, quantity } : i)),
        });
      },
      clear: () => set({ items: [] }),
    }),
    { name: "fz-mart-cart" },
  ),
);

export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}
