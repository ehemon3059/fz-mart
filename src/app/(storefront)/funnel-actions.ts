"use server";

import { trackFunnelEvent } from "@/server/funnel";

// Client-callable funnel hooks for events that originate in the browser (the
// cart is client-side state). Fire-and-forget from the caller's perspective:
// the server records the event without blocking, and the action returns nothing
// worth awaiting — a UI handler can call it without `await`.

export async function recordAddToCart(productId: number): Promise<void> {
  trackFunnelEvent("ADD_TO_CART", { productId });
}

export async function recordCheckoutStart(): Promise<void> {
  trackFunnelEvent("CHECKOUT_START");
}
