/**
 * Pure helpers shared by the product form's pieces — money formatting for the
 * Taka inputs, the variant label the server derives too, and the upload-target
 * comparison that drives per-tile spinners. No React, no state.
 */

import type { UploadTarget } from "./types";

export const fmtTaka = (paisa: number) =>
  "৳" + (paisa / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });

export const fmtTakaInput = (paisa: number | "") =>
  paisa === "" || paisa == null ? "" : (Number(paisa) / 100).toString();

export const parseTaka = (s: string): number | "" => {
  const n = Number(s.replace(/[^\d.]/g, ""));
  return isNaN(n) ? "" : Math.round(n * 100);
};

/** Hidden inputs feed the real saveProduct action, which expects taka (it calls takaToPaisa itself). */
export const paisaToTakaStr = (paisa: number | "") => (paisa === "" ? "" : String(Number(paisa) / 100));

/** Variant display label ("Navy / M"), the shape legacy tags were written in. */
export const variantLabelOf = (colorName?: string | null, size?: string | null) =>
  [colorName?.trim(), size?.trim()].filter(Boolean).join(" / ");

/** Loose compare for legacy labels — casing/spacing drifted across saves. */
export const sameLabel = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

/** Same target twice? Used to drive per-tile spinners. */
export const sameTarget = (a: UploadTarget | null, b: UploadTarget) => {
  if (a === null || a.kind !== b.kind) return false;
  if (a.kind === "product" || b.kind === "product") return true;
  return a.idx === b.idx;
};
