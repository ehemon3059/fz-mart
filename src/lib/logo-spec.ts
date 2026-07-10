// Single source of truth for the storefront logo's required dimensions and
// weight cap. Shared by the admin upload form (client validation + cropper)
// and referenced in copy shown to the admin. Mirrors lib/banner-slots.ts.

export const LOGO_WIDTH = 120;
export const LOGO_HEIGHT = 40;
export const LOGO_MAX_BYTES = 100 * 1024; // 100 KB

/**
 * Validate a chosen logo image before upload. Returns a human-readable problem
 * string, or null when the image is acceptable. Pass `bytes = 0` to skip the
 * weight check (e.g. when re-checking an already-stored remote image).
 *
 * The exact-dimension rule matches the banner flow: a raw upload must already
 * be 120×40. Anything else should go through the cropper ("Customize image"),
 * which outputs at exactly the target size.
 */
export function validateLogoImage(
  width: number,
  height: number,
  bytes: number,
): string | null {
  if (width !== LOGO_WIDTH || height !== LOGO_HEIGHT) {
    return `Logo must be exactly ${LOGO_WIDTH}×${LOGO_HEIGHT}px (this image is ${width}×${height}px). Use “Customize image” to crop it to fit.`;
  }
  if (bytes > 0 && bytes > LOGO_MAX_BYTES) {
    return `Logo must be ${Math.round(LOGO_MAX_BYTES / 1024)} KB or smaller (this file is ${Math.round(
      bytes / 1024,
    )} KB).`;
  }
  return null;
}
