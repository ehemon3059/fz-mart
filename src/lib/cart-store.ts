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
  slug: string;
  name: string;
  /** Unit price in paisa, as last seen by the client — display only. */
  unitPrice: number;
  imageUrl: string | null;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: number) => void;
  setQuantity: (productId: number, quantity: number) => void;
  clear: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item, quantity = 1) => {
        const items = get().items;
        const existing = items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: items.map((i) =>
              i.productId === item.productId
                ? { ...i, quantity: i.quantity + quantity }
                : i,
            ),
          });
        } else {
          set({ items: [...items, { ...item, quantity }] });
        }
      },
      removeItem: (productId) => {
        set({ items: get().items.filter((i) => i.productId !== productId) });
      },
      setQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          set({ items: get().items.filter((i) => i.productId !== productId) });
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
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
