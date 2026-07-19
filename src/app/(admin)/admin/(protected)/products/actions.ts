"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { takaToPaisa } from "@/lib/money";
import { requirePermission } from "@/server/admin/guard";
import {
  createProduct,
  updateProduct,
  deleteProduct,
  type ProductColorInput,
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

function parseFeatures(formData: FormData): string[] {
  const raw = String(formData.get("features") ?? "");
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
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
        };
      })
      .filter((v) => (v.size || v.colorName) && v.price > 0);
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
  const subcategoryId = Number(formData.get("subcategoryId"));
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
  const isFeatured = formData.get("isFeatured") === "on";
  const status = formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const promoBadge = String(formData.get("promoBadge") ?? "").trim();
  const metaTitle = String(formData.get("metaTitle") ?? "").trim();
  const metaDescription = String(formData.get("metaDescription") ?? "").trim();
  const imageUrls = parseImageUrls(formData);
  const colors = parseColors(formData);
  const specifications = parseSpecifications(formData);
  const features = parseFeatures(formData);
  const variants = parseVariants(formData);

  const fieldErrors: Record<string, string> = {};
  if (!name) fieldErrors.name = "Name is required.";
  if (!subcategoryId) fieldErrors.subcategoryId = "Please select a category.";
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
    subcategoryId,
    description,
    price: takaToPaisa(priceTaka),
    discountPrice: discountPriceTaka != null ? takaToPaisa(discountPriceTaka) : null,
    purchaseCost: takaToPaisa(purchaseCostTaka),
    stock,
    lowStockThreshold: Number.isFinite(lowStockThreshold) && lowStockThreshold > 0 ? Math.floor(lowStockThreshold) : 0,
    showStock,
    isFeatured,
    status: status as "ACTIVE" | "INACTIVE",
    promoBadge: promoBadge || null,
    metaTitle: metaTitle || null,
    metaDescription: metaDescription || null,
    imageUrls,
    colors,
    specifications,
    features,
    variants,
  };

  if (id) {
    await updateProduct(id, input);
  } else {
    await createProduct(input);
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
