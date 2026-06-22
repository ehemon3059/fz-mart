"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { takaToPaisa } from "@/lib/money";
import { createProduct, updateProduct, deleteProduct } from "@/server/products/admin";

export interface ActionResult {
  error?: string;
}

function parseImageUrls(formData: FormData): string[] {
  const raw = String(formData.get("imageUrls") ?? "");
  return raw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function saveProduct(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const subcategoryId = Number(formData.get("subcategoryId"));
  const description = String(formData.get("description") ?? "").trim();
  const priceTaka = Number(formData.get("price"));
  const discountPriceTaka = formData.get("discountPrice")
    ? Number(formData.get("discountPrice"))
    : null;
  const stock = Number(formData.get("stock"));
  const isFeatured = formData.get("isFeatured") === "on";
  const status = formData.get("status") === "INACTIVE" ? "INACTIVE" : "ACTIVE";
  const promoBadge = String(formData.get("promoBadge") ?? "").trim();
  const imageUrls = parseImageUrls(formData);

  if (!name) return { error: "Name is required." };
  if (!subcategoryId) return { error: "Subcategory is required." };
  if (!Number.isFinite(priceTaka) || priceTaka <= 0) {
    return { error: "Price must be a positive number." };
  }
  if (discountPriceTaka != null && discountPriceTaka >= priceTaka) {
    return { error: "Discount price must be lower than the regular price." };
  }
  if (!Number.isFinite(stock) || stock < 0) {
    return { error: "Stock must be zero or a positive number." };
  }

  const input = {
    name,
    subcategoryId,
    description,
    price: takaToPaisa(priceTaka),
    discountPrice: discountPriceTaka != null ? takaToPaisa(discountPriceTaka) : null,
    stock,
    isFeatured,
    status: status as "ACTIVE" | "INACTIVE",
    promoBadge: promoBadge || null,
    imageUrls,
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
  await deleteProduct(id);
  revalidatePath("/admin/products");
  revalidatePath("/");
  return {};
}
