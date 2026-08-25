/**
 * Shared types and constants for the product form.
 *
 * Extracted from ProductForm so the form can be split across several files
 * without any of them re-declaring the shape of the state. ProductForm remains
 * the single owner of that state — everything here is inert.
 *
 * ─────────── SUBMIT CONTRACT ───────────
 * The form posts to `saveProduct` (./actions.ts) as plain FormData. Four fields
 * are JSON strings; the rest are scalars. Money crosses this boundary in TAKA
 * (the server calls takaToPaisa itself) even though the state holds paisa.
 *
 *   name                string
 *   categoryId          string (numeric id)
 *   description         string      — no longer edited; resubmitted as-is
 *   price               string (taka)   — variant mode: lowest variant price
 *   discountPrice       string (taka)   — variant mode: always ""
 *   purchaseCost        string (taka)
 *   stock               string          — variant mode: sum of variant stock
 *   lowStockThreshold   string          — "" / "0" = disabled
 *   showStock           "true" | "false"
 *   priceColor          "#rrggbb" | ""
 *   status              "ACTIVE" | "INACTIVE"
 *   promoBadge          string
 *   offerText           string      — offer strip copy; "" = no strip
 *   metaTitle           string
 *   metaDescription     string
 *   isFeatured          "on", and only present when true
 *
 *   sizeGuideId         string (numeric id) | ""   — "" = inherit the category's
 *   sizeLabel           string      — one-off override of the guide's label
 *   sizeChart           string      — one-off override of the guide's chart
 *   baseSku             string      — root of the generated variant SKUs
 *
 *   images              [{ url, variantLabel: null }]
 *   colors              [{ name, hexCode, imageUrl }]     — the colour list
 *   variants            [{ colorName, size, price, discountPrice, stock,
 *                          showStock, priceColor, imageUrl, sku }] — price in TAKA
 *   accordionSections   [{ title, icon, content, isOpen }]
 *
 * Anything rebuilding the form's UI must keep producing exactly this payload —
 * the server action, the storefront and every saved product depend on it.
 */

import type { listAllCategories } from "@/server/categories/admin";
import type { getProductById } from "@/server/products/admin";
import type { AccordionSectionRow } from "../AccordionBuilder";

export type Category = Awaited<ReturnType<typeof listAllCategories>>[number];
export type Product = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

/* Product photos are square 1000×1000 thumbnails, kept light so the catalog
   and product pages stay fast. Up to 10 per product; the first is the cover. */
export const PRODUCT_IMG = { width: 1000, height: 1000, maxBytes: 200 * 1024 };
export const MAX_IMAGES = 10;

export interface ImageRow {
  url: string;
}

/**
 * A colour the product comes in — authored once in the Options builder and
 * stamped onto every generated row of that colour. The photo is the real
 * chooser on the storefront ("More Colors"); the hex is only the fallback chip
 * for colours with no photo.
 */
export interface ColorRow {
  name: string;
  hexCode: string;
  /** Uploaded photo for this colour ("" = none) — swatch shows the hex instead. */
  imageUrl: string;
}

/** Where an uploaded photo should land. */
export type UploadTarget =
  | { kind: "product" }
  | { kind: "variant"; idx: number }
  | { kind: "color"; idx: number };

export interface VariantRow {
  /** Colour name for this option, or "" for none. */
  color: string;
  /** Swatch hex for the colour (used when there's no swap image). */
  colorHex: string;
  /** Uploaded photo for this row ("" = none). Saved to ProductVariant.imageUrl. */
  imageUrl: string;
  /** Size/option label, e.g. "M" or "1 Litre", or "" for none. */
  size: string;
  /** Regular price in Taka, as a string for the input. */
  price: string;
  /** Optional sale price in Taka; "" = no discount. */
  discountPrice: string;
  stock: string;
  /** Show the stock count on the storefront for this variant. */
  showStock: boolean;
  /** Storefront price colour (#rrggbb); "" = inherit the product's colour. */
  priceColor: string;
  /** Stock-keeping unit for this option; "" = none. Unique shop-wide. */
  sku: string;
}

/**
 * How the product is sold — the one choice the whole Options step follows.
 *
 *  "single"  one price, one stock, gallery photos only (a charger, a toy).
 *  "colors"  one row per colour, each with its own photo (a bag, a watch).
 *  "sizes"   sizes, optionally crossed with colours (a dress, a panjabi).
 *
 * "colors" and "sizes" both save variant rows; the storefront derives its
 * pickers from what those rows contain, so the distinction is purely how the
 * admin builds them. "single" saves no rows at all — Product.price/stock carry
 * it, exactly as before.
 */
export type SellingType = "single" | "colors" | "sizes";

export interface FormState {
  sellingType: SellingType;
  name: string;
  categoryId: string; // string for select value — any node in the category tree
  description: string;
  price: number | ""; // paisa
  discountPrice: number | ""; // paisa
  purchaseCost: number | ""; // paisa — sourcing cost (COGS basis)
  stock: number | "";
  lowStockThreshold: number | ""; // 0/"" = disabled
  showStock: boolean; // show the "In stock (N available)" count on the storefront
  /** Storefront price colour (#rrggbb); "" = theme default (near-black). */
  priceColor: string;
  status: "ACTIVE" | "INACTIVE" | "DRAFT";
  promoBadge: string;
  /** Offer strip copy; only shown on the storefront while a discount is set. */
  offerText: string;
  metaTitle: string;
  metaDescription: string;
  isFeatured: boolean;
  /** Size guide id as a select value; "" = inherit the category's. */
  sizeGuideId: string;
  /** One-off overrides of the resolved guide; "" = use the guide's own. */
  sizeLabel: string;
  sizeChart: string;
  /** Root of the generated variant SKUs ("SAR" → "SAR-PUR-32"); "" = none. */
  baseSku: string;
  images: ImageRow[]; // photo URLs + optional variant link; first is the cover
  colors: ColorRow[]; // the product's colours, in display order
  variants: VariantRow[];
  /** Collapsible "Features & Specs" panels; empty = show the description instead. */
  accordionSections: AccordionSectionRow[];
}
