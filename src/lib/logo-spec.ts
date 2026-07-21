// Single source of truth for the storefront logo's sizing + weight rules.
// Shared by the admin upload form (client validation + cropper), the storefront
// header/footer (display box), and the copy shown to the admin.
//
// Sharp-logo strategy: store a HIGH-RES source (≈3× the display box) and let the
// browser downscale it into a fixed-height CSS box at render time. A large
// intrinsic image downsampled into a small box stays crisp on every device
// (including retina); a 1× image blurs. So we no longer force the upload down to
// the display size — we require it to be *bigger* and constrain it with CSS.

/** Display box (CSS px) the logo is painted into on the storefront. */
export const LOGO_DISPLAY_WIDTH = 140;
export const LOGO_DISPLAY_HEIGHT = 52;

/** Safety cap (CSS px) so a very wide wordmark can't blow out the header. */
export const LOGO_MAX_DISPLAY_WIDTH = 200;

/** High-res source the cropper renders to (3× the display box) so stored logos
 *  stay sharp when the browser scales them down. */
export const LOGO_SOURCE_WIDTH = LOGO_DISPLAY_WIDTH * 3; // 420
export const LOGO_SOURCE_HEIGHT = LOGO_DISPLAY_HEIGHT * 3; // 156

/** Reject raw uploads whose long edge is below this — scaling them UP into the
 *  box would blur. Comfortably sharp on retina for a 140px-wide box. */
export const LOGO_MIN_LONG_EDGE = 240;

/** Weight cap for the stored logo. Higher than a 1× logo needs because the
 *  source is intentionally large; still tiny for a transparent PNG/WebP. */
export const LOGO_MAX_BYTES = 300 * 1024; // 300 KB

/**
 * Validate a chosen logo image before upload. Returns a human-readable problem
 * string, or null when the image is acceptable. Pass `bytes = 0` to skip the
 * weight check (e.g. when re-checking an already-stored remote image).
 *
 * Unlike the old exact-size rule, this only enforces a *minimum* resolution and
 * the weight cap. Aspect ratio is free — the storefront uses `object-fit:
 * contain`, so a wide wordmark or a square mark both render undistorted.
 */
export function validateLogoImage(
  width: number,
  height: number,
  bytes: number,
): string | null {
  const longEdge = Math.max(width, height);
  if (longEdge < LOGO_MIN_LONG_EDGE) {
    return `Logo is too small (${width}×${height}px) and would blur when scaled up. Use an image at least ${LOGO_MIN_LONG_EDGE}px on its longest side — ${LOGO_SOURCE_WIDTH}×${LOGO_SOURCE_HEIGHT}px is ideal — or the “Customize image” cropper.`;
  }
  if (bytes > 0 && bytes > LOGO_MAX_BYTES) {
    return `Logo must be ${Math.round(LOGO_MAX_BYTES / 1024)} KB or smaller (this file is ${Math.round(
      bytes / 1024,
    )} KB).`;
  }
  return null;
}
