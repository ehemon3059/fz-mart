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

// NOTE: There is deliberately no client-side Purchase event. For this COD
// store the meaningful conversion is a phone-CONFIRMED order, sent server-side
// via the Conversions API (see server/facebook/capi.ts) — not the moment a
// shopper reaches the confirmation page (many of those orders are fake).
