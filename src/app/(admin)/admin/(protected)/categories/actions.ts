"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  createSubcategory,
  updateSubcategory,
  deleteSubcategory,
} from "@/server/categories/admin";

export interface ActionResult {
  error?: string;
}

export async function saveCategory(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("categories");
  const name = String(formData.get("name") ?? "").trim();
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription = String(formData.get("metaDescription") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };

  const data = { name, imageUrl, description, sortOrder, isActive, metaTitle, metaDescription };
  if (id) {
    await updateCategory(id, data);
  } else {
    await createCategory(data);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/category");
  return {};
}

export async function removeCategory(id: number): Promise<ActionResult> {
  await requirePermission("categories");
  try {
    await deleteCategory(id);
  } catch {
    return {
      error:
        "Could not delete — this category still has subcategories or products. Remove those first.",
    };
  }
  revalidatePath("/admin/categories");
  return {};
}

export async function saveSubcategory(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("categories");
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = Number(formData.get("categoryId"));
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!name) return { error: "Name is required." };
  if (!categoryId) return { error: "Category is required." };

  const data = { name, categoryId, imageUrl, description, sortOrder, isActive };
  if (id) {
    await updateSubcategory(id, data);
  } else {
    await createSubcategory(data);
  }

  revalidatePath("/admin/categories");
  revalidatePath("/category");
  return {};
}

export async function removeSubcategory(id: number): Promise<ActionResult> {
  await requirePermission("categories");
  try {
    await deleteSubcategory(id);
  } catch {
    return { error: "Could not delete — this subcategory still has products." };
  }
  revalidatePath("/admin/categories");
  return {};
}
