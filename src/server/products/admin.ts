import type { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/slugify";
import { deleteImage } from "@/integrations/storage";
import { invalidateProductCaches } from "./cache";
import { productInStock, notifyBackInStock } from "./stock-notify";
import { ancestorsOf } from "@/server/categories/tree";
import { recordMovement } from "@/server/inventory/ledger";

/**
 * Raised when a save would destroy stock the shop actually holds. Carries the
 * option labels so the form can name them instead of failing abstractly.
 */
export class ProductStockError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductStockError";
  }
}

/** Raised when a product isn't complete enough to go on the storefront. */
export class ProductPublishError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductPublishError";
  }
}

/**
 * Does this product have a photo ANYWHERE?
 *
 * Deliberately generous about where: a product sold by colour often has an
 * empty gallery because every photo was uploaded onto a colour swatch or a
 * variant row instead (see the note in listAllProducts). Requiring a gallery
 * image specifically would reject products that are, to a shopper, fully
 * illustrated.
 */
function hasAnyImage(input: ProductInput): boolean {
  const gallery = imageRowsFromInput(input) ?? [];
  if (gallery.some((i) => i.url.trim())) return true;
  if (input.colors?.some((c) => c.imageUrl?.trim())) return true;
  if (input.variants?.some((v) => v.imageUrl?.trim())) return true;
  return false;
}

/**
 * Guard the transition ONTO the storefront.
 *
 * Only a product becoming ACTIVE is checked. A product that is already live is
 * grandfathered, because this rule is newer than the catalogue: enforcing it on
 * every save would block editing the products that predate it, which is a
 * regression dressed up as a standard.
 */
function assertPublishable(input: ProductInput, previousStatus: ProductStatus | null): void {
  const goingLive = (input.status ?? "ACTIVE") === "ACTIVE";
  if (!goingLive) return;
  if (previousStatus === "ACTIVE") return; // already published; leave it alone

  const missing: string[] = [];
  if (!hasAnyImage(input)) missing.push("at least one photo");
  if (!(input.price > 0)) missing.push("a price");

  if (missing.length > 0) {
    throw new ProductPublishError(
      `This product needs ${missing.join(" and ")} before it can go on the storefront. ` +
        `Save it as a draft for now, and publish once it's ready.`,
    );
  }
}

// A category listing page shows products from the node AND all its ancestors'
// pages, so a product write must clear the node's slug plus every ancestor's.
async function categorySlugsForInvalidation(categoryId: number): Promise<string[]> {
  const all = await prisma.category.findMany({
    select: { id: true, parentId: true, slug: true },
  });
  const self = all.find((c) => c.id === categoryId);
  if (!self) return [];
  return [self.slug, ...ancestorsOf(categoryId, all).map((c) => c.slug)];
}

export async function listAllProducts() {
  return prisma.product.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      // Photos can live on a variant row or a colour swatch instead of the
      // gallery, so the list thumbnail needs them to fall back on
      // (resolvePrimaryImage) — a variant product often has an empty gallery.
      variants: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } },
      colors: { select: { imageUrl: true }, orderBy: { sortOrder: "asc" } },
      category: true,
    },
  });
}

export async function getProductById(id: number) {
  return prisma.product.findUnique({
    where: { id },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      colors: { orderBy: { sortOrder: "asc" } },
      specifications: { orderBy: { sortOrder: "asc" } },
      features: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { sortOrder: "asc" } },
      accordionSections: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export interface ProductColorInput {
  name: string;
  hexCode: string;
  imageUrl?: string | null;
}

export interface ProductSpecificationInput {
  label: string;
  value: string;
}

/** One collapsible panel in the storefront's "Features & Specs" accordion. */
export interface ProductAccordionSectionInput {
  title: string;
  /** Leading emoji ("⚙️"); null/empty renders the title alone. */
  icon?: string | null;
  /** Markdown body — same pipeline as Product.description. */
  content: string;
  /** Whether the panel starts expanded. */
  isOpen?: boolean;
}

export interface ProductVariantInput {
  /** Size/option label, e.g. "M" or "1 Litre". Null for a colour-only variant. */
  size?: string | null;
  /** Matches a ProductColor.name. Null for a size-only variant (e.g. oil). */
  colorName?: string | null;
  /** Paisa — regular price. */
  price: number;
  /** Paisa — optional sale price (< price). Null/omitted = no discount. */
  discountPrice?: number | null;
  /**
   * OPENING stock only — the units this option starts with. Honoured when the
   * variant row is first created (at product creation, or when a new option is
   * added to an existing product) and recorded as an OPENING movement.
   *
   * IGNORED for an option that already exists: its level belongs to the ledger
   * from that point on, and is changed by a purchase-order receipt or an
   * audited adjustment — never by re-saving the product form.
   */
  stock: number;
  /** Show the stock count on the storefront for this variant. Default true. */
  showStock?: boolean;
  /** Storefront price colour (#rrggbb) for this variant; null inherits the product's. */
  priceColor?: string | null;
  /** Uploaded photo for this option; null = none. */
  imageUrl?: string | null;
  /** Stock-keeping unit for this exact option; unique shop-wide when set. */
  sku?: string | null;
}

export interface ProductImageInput {
  url: string;
  /** Label of the variant this photo shows ("Navy / M"); null = whole product. */
  variantLabel?: string | null;
}

export interface ProductInput {
  name: string;
  /** Any node in the Category tree — root, mid-level, or leaf. */
  categoryId: number;
  description?: string;
  /** Paisa */
  price: number;
  /** Paisa, or null to clear */
  discountPrice?: number | null;
  /**
   * Sourcing/purchase cost per unit (paisa) — the COGS basis.
   *
   * Seeded at creation, then OWNED BY THE LEDGER: receiving a purchase order
   * rewrites it to the landed cost (supplier price + that line's share of
   * freight and customs). updateProduct therefore ignores this field, so a
   * stale number typed into the form can't overwrite what the goods really
   * cost — checkout snapshots this onto OrderItem, and a snapshot can never be
   * corrected after the fact.
   */
  purchaseCost?: number;
  /**
   * OPENING stock — the units already on the shelf when the product is first
   * entered. Recorded as an OPENING movement so the ledger replays from zero.
   * IGNORED by updateProduct: an existing product's level is owned by the
   * ledger (purchase-order receipts and audited adjustments).
   *
   * For a product with variants this is derived from the rows and is not the
   * authoritative figure — each variant carries its own opening stock.
   */
  stock: number;
  /** Low-stock alert threshold; 0 disables. */
  lowStockThreshold?: number;
  /** Show the "In stock (N available)" count on the storefront. Default true. */
  showStock?: boolean;
  /** Storefront price colour (#rrggbb); null/undefined = theme default. */
  priceColor?: string | null;
  isFeatured?: boolean;
  /** DRAFT = created from a purchase order, not finished, never on the storefront. */
  status?: ProductStatus;
  promoBadge?: string | null;
  /** Gradient offer strip copy; shown only while the product is discounted. */
  offerText?: string | null;
  /** Optional SEO overrides; null/undefined → storefront default. */
  metaTitle?: string | null;
  metaDescription?: string | null;
  /** Size guide driving the chips/label/chart; null = inherit the category's. */
  sizeGuideId?: number | null;
  /** Per-product overrides of the resolved guide; null = use the guide's. */
  sizeLabel?: string | null;
  sizeChart?: string | null;
  /** Root of the generated variant SKUs ("SAR" → "SAR-PUR-32"). */
  baseSku?: string | null;
  /** Image URLs in display order; first is primary. */
  imageUrls?: string[];
  /**
   * Images with an optional variant link, in display order; first is primary.
   * When provided this takes precedence over imageUrls (which is kept for
   * callers like the seed script that don't tag images).
   */
  images?: ProductImageInput[];
  colors?: ProductColorInput[];
  specifications?: ProductSpecificationInput[];
  /** Feature bullet points, in display order. */
  features?: string[];
  /**
   * Accordion panels for the "Features & Specs" tab, in display order. When a
   * product has any, they replace the flat description in that tab.
   */
  accordionSections?: ProductAccordionSectionInput[];
  /** Size/option variants (e.g. oil 500ml/1L/5L). Empty/undefined = no variants. */
  variants?: ProductVariantInput[];
}

/** Normalise the two image input shapes; undefined = "don't touch images". */
function imageRowsFromInput(input: ProductInput): ProductImageInput[] | undefined {
  if (input.images) return input.images;
  return input.imageUrls?.map((url) => ({ url }));
}

/**
 * Create a product, with its opening stock written through the ledger.
 *
 * Every row is created at ZERO and then credited by an OPENING movement, rather
 * than being born holding stock. That costs one extra write and buys the thing
 * the old path could never offer: a ledger that replays from zero to today's
 * level for every product created from here on, so
 * scripts/stock-ledger-verify.ts reports a real fault instead of the noise of
 * unexplained starting balances.
 */
export async function createProduct(input: ProductInput, actorName = "system") {
  assertPublishable(input, null);
  const imageRows = imageRowsFromInput(input);
  const product = await prisma.$transaction(async (tx) => {
  const created = await tx.product.create({
    data: {
      name: input.name,
      slug: slugify(input.name),
      categoryId: input.categoryId,
      description: input.description,
      price: input.price,
      discountPrice: input.discountPrice ?? null,
      purchaseCost: input.purchaseCost ?? 0,
      // Opening stock is credited below, through the ledger.
      stock: 0,
      lowStockThreshold: input.lowStockThreshold ?? 0,
      showStock: input.showStock ?? true,
      priceColor: input.priceColor ?? null,
      isFeatured: input.isFeatured ?? false,
      status: input.status ?? "ACTIVE",
      promoBadge: input.promoBadge ?? null,
      offerText: input.offerText ?? null,
      metaTitle: input.metaTitle ?? null,
      metaDescription: input.metaDescription ?? null,
      sizeGuideId: input.sizeGuideId ?? null,
      sizeLabel: input.sizeLabel ?? null,
      sizeChart: input.sizeChart ?? null,
      baseSku: input.baseSku ?? null,
      images: imageRows?.length
        ? {
            createMany: {
              data: imageRows.map((img, i) => ({
                url: img.url,
                variantLabel: img.variantLabel ?? null,
                isPrimary: i === 0,
                sortOrder: i,
              })),
            },
          }
        : undefined,
      colors: input.colors?.length
        ? {
            createMany: {
              data: input.colors.map((c, i) => ({
                name: c.name,
                hexCode: c.hexCode,
                imageUrl: c.imageUrl ?? null,
                sortOrder: i,
              })),
            },
          }
        : undefined,
      specifications: input.specifications?.length
        ? {
            createMany: {
              data: input.specifications.map((s, i) => ({
                label: s.label,
                value: s.value,
                sortOrder: i,
              })),
            },
          }
        : undefined,
      features: input.features?.length
        ? {
            createMany: {
              data: input.features.map((text, i) => ({ text, sortOrder: i })),
            },
          }
        : undefined,
      accordionSections: input.accordionSections?.length
        ? {
            createMany: {
              data: input.accordionSections.map((s, i) => ({
                title: s.title,
                icon: s.icon ?? null,
                content: s.content,
                isOpen: s.isOpen ?? false,
                sortOrder: i,
              })),
            },
          }
        : undefined,
      variants: input.variants?.length
        ? {
            createMany: {
              data: input.variants.map((v, i) => ({
                size: v.size ?? null,
                colorName: v.colorName ?? null,
                price: v.price,
                discountPrice: v.discountPrice ?? null,
                // Opening stock is credited below, through the ledger.
                stock: 0,
                showStock: v.showStock ?? true,
                priceColor: v.priceColor ?? null,
                imageUrl: v.imageUrl ?? null,
                sku: v.sku ?? null,
                sortOrder: i,
              })),
            },
          }
        : undefined,
    },
    include: { variants: { orderBy: { sortOrder: "asc" } } },
  });

    // Credit the opening balances. A sized product holds its units on the
    // variants, so the product row is only credited when it has none —
    // crediting both would double-count the same goods.
    if (created.variants.length > 0) {
      const openings = input.variants ?? [];
      for (const [i, variant] of created.variants.entries()) {
        const qty = Math.max(0, Math.floor(openings[i]?.stock ?? 0));
        if (qty === 0) continue;
        await recordMovement(tx, {
          productId: created.id,
          variantId: variant.id,
          type: "OPENING",
          delta: qty,
          unitCost: variant.purchaseCost || created.purchaseCost || null,
          reason: "Opening stock",
          actorName,
        });
      }
    } else if (input.stock > 0) {
      await recordMovement(tx, {
        productId: created.id,
        type: "OPENING",
        delta: Math.floor(input.stock),
        unitCost: created.purchaseCost || null,
        reason: "Opening stock",
        actorName,
      });
    }

    return created;
  });

  await invalidateProductCaches({
    productId: product.id,
    slug: product.slug,
    categorySlugs: await categorySlugsForInvalidation(input.categoryId),
  });

  return product;
}

/**
 * Identity of a variant ACROSS SAVES.
 *
 * A SKU is the real identifier when one exists — it survives a colour being
 * renamed or a size being relabelled. Otherwise the (colour, size) pair is what
 * the admin actually manipulates in the matrix, and it is what the form itself
 * matches on when it regenerates rows (see form/variant-utils.ts), so the two
 * sides agree on what "the same option" means.
 */
function variantKey(v: { sku?: string | null; colorName?: string | null; size?: string | null }): string {
  const sku = v.sku?.trim().toUpperCase();
  if (sku) return `sku:${sku}`;
  return `cs:${(v.colorName ?? "").trim().toLowerCase()}|${(v.size ?? "").trim().toLowerCase()}`;
}

/** Human label for an option, for error messages: "Navy / M". */
function variantLabel(v: { colorName?: string | null; size?: string | null }): string {
  return [v.colorName, v.size].filter(Boolean).join(" / ") || "Option";
}

/**
 * Reconcile a product's variants IN PLACE, preserving their identity.
 *
 * This used to be `deleteMany` + `createMany`, which was correct for the
 * catalogue fields and catastrophic for everything anchored to a variant id:
 *
 *   • `reserved` was destroyed, so units promised to unshipped orders silently
 *     became sellable again — the same unit could be sold twice;
 *   • `stock` survived only because the form happened to round-trip it;
 *   • StockMovement.variantId and PurchaseOrderLine.variantId are SetNull, so
 *     every save detached that option's ledger history and cut the purchase
 *     order's link to the exact thing it ordered.
 *
 * So: matched rows are UPDATED (catalogue fields only — never stock, never
 * reserved), genuinely new options are created, and a removed option is deleted
 * only when it holds nothing. Removing an option that still has stock or
 * reservations is refused rather than absorbed, because there is no correct
 * silent answer — the goods are either on a shelf or promised to a customer.
 */
async function syncVariants(
  tx: Prisma.TransactionClient,
  productId: number,
  incoming: ProductVariantInput[],
  actorName: string,
): Promise<void> {
  const existing = await tx.productVariant.findMany({ where: { productId } });
  const byKey = new Map(existing.map((v) => [variantKey(v), v]));
  // Cost basis for any opening movement below. A brand-new variant row has no
  // cost of its own yet (a PO receipt sets that), so it values its opening
  // units at the product's current sourcing cost — the same fallback checkout
  // uses when a variant's purchaseCost is 0.
  const { purchaseCost: productCost } = await tx.product.findUniqueOrThrow({
    where: { id: productId },
    select: { purchaseCost: true },
  });

  const keptIds = new Set<number>();
  // Opening stock for options created during this save, credited after the
  // rows exist so recordMovement can address them by id.
  const openings: { variantId: number; qty: number; unitCost: number }[] = [];

  for (const [i, v] of incoming.entries()) {
    const match = byKey.get(variantKey(v));

    // Catalogue fields only. `stock` and `reserved` are deliberately absent:
    // from the moment a row exists, its level belongs to the ledger.
    const fields = {
      size: v.size ?? null,
      colorName: v.colorName ?? null,
      price: v.price,
      discountPrice: v.discountPrice ?? null,
      showStock: v.showStock ?? true,
      priceColor: v.priceColor ?? null,
      imageUrl: v.imageUrl ?? null,
      sku: v.sku ?? null,
      sortOrder: i,
    };

    // A row may only claim an existing variant once. Without this, two
    // submitted rows that resolve to the same variant (one matching by SKU, one
    // by colour+size) would both update it and the second option would vanish
    // instead of being created.
    if (match && !keptIds.has(match.id)) {
      keptIds.add(match.id);
      await tx.productVariant.update({ where: { id: match.id }, data: fields });
    } else {
      const created = await tx.productVariant.create({
        data: { productId, ...fields, stock: 0 },
      });
      const qty = Math.max(0, Math.floor(v.stock ?? 0));
      if (qty > 0) {
        openings.push({ variantId: created.id, qty, unitCost: created.purchaseCost || productCost });
      }
    }
  }

  const removed = existing.filter((v) => !keptIds.has(v.id));
  const holding = removed.filter((v) => v.stock > 0 || v.reserved > 0);
  if (holding.length > 0) {
    const named = holding
      .map((v) => `${variantLabel(v)} (${v.stock} on hand${v.reserved > 0 ? `, ${v.reserved} reserved` : ""})`)
      .join("; ");
    throw new ProductStockError(
      `Can't remove an option that still holds stock: ${named}. ` +
        `Write the stock off from the Stock panel first, or leave the option in place.`,
    );
  }
  if (removed.length > 0) {
    await tx.productVariant.deleteMany({ where: { id: { in: removed.map((v) => v.id) } } });
  }

  for (const o of openings) {
    await recordMovement(tx, {
      productId,
      variantId: o.variantId,
      type: "OPENING",
      delta: o.qty,
      unitCost: o.unitCost || null,
      reason: "Opening stock — new option",
      actorName,
    });
  }
}

/**
 * Update a product's CATALOGUE data.
 *
 * `stock` and `purchaseCost` are not written here, and that is the whole point:
 * this closes the old KNOWN LEDGER GAP, where retyping the stock number changed
 * the level with no StockMovement to explain it, and where a stale sourcing
 * cost could overwrite the landed cost a purchase-order receipt had just
 * calculated. Stock now changes only through the ledger (a PO receipt or an
 * audited adjustment), and cost only through a receipt.
 */
export async function updateProduct(id: number, input: ProductInput, actorName = "system") {
  const before = await prisma.product.findUnique({
    where: { id },
    include: { category: true },
  });
  assertPublishable(input, before?.status ?? null);
  // Snapshot stock state before the edit, to detect an out-of-stock → in-stock
  // transition that should fire "back in stock" alerts.
  const wasInStock = await productInStock(id);

  const product = await prisma.$transaction(async (tx) => {
    const updated = await tx.product.update({
      where: { id },
      data: {
        name: input.name,
        slug: slugify(input.name),
        categoryId: input.categoryId,
        description: input.description,
        price: input.price,
        discountPrice: input.discountPrice ?? null,
        // purchaseCost and stock are intentionally NOT written here — see the
        // doc comment above. They are owned by the ledger.
        lowStockThreshold: input.lowStockThreshold ?? 0,
        showStock: input.showStock ?? true,
        priceColor: input.priceColor ?? null,
        isFeatured: input.isFeatured ?? false,
        status: input.status ?? "ACTIVE",
        promoBadge: input.promoBadge ?? null,
        offerText: input.offerText ?? null,
        metaTitle: input.metaTitle ?? null,
        metaDescription: input.metaDescription ?? null,
        sizeGuideId: input.sizeGuideId ?? null,
        sizeLabel: input.sizeLabel ?? null,
        sizeChart: input.sizeChart ?? null,
        baseSku: input.baseSku ?? null,
      },
    });

    const imageRows = imageRowsFromInput(input);
    if (imageRows) {
      await tx.productImage.deleteMany({ where: { productId: id } });
      if (imageRows.length > 0) {
        await tx.productImage.createMany({
          data: imageRows.map((img, i) => ({
            productId: id,
            url: img.url,
            variantLabel: img.variantLabel ?? null,
            isPrimary: i === 0,
            sortOrder: i,
          })),
        });
      }
    }

    if (input.colors) {
      await tx.productColor.deleteMany({ where: { productId: id } });
      if (input.colors.length > 0) {
        await tx.productColor.createMany({
          data: input.colors.map((c, i) => ({
            productId: id,
            name: c.name,
            hexCode: c.hexCode,
            imageUrl: c.imageUrl ?? null,
            sortOrder: i,
          })),
        });
      }
    }

    if (input.specifications) {
      await tx.productSpecification.deleteMany({ where: { productId: id } });
      if (input.specifications.length > 0) {
        await tx.productSpecification.createMany({
          data: input.specifications.map((s, i) => ({
            productId: id,
            label: s.label,
            value: s.value,
            sortOrder: i,
          })),
        });
      }
    }

    if (input.features) {
      await tx.productFeature.deleteMany({ where: { productId: id } });
      if (input.features.length > 0) {
        await tx.productFeature.createMany({
          data: input.features.map((text, i) => ({ productId: id, text, sortOrder: i })),
        });
      }
    }

    // Replace the whole accordion set — sortOrder is positional, so a reorder
    // in the builder is just a different array order here.
    if (input.accordionSections) {
      await tx.productAccordionSection.deleteMany({ where: { productId: id } });
      if (input.accordionSections.length > 0) {
        await tx.productAccordionSection.createMany({
          data: input.accordionSections.map((s, i) => ({
            productId: id,
            title: s.title,
            icon: s.icon ?? null,
            content: s.content,
            isOpen: s.isOpen ?? false,
            sortOrder: i,
          })),
        });
      }
    }

    // Reconcile in place rather than replacing the set — a variant id is
    // referenced by reservations, the stock ledger and open purchase orders.
    if (input.variants) {
      await syncVariants(tx, id, input.variants, actorName);
    }

    return updated;
  });

  const categorySlugs = await categorySlugsForInvalidation(input.categoryId);
  // If the product moved to a different node, also clear the old node's chain.
  const previousCategorySlugs =
    before && before.categoryId !== input.categoryId
      ? await categorySlugsForInvalidation(before.categoryId)
      : undefined;
  await invalidateProductCaches({
    productId: product.id,
    slug: product.slug,
    previousSlug: before?.slug !== product.slug ? before?.slug : undefined,
    categorySlugs,
    previousCategorySlugs,
  });

  // Restock alert: if this edit took the product from out-of-stock to
  // in-stock, notify everyone who asked. Fire-and-forget — never block the save.
  if (!wasInStock && (await productInStock(id))) {
    notifyBackInStock(id).catch((err) =>
      console.error("[products] back-in-stock notify failed:", err),
    );
  }

  return product;
}

export async function deleteProduct(id: number) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      images: { select: { url: true } },
      colors: { select: { imageUrl: true } },
    },
  });

  await prisma.product.delete({ where: { id } });

  if (product) {
    await invalidateProductCaches({
      productId: product.id,
      slug: product.slug,
      categorySlugs: await categorySlugsForInvalidation(product.categoryId),
    });
    // Best-effort cleanup of stored objects (no-ops for seed/external URLs).
    const urls = [
      ...product.images.map((i) => i.url),
      ...product.colors.map((c) => c.imageUrl).filter((u): u is string => !!u),
    ];
    await Promise.all(urls.map((u) => deleteImage(u)));
  }
}
