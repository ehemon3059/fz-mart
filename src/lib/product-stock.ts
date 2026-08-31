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

/** One option row — only the columns that matter for availability. */
export interface StockRowLike {
  stock?: number | null;
  reserved?: number | null;
  /** Units authorised for sale. Null/undefined = uncapped. */
  listedQty?: number | null;
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
  /** Units authorised for sale. Null/undefined = uncapped. */
  listedQty?: number | null;
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
 * Two limits apply and the smaller wins: what the shelf can ship
 * (stock − reserved) and what the admin listed for sale (listedQty; null =
 * uncapped). See server/inventory/reservations.ts availableOf(), which is the
 * same rule for a single row — this function is that rule summed across a
 * product's options.
 *
 * The cap is read from the SAME row that owns the stock, which is what keeps
 * Product.listedQty and ProductVariant.listedQty from ever contradicting each
 * other: on a product whose options carry stock, the product-level cap is
 * vestigial and never consulted, exactly as Product.stock already is.
 *
 * Per-option figures are clamped at zero so one oversold size can't eat the
 * availability of the others. The simple-product path is deliberately NOT
 * clamped — a negative there means stock and reservations have drifted apart,
 * and hiding it would hide a real data fault. Callers that render the number
 * treat everything <= 0 as "out of stock" regardless.
 */
export function availableUnits(product: WithStock): number {
  if (variantsCarryStock(product)) {
    return (product.variants ?? []).reduce((sum, v) => sum + sellableOf(v), 0);
  }
  const onShelf = (product.stock ?? 0) - (product.reserved ?? 0);
  return product.listedQty == null ? onShelf : Math.min(onShelf, Math.max(0, product.listedQty));
}

/** One option's sellable count: shelf and listing, whichever is tighter. */
function sellableOf(v: StockRowLike): number {
  const onShelf = Math.max(0, (v.stock ?? 0) - (v.reserved ?? 0));
  return v.listedQty == null ? onShelf : Math.min(onShelf, Math.max(0, v.listedQty));
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
