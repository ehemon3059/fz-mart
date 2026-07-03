// Hero banner slots — the homepage hero has three distinct image areas, and
// every Banner belongs to exactly one of them. Each slot has its own required
// aspect ratio, recommended pixel size and max file weight so the hero always
// looks right and never slows the page down.
//
// This is the single source of truth: the admin upload form validates against
// it, and the storefront Hero groups banners by it.

export type BannerSlot = "MAIN" | "RIGHT_TOP" | "RIGHT_BOTTOM";

export interface BannerSlotSpec {
  slot: BannerSlot;
  label: string;
  description: string;
  /** MAIN holds several images that rotate as a carousel; the others are single. */
  multiple: boolean;
  ratioW: number;
  ratioH: number;
  recommendedWidth: number;
  recommendedHeight: number;
  /** Hard cap on file weight (bytes) so the hero stays fast to load. */
  maxBytes: number;
}

const KB = 1024;

export const BANNER_SLOTS: BannerSlotSpec[] = [
  {
    slot: "MAIN",
    label: "Big Banner (Left)",
    description:
      "The large banner on the left. This is a multiple-card section — add several images and they rotate as a carousel with left/right arrows.",
    multiple: true,
    ratioW: 2,
    ratioH: 1,
    recommendedWidth: 1200,
    recommendedHeight: 600,
    maxBytes: 600 * KB,
  },
  {
    slot: "RIGHT_TOP",
    label: "Right — Top",
    description: "The upper card on the right side. Single image.",
    multiple: false,
    ratioW: 2,
    ratioH: 1,
    recommendedWidth: 800,
    recommendedHeight: 400,
    maxBytes: 350 * KB,
  },
  {
    slot: "RIGHT_BOTTOM",
    label: "Right — Bottom",
    description: "The lower card on the right side. Single image.",
    multiple: false,
    ratioW: 2,
    ratioH: 1,
    recommendedWidth: 800,
    recommendedHeight: 400,
    maxBytes: 350 * KB,
  },
];

export const BANNER_SLOT_MAP = Object.fromEntries(
  BANNER_SLOTS.map((s) => [s.slot, s]),
) as Record<BannerSlot, BannerSlotSpec>;

export const BANNER_SLOT_VALUES = BANNER_SLOTS.map((s) => s.slot);

// How far an image's aspect ratio may drift from the slot's target (6%).
const RATIO_TOLERANCE = 0.06;
// Smallest acceptable size, as a fraction of the recommended size.
const MIN_SIZE_FRACTION = 0.8;

export function isBannerSlot(value: string): value is BannerSlot {
  return value === "MAIN" || value === "RIGHT_TOP" || value === "RIGHT_BOTTOM";
}

export function getBannerSlotSpec(slot: string): BannerSlotSpec {
  return isBannerSlot(slot) ? BANNER_SLOT_MAP[slot] : BANNER_SLOTS[0];
}

/**
 * Check a chosen image against a slot's requirements. Returns a human-readable
 * error string, or null when the image is acceptable. Used client-side before
 * upload so a wrongly-sized image is rejected and never stored.
 */
export function validateBannerImage(
  slot: BannerSlot,
  width: number,
  height: number,
  bytes: number,
): string | null {
  const spec = BANNER_SLOT_MAP[slot];
  if (!spec) return "Unknown banner slot.";

  if (bytes > spec.maxBytes) {
    return `Image is too heavy (${Math.round(bytes / KB)} KB). Keep it under ${Math.round(
      spec.maxBytes / KB,
    )} KB so the homepage loads fast.`;
  }

  if (
    width < spec.recommendedWidth * MIN_SIZE_FRACTION ||
    height < spec.recommendedHeight * MIN_SIZE_FRACTION
  ) {
    return `Image is too small (${width}×${height}px). Use at least ${spec.recommendedWidth}×${spec.recommendedHeight}px.`;
  }

  const target = spec.ratioW / spec.ratioH;
  const actual = width / height;
  if (Math.abs(actual - target) / target > RATIO_TOLERANCE) {
    return `Wrong shape for this card — it needs a ${spec.ratioW}:${spec.ratioH} ratio (about ${spec.recommendedWidth}×${spec.recommendedHeight}px). Your image is ${width}×${height}px.`;
  }

  return null;
}
