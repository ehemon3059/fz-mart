/**
 * Seeds the product form's state — a blank product, or an existing one mapped
 * out of the shape `getProductById` returns. Carries the backfill rules for
 * products saved before variant rows owned their own colour hex and photo.
 */

import { sameLabel, variantLabelOf } from "./helpers";
import type { ColorRow, FormState, ImageRow, LandedCostInfo, Product, SellingType } from "./types";

/**
 * How an existing product is sold, read back from what it actually saved:
 * no rows → a single item, any row with a size → sizes, otherwise colours.
 */
function sellingTypeOf(p: Product): SellingType {
  const variants = p.variants ?? [];
  if (variants.length === 0) return "single";
  return variants.some((v) => v.size?.trim()) ? "sizes" : "colors";
}

/**
 * The colour list. Saved ProductColor rows are the source when there are any;
 * older products that only ever had colours on their variant rows get the list
 * derived from those instead, so opening one shows the colours it really has.
 * A colour with no photo of its own borrows the first photo used by one of its
 * rows — that photo IS the colour as far as a shopper is concerned.
 */
function colorsOf(p: Product): ColorRow[] {
  const rowImage = (name: string) =>
    p.variants?.find((v) => v.colorName === name && v.imageUrl)?.imageUrl ?? "";

  if (p.colors?.length) {
    return p.colors.map((c) => ({
      name: c.name,
      hexCode: c.hexCode,
      imageUrl: c.imageUrl ?? rowImage(c.name) ?? "",
    }));
  }

  const seen = new Map<string, ColorRow>();
  for (const v of p.variants ?? []) {
    const name = v.colorName?.trim();
    if (!name || seen.has(name)) continue;
    seen.set(name, { name, hexCode: "#000000", imageUrl: v.imageUrl ?? "" });
  }
  return [...seen.values()];
}

/**
 * The options this product really has, told apart from the ones a purchase
 * order had to invent so it could be ordered against.
 *
 * `quickCreateProductAction` writes the WHOLE colour × size grid when a product
 * is created from inside a purchase order, because a PO line has to point at a
 * variant row and any combination might turn out to be the one being ordered.
 * Order three combinations of a 3-colour × 5-size product and twelve empty rows
 * come with them — and nobody can do anything with those twelve: no price to
 * sell at, no landed cost for "Price from cost" to mark up, and `cleanVariants`
 * drops them from the save regardless. All they can do is sit in the editor as
 * twelve rows of "still needs a price", blocking the save of the three that
 * actually arrived.
 *
 * A row survives if anything at all has happened to it — a price someone typed,
 * stock on the shelf, a sourcing cost written by a receipt, or a purchase order
 * that ordered it. That last one deliberately includes an order still in
 * transit: its goods are real and its estimated landed cost is exactly the
 * number the admin is pricing against.
 *
 * If that would leave nothing, everything is kept instead. A product ordered
 * against none of its options is unusual, and an empty editor would read as
 * "this product has no options" rather than as a filter.
 */
function realVariants(p: Product, landedCosts?: Record<number, LandedCostInfo>) {
  const all = p.variants ?? [];
  const kept = all.filter(
    (v) => v.price > 0 || v.stock > 0 || v.purchaseCost > 0 || landedCosts?.[v.id] != null,
  );
  return kept.length > 0 ? kept : all;
}

/**
 * @param landedCosts What each variant last cost, keyed by variant id — the
 *   purchase-order history that tells a real option from a placeholder. Absent
 *   on the create form, which has no history to read.
 */
export function initialFromProduct(
  p?: Product,
  landedCosts?: Record<number, LandedCostInfo>,
): FormState {
  if (!p) {
    return {
      sellingType: "single",
      name: "",
      categoryId: "",
      description: "",
      price: "",
      discountPrice: "",
      purchaseCost: "",
      stock: "",
      lowStockThreshold: "",
      showStock: true,
      priceColor: "",
      status: "ACTIVE",
      promoBadge: "",
      offerText: "",
      metaTitle: "",
      metaDescription: "",
      isFeatured: false,
      sizeGuideId: "",
      sizeLabel: "",
      sizeChart: "",
      baseSku: "",
      images: [],
      colors: [],
      variants: [],
      accordionSections: [],
    };
  }
  // Only the options that exist for real; the rest are purchase-order scaffolding.
  const variants = realVariants(p, landedCosts);
  // A colour goes with them when it HAD options and every one was a placeholder
  // — a colour nobody ordered a single unit of. A colour carrying no rows at all
  // is left alone: that is a colour someone is part-way through authoring, not
  // fallout from a purchase order.
  const orphanedColors = new Set(
    (p.variants ?? [])
      .map((v) => v.colorName?.trim())
      .filter((name): name is string => !!name)
      .filter((name) => !variants.some((v) => v.colorName?.trim() === name)),
  );
  const imageRows: ImageRow[] = p.images
    .slice()
    .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    .map((i) => ({ url: i.url }));
  return {
    sellingType: sellingTypeOf(p),
    name: p.name,
    categoryId: String(p.categoryId),
    description: p.description ?? "",
    price: p.price,
    discountPrice: p.discountPrice ?? "",
    purchaseCost: p.purchaseCost ?? "",
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold || "",
    showStock: p.showStock ?? true,
    priceColor: p.priceColor ?? "",
    status: p.status,
    promoBadge: p.promoBadge ?? "",
    offerText: p.offerText ?? "",
    metaTitle: p.metaTitle ?? "",
    metaDescription: p.metaDescription ?? "",
    isFeatured: p.isFeatured,
    sizeGuideId: p.sizeGuideId != null ? String(p.sizeGuideId) : "",
    sizeLabel: p.sizeLabel ?? "",
    sizeChart: p.sizeChart ?? "",
    baseSku: p.baseSku ?? "",
    images: imageRows,
    colors: colorsOf(p).filter((c) => !orphanedColors.has(c.name.trim())),
    accordionSections:
      p.accordionSections?.map((s) => ({
        title: s.title,
        icon: s.icon ?? "",
        content: s.content,
        isOpen: s.isOpen,
      })) ?? [],
    // A variant's colour swatch/image used to live in the shared ProductColor
    // list, matched by name. Colours are now entered per row, so backfill hex &
    // image from that list for existing products — the row's own imageUrl wins
    // once it has been set.
    variants:
      variants.map((v) => {
        const swatch = v.colorName ? p.colors?.find((c) => c.name === v.colorName) : undefined;
        // Products saved before ProductVariant.imageUrl existed kept the row's
        // photo in the gallery, tagged with the variant's display label. Nothing
        // reads that tag any more, so pull it onto the row here: the photo shows
        // up in Sizes/Variants, and saving persists it to the new column.
        const label = variantLabelOf(v.colorName, v.size);
        const legacyTagged = label
          ? p.images?.find((i) => i.variantLabel && sameLabel(i.variantLabel, label))?.url
          : undefined;
        return {
          color: v.colorName ?? "",
          colorHex: swatch?.hexCode ?? "#000000",
          imageUrl: v.imageUrl ?? legacyTagged ?? swatch?.imageUrl ?? "",
          size: v.size ?? "",
          // A zero price is NOT a price — it is an option nobody has priced
          // yet, which is exactly how quickCreateProductAction leaves the rows
          // it writes from a purchase order. The form distinguishes the two by
          // blankness (a typed 0 is a decision, an empty box is a gap), so
          // hydrating 0 as "0" would disguise every unpriced option as
          // deliberate. Blank instead: the placeholder shows, "Price from cost"
          // reaches these rows, and the save guard still refuses to publish them.
          price: v.price > 0 ? String(v.price / 100) : "",
          discountPrice: v.discountPrice != null ? String(v.discountPrice / 100) : "",
          stock: String(v.stock),
          showStock: v.showStock ?? true,
          priceColor: v.priceColor ?? "",
          sku: v.sku ?? "",
        };
      }),
  };
}
