/**
 * Seeds the product form's state — a blank product, or an existing one mapped
 * out of the shape `getProductById` returns. Carries the backfill rules for
 * products saved before variant rows owned their own colour hex and photo.
 */

import { sameLabel, variantLabelOf } from "./helpers";
import type { ColorRow, FormState, ImageRow, Product, SellingType } from "./types";

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

export function initialFromProduct(p?: Product): FormState {
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
    metaTitle: p.metaTitle ?? "",
    metaDescription: p.metaDescription ?? "",
    isFeatured: p.isFeatured,
    sizeGuideId: p.sizeGuideId != null ? String(p.sizeGuideId) : "",
    sizeLabel: p.sizeLabel ?? "",
    sizeChart: p.sizeChart ?? "",
    baseSku: p.baseSku ?? "",
    images: imageRows,
    colors: colorsOf(p),
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
      p.variants?.map((v) => {
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
          price: String(v.price / 100),
          discountPrice: v.discountPrice != null ? String(v.discountPrice / 100) : "",
          stock: String(v.stock),
          showStock: v.showStock ?? true,
          priceColor: v.priceColor ?? "",
          sku: v.sku ?? "",
        };
      }) ?? [],
  };
}
