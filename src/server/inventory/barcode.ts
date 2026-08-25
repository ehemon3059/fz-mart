import { prisma } from "@/lib/prisma";

// ─────────────────────────────────────────────────────────────
// Barcode / SKU lookup
// ─────────────────────────────────────────────────────────────
//
// A handheld scanner is a keyboard: it types the code and presses Enter. So
// "barcode support" is not a device integration — it is resolving whatever was
// typed to exactly one stock row, fast, and saying clearly when it can't.
//
// The code IS the SKU. ProductVariant.sku is already unique shop-wide and
// generated as ROOT-COLOUR-SIZE, so it is the natural barcode value: no second
// identifier to print, keep in step, or get out of step. A product with no
// variants is matched on its baseSku.
//
// Matching is case-insensitive and trims whitespace, because scanners vary and
// a code typed by hand at 11pm should still find the shirt.

export interface ScanHit {
  productId: number;
  variantId: number | null;
  productName: string;
  variantLabel: string | null;
  sku: string | null;
  /** Current shop-wide on-hand for this row — what a count is measured against. */
  stock: number;
  reserved: number;
}

export type ScanResult =
  | { kind: "hit"; row: ScanHit }
  /** More than one row answers to this code — the admin picks. */
  | { kind: "ambiguous"; rows: ScanHit[] }
  | { kind: "miss"; code: string };

function label(colorName: string | null, size: string | null): string | null {
  return [colorName, size].filter(Boolean).join(" / ") || null;
}

/**
 * Resolve a scanned or typed code to a stock row.
 *
 * Order matters: an exact variant SKU wins outright, because that is the
 * precise thing someone scanned off a shelf. Only when nothing matches exactly
 * does this fall back to a product-level baseSku or a name search, which is a
 * convenience for hand-typing rather than for scanning.
 */
export async function scanCode(raw: string): Promise<ScanResult> {
  const code = raw.trim();
  if (!code) return { kind: "miss", code };

  // 1. Exact variant SKU. Unique shop-wide, so at most one row.
  const variant = await prisma.productVariant.findFirst({
    where: { sku: code },
    select: {
      id: true,
      sku: true,
      size: true,
      colorName: true,
      stock: true,
      reserved: true,
      productId: true,
      product: { select: { name: true } },
    },
  });
  if (variant) {
    return {
      kind: "hit",
      row: {
        productId: variant.productId,
        variantId: variant.id,
        productName: variant.product.name,
        variantLabel: label(variant.colorName, variant.size),
        sku: variant.sku,
        stock: variant.stock,
        reserved: variant.reserved,
      },
    };
  }

  // 2. A product's SKU root. A product WITH variants can't be counted as one
  //    row — its units live on the options — so this returns them all for the
  //    admin to choose from rather than guessing.
  const products = await prisma.product.findMany({
    where: { baseSku: code },
    select: {
      id: true,
      name: true,
      stock: true,
      reserved: true,
      baseSku: true,
      variants: {
        select: { id: true, sku: true, size: true, colorName: true, stock: true, reserved: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  const rows: ScanHit[] = [];
  for (const p of products) {
    if (p.variants.length === 0) {
      rows.push({
        productId: p.id,
        variantId: null,
        productName: p.name,
        variantLabel: null,
        sku: p.baseSku,
        stock: p.stock,
        reserved: p.reserved,
      });
    } else {
      for (const v of p.variants) {
        rows.push({
          productId: p.id,
          variantId: v.id,
          productName: p.name,
          variantLabel: label(v.colorName, v.size),
          sku: v.sku,
          stock: v.stock,
          reserved: v.reserved,
        });
      }
    }
  }

  if (rows.length === 1) return { kind: "hit", row: rows[0] };
  if (rows.length > 1) return { kind: "ambiguous", rows };

  return { kind: "miss", code };
}

/** Rows any single product may contribute to a name search. */
const PER_PRODUCT_ROWS = 6;

/**
 * Name search, for the rows that have no SKU at all.
 *
 * Plenty of stock in a shop like this was never labelled, and a stock-take that
 * only accepts barcodes would simply not cover it. Capped, because this feeds a
 * picker rather than a report.
 */
export async function searchStockRows(query: string, take = 20): Promise<ScanHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const products = await prisma.product.findMany({
    where: { name: { contains: q } },
    select: {
      id: true,
      name: true,
      stock: true,
      reserved: true,
      baseSku: true,
      variants: {
        select: { id: true, sku: true, size: true, colorName: true, stock: true, reserved: true },
        orderBy: { sortOrder: "asc" },
      },
    },
    // Fetch by PRODUCT, not by row. `take` bounds the rows returned below, and
    // a product with many options expands into many rows — so limiting the
    // query to `take` products and then slicing to `take` rows meant a single
    // 25-option product could fill the picker and hide every other match.
    // Over-fetch products so the row budget can span several of them; the cap
    // keeps a broad query from pulling the catalogue.
    take: Math.min(take * 3, 60),
  });

  const rows: ScanHit[] = [];
  for (const p of products) {
    if (p.variants.length === 0) {
      rows.push({
        productId: p.id,
        variantId: null,
        productName: p.name,
        variantLabel: null,
        sku: p.baseSku,
        stock: p.stock,
        reserved: p.reserved,
      });
    } else {
      // Bounded per product, so one heavily-optioned product cannot crowd the
      // others out of the list. Someone who really wants a specific option
      // types more of the name and narrows the search.
      for (const v of p.variants.slice(0, PER_PRODUCT_ROWS)) {
        rows.push({
          productId: p.id,
          variantId: v.id,
          productName: p.name,
          variantLabel: label(v.colorName, v.size),
          sku: v.sku,
          stock: v.stock,
          reserved: v.reserved,
        });
      }
    }
  }
  return rows.slice(0, take);
}
