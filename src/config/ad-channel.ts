import type { AdChannel } from "@prisma/client";

// Single source of truth for marketing channels, mirroring the AdChannel enum
// in schema.prisma. The ad-spend form and the ROAS/CAC report read from here so
// labels never drift from the stored values.

export const AD_CHANNELS: AdChannel[] = ["FACEBOOK", "GOOGLE", "TIKTOK", "OTHER"];

export const AD_CHANNEL_LABELS: Record<AdChannel, string> = {
  FACEBOOK: "Facebook / Instagram",
  GOOGLE: "Google",
  TIKTOK: "TikTok",
  OTHER: "Other",
};

/** The synthetic "channel" for orders with no ad attribution. Never carries
 *  spend, so it appears in the report as a revenue row without ROAS/CAC. */
export const ORGANIC_CHANNEL = "ORGANIC" as const;
export type ReportChannel = AdChannel | typeof ORGANIC_CHANNEL;

export const REPORT_CHANNEL_LABELS: Record<ReportChannel, string> = {
  ...AD_CHANNEL_LABELS,
  ORGANIC: "Organic / Direct",
};

export function isAdChannel(value: string): value is AdChannel {
  return (AD_CHANNELS as readonly string[]).includes(value);
}

/**
 * Classify one order to a marketing channel from its stored attribution, using
 * a fixed precedence (first-touch, most-specific wins):
 *
 *   1. Facebook click id present (fbp/fbc) → FACEBOOK
 *   2. else a utm_source is present → map it to a channel
 *   3. else → ORGANIC (no ad drove it, or attribution was blocked/stripped)
 *
 * Kept pure (no DB) so the report can classify a batch of orders in memory.
 */
export function classifyOrderChannel(order: {
  fbp: string | null;
  fbc: string | null;
  utmSource: string | null;
  utmMedium: string | null;
}): ReportChannel {
  if (order.fbp || order.fbc) return "FACEBOOK";

  const source = (order.utmSource ?? "").trim().toLowerCase();
  if (source) {
    if (source.includes("facebook") || source === "fb" || source === "ig" || source.includes("instagram")) {
      return "FACEBOOK";
    }
    if (source.includes("google") || source.includes("adwords") || source.includes("gads")) {
      return "GOOGLE";
    }
    if (source.includes("tiktok") || source === "tt") return "TIKTOK";
    // A tagged campaign we can't map to a known network is still paid traffic.
    return "OTHER";
  }

  return ORGANIC_CHANNEL;
}
