"use client";

// Fires a Facebook Pixel standard event if the base script (PixelScript) has
// loaded `fbq`. No-ops silently when no Pixel id is configured — callers
// don't need to know whether tracking is enabled.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export function trackAddToCart(params: { value: number; currency?: string }) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "AddToCart", {
    value: params.value,
    currency: params.currency ?? "BDT",
  });
}

export function trackPurchase(params: {
  value: number;
  currency?: string;
  orderNo: string;
}) {
  if (typeof window === "undefined" || !window.fbq) return;
  window.fbq("track", "Purchase", {
    value: params.value,
    currency: params.currency ?? "BDT",
    content_ids: [params.orderNo],
  });
}
