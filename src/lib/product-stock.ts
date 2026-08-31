/**
 * How many units of a product are actually buyable.
 *
 * Two corrections live here, and both used to be re-derived (or forgotten) at
 * every call site:
 *
 *  1. AVAILABLE = stock − reserved. Units promised to unshipped orders are
 *     still on the shelf but already spoken for, so raw `stock` over-promises.
 *
 *  2. A product WITH options keeps its units on those options. `Product.stock`
 *     is vestigial for such a product — createProduct writes it as 0 and
 *     credits the opening balance to each variant instead (see
 *     server/products/admin.ts, "crediting both would double-count"), and it
 *     goes further out of date the moment a purchase order is received against
 *     a single size. Availability is therefore summed from the options whenever
 *     they carry stock, and only falls back to the product row for a genuinely
 *     simple product — or for a data source too lean to have selected them.
 *
 * Correction 2 is the one that bites: read `Product.stock` on a sized product
 * and every listing calls it out of stock while the shelf is full.
 */

/** One option row — only the two columns that matter for availability. */
export interface StockRowLike {
  stock?: number | null;
  reserved?: number | null;
}

/**
 * Structural subset shared by the Prisma product, the admin list row and the
 * storefront card. Every field is optional so lean sources (search, wishlist)
 * that never selected them still compile — they fall back to the product row,
 * which is the pre-variant behaviour.
 */
export interface WithStock {
  stock?: number | null;
  reserved?: number | null;
  variants?: StockRowLike[] | null;
}

/**
 * Whether this product's options are the authoritative source of its units.
 *
 * Keyed on `stock != null` rather than on the variants merely existing: a query
 * that loaded variants for their photos but not their stock must still fall
 * back to the product row, otherwise it would read every option as zero.
 */
export function variantsCarryStock(product: WithStock): boolean {
  return (product.variants ?? []).some((v) => v.stock != null);
}

/**
 * Units a shopper can actually buy right now.
 *
 * Per-option figures are clamped at zero so one oversold size can't eat the
 * availability of the others. The simple-product path is deliberately NOT
 * clamped — a negative there means stock and reservations have drifted apart,
 * and hiding it would hide a real data fault. Callers that render the number
 * treat everything <= 0 as "out of stock" regardless.
 */
export function availableUnits(product: WithStock): number {
  if (variantsCarryStock(product)) {
    return (product.variants ?? []).reduce(
      (sum, v) => sum + Math.max(0, (v.stock ?? 0) - (v.reserved ?? 0)),
      0,
    );
  }
  return (product.stock ?? 0) - (product.reserved ?? 0);
}

/**
 * Units physically on the shelf, reservations included. This is what an
 * inventory count should agree with — use availableUnits() for anything that
 * decides whether a shopper may buy.
 */
export function onHandUnits(product: WithStock): number {
  if (variantsCarryStock(product)) {
    return (product.variants ?? []).reduce((sum, v) => sum + (v.stock ?? 0), 0);
  }
  return product.stock ?? 0;
}

/** Nothing left to sell. */
export function isOutOfStock(product: WithStock): boolean {
  return availableUnits(product) <= 0;
}
