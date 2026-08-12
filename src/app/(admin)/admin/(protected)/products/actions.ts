"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { takaToPaisa } from "@/lib/money";
import { requirePermission } from "@/server/admin/guard";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductAccordionSectionInput,
  type ProductColorInput,
  type ProductImageInput,
  type ProductSpecificationInput,
  type ProductVariantInput,
} from "@/server/products/admin";

export interface ActionResult {
  error?: string;
  fieldErrors?: Record<string, string>;
}

function parseImageUrls(formData: FormData): string[] {
  const raw = String(formData.get("imageUrls") ?? "");
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Images arrive as JSON: [{ url, variantLabel }]. variantLabel ties a photo to
 * a variant row by its display label ("Navy / M"); it's validated against the
 * submitted variants after parsing (see saveProduct) so a stale label from a
 * deleted row is never persisted. Falls back to the legacy newline-delimited
 * imageUrls field when absent.
 */
function parseImages(formData: FormData): ProductImageInput[] {
  const raw = String(formData.get("images") ?? "");
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((i): i is { url: string; variantLabel?: unknown } => typeof i?.url === "string")
          .map((i) => ({
            url: i.url.trim(),
            variantLabel:
              typeof i.variantLabel === "string" && i.variantLabel.trim() ? i.variantLabel.trim() : null,
          }))
          .filter((i) => i.url);
      }
    } catch {
      // fall through to the legacy field
    }
  }
  return parseImageUrls(formData).map((url) => ({ url }));
}

function parseFeatures(formData: FormData): string[] {
  const raw = String(formData.get("features") ?? "");
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Accept only a literal #rrggbb colour. This value is rendered into an inline
 * `style` attribute on the storefront, so anything else — a CSS function, a
 * url(), a stray `;` closing the declaration — must never reach the DB.
 * Returns null for blank/invalid input, which the storefront reads as
 * "use the theme default".
 */
function parseHexColor(value: FormDataEntryValue | null): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : null;
}

/**
 * A photo URL produced by /api/admin/upload — either a local "/uploads/..."
 * path or an absolute https:// URL from configured object storage. Anything
 * else (javascript:, data:, a protocol-relative host) is rejected: these are
 * rendered straight into `src` on the storefront.
 */
function parseUploadedImage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (raw.startsWith("/") && !raw.startsWith("//")) return raw;
  return /^https:\/\//i.test(raw) ? raw : null;
}

/** Colors/specs are submitted as JSON arrays — simple rows, no reason for a line-delimited format. */
function parseColors(formData: FormData): ProductColorInput[] {
  const raw = String(formData.get("colors") ?? "[]");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is ProductColorInput => typeof c?.name === "string" && typeof c?.hexCode === "string")
      .map((c) => ({ name: c.name.trim(), hexCode: c.hexCode.trim(), imageUrl: c.imageUrl?.trim() || null }))
      .filter((c) => c.name && c.hexCode);
  } catch {
    return [];
  }
}

/**
 * Variants arrive as JSON: { size, colorName, price (taka), discountPrice (taka),
 * stock, showStock }. Prices → paisa here. A row needs at least a size or a
 * colour, and price > 0. A discount is only kept when it's a positive amount
 * below the regular price.
 */
function parseVariants(formData: FormData): ProductVariantInput[] {
  const raw = String(formData.get("variants") ?? "[]");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => {
        const price = takaToPaisa(Number(v?.price) || 0);
        const rawDiscount = Number(v?.discountPrice);
        const discountPaisa =
          Number.isFinite(rawDiscount) && rawDiscount > 0 ? takaToPaisa(rawDiscount) : null;
        return {
          size: typeof v?.size === "string" && v.size.trim() ? v.size.trim() : null,
          colorName:
            typeof v?.colorName === "string" && v.colorName.trim() ? v.colorName.trim() : null,
          price,
          // Ignore a discount that isn't strictly below the regular price.
          discountPrice: discountPaisa != null && discountPaisa < price ? discountPaisa : null,
          stock: Math.max(0, Math.floor(Number(v?.stock) || 0)),
          showStock: v?.showStock !== false,
          priceColor: parseHexColor(v?.priceColor ?? null),
          imageUrl: parseUploadedImage(v?.imageUrl ?? null),
          // Generated from the product's baseSku, or typed. Kept verbatim
          // (minus surrounding space) so a re-save round-trips it unchanged.
          sku: typeof v?.sku === "string" && v.sku.trim() ? v.sku.trim().slice(0, 64) : null,
        };
      })
      .filter((v) => (v.size || v.colorName) && v.price > 0);
  } catch {
    return [];
  }
}

/**
 * Accordion panels arrive as JSON: { title, icon, content, isOpen }. A panel
 * needs a title and a body — blank rows the admin never filled in are dropped
 * rather than saved as empty accordion headers. Array order IS display order
 * (the server assigns sortOrder positionally).
 *
 * The Markdown body is NOT sanitised here: it goes through the same
 * renderMarkdown pipeline as Product.description, which handles escaping.
 */
function parseAccordionSections(formData: FormData): ProductAccordionSectionInput[] {
  const raw = String(formData.get("accordionSections") ?? "[]");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (s): s is { title: string; content: string; icon?: unknown; isOpen?: unknown } =>
          typeof s?.title === "string" && typeof s?.content === "string",
      )
      .map((s) => ({
        title: s.title.trim(),
        icon: typeof s.icon === "string" && s.icon.trim() ? s.icon.trim() : null,
        content: s.content.trim(),
        isOpen: s.isOpen === true,
      }))
      .filter((s) => s.title && s.content);
  } catch {
    return [];
  }
}

function parseSpecifications(formData: FormData): ProductSpecificationInput[] {
  const raw = String(formData.get("specifications") ?? "[]");
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is ProductSpecificationInput => typeof s?.label === "string" && typeof s?.value === "string")
      .map((s) => ({ label: s.label.trim(), value: s.value.trim() }))
      .filter((s) => s.label && s.value);
  } catch {
    return [];
  }
}

export async function saveProduct(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("products");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = Number(formData.get("categoryId"));
  const description = String(formData.get("description") ?? "").trim();
  const priceTaka = Number(formData.get("price"));
  const discountPriceTaka = formData.get("discountPrice")
    ? Number(formData.get("discountPrice"))
    : null;
  const purchaseCostTaka = formData.get("purchaseCost")
    ? Number(formData.get("purchaseCost"))
    : 0;
  const stock = Number(formData.get("stock"));
  const lowStockThreshold = Number(formData.get("lowStockThreshold") ?? 0);
  const showStock = formData.get("showStock") !== "false";
  const priceColor = parseHexColor(formData.get("priceColor"));
  const isFeatured = formData.get("isFeatured") === "on";
  const status = formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const promoBadge = String(formData.get("promoBadge") ?? "").trim();
  // Offer strip copy. Capped so a runaway paste can't blow out the buy box; the
  // storefront renders it as text, never as markup.
  const offerText = String(formData.get("offerText") ?? "").trim().slice(0, 120);
  const metaTitle = String(formData.get("metaTitle") ?? "").trim();
  const metaDescription = String(formData.get("metaDescription") ?? "").trim();
  // Sizing: a guide id (blank = inherit the category's) plus optional one-off
  // overrides of its label and chart.
  const sizeGuideRaw = String(formData.get("sizeGuideId") ?? "").trim();
  const sizeGuideId = sizeGuideRaw && Number.isFinite(Number(sizeGuideRaw)) ? Number(sizeGuideRaw) : null;
  const sizeLabel = String(formData.get("sizeLabel") ?? "").trim() || null;
  const sizeChart = String(formData.get("sizeChart") ?? "").trim() || null;
  const baseSku = String(formData.get("baseSku") ?? "").trim().slice(0, 32) || null;
  const colors = parseColors(formData);
  const specifications = parseSpecifications(formData);
  const features = parseFeatures(formData);
  const accordionSections = parseAccordionSections(formData);
  const variants = parseVariants(formData);
  // Drop any image→variant link whose label no longer matches a submitted
  // variant row (row deleted/renamed since the photo was tagged).
  const variantLabels = new Set(
    variants.map((v) => [v.colorName, v.size].filter(Boolean).join(" / ")),
  );
  const images = parseImages(formData).map((img) => ({
    url: img.url,
    variantLabel: img.variantLabel && variantLabels.has(img.variantLabel) ? img.variantLabel : null,
  }));

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Name is required.";
  if (!categoryId) fieldErrors.categoryId = "Please select a category.";
  if (!Number.isFinite(priceTaka) || priceTaka <= 0) {
    fieldErrors.price = "Price must be a positive number.";
  }
  if (discountPriceTaka != null && discountPriceTaka >= priceTaka) {
    fieldErrors.discountPrice = "Discount price must be lower than the regular price.";
  }
  if (!Number.isFinite(stock) || stock < 0) {
    fieldErrors.stock = "Stock must be zero or a positive number.";
  }
  if (!Number.isFinite(purchaseCostTaka) || purchaseCostTaka < 0) {
    fieldErrors.purchaseCost = "Sourcing cost must be zero or a positive number.";
  }
  if (Object.keys(fieldErrors).length) return { fieldErrors };

  const input = {
    name,
    categoryId,
    description,
    price: takaToPaisa(priceTaka),
    discountPrice: discountPriceTaka != null ? takaToPaisa(discountPriceTaka) : null,
    purchaseCost: takaToPaisa(purchaseCostTaka),
    stock,
    lowStockThreshold: Number.isFinite(lowStockThreshold) && lowStockThreshold > 0 ? Math.floor(lowStockThreshold) : 0,
    showStock,
    priceColor,
    isFeatured,
    status: status as "ACTIVE" | "INACTIVE",
    promoBadge: promoBadge || null,
    offerText: offerText || null,
    metaTitle: metaTitle || null,
    metaDescription: metaDescription || null,
    sizeGuideId,
    sizeLabel,
    sizeChart,
    baseSku,
    images,
    colors,
    specifications,
    features,
    accordionSections,
    variants,
  };

  try {
    if (id) {
      await updateProduct(id, input);
    } else {
      await createProduct(input);
    }
  } catch (err) {
    // ProductVariant.sku is unique shop-wide: a clash means this SKU already
    // belongs to another product, which is worth naming rather than throwing.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const target = String((err.meta as { target?: string } | undefined)?.target ?? "");
      if (target.includes("sku")) {
        return { fieldErrors: { variants: "One of these SKUs is already used by another product." } };
      }
    }
    throw err;
  }

  revalidatePath("/admin/products");
  revalidatePath("/");
  redirect("/admin/products");
}

export async function removeProduct(id: number): Promise<ActionResult> {
  await requirePermission("products");
  try {
    await deleteProduct(id);
  } catch {
    return { error: "Could not delete product. It may be referenced by existing orders." };
  }
  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}
