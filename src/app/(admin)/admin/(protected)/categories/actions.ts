"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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
  const name = String(formData.get("name") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!name) return { error: "Name is required." };

  if (id) {
    await updateCategory(id, { name, sortOrder, isActive });
  } else {
    await createCategory({ name, sortOrder, isActive });
  }

  revalidatePath("/admin/categories");
  revalidatePath("/category");
  redirect("/admin/categories");
}

export async function removeCategory(id: number): Promise<ActionResult> {
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
  const name = String(formData.get("name") ?? "").trim();
  const categoryId = Number(formData.get("categoryId"));
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!name) return { error: "Name is required." };
  if (!categoryId) return { error: "Category is required." };

  if (id) {
    await updateSubcategory(id, { name, categoryId, sortOrder, isActive });
  } else {
    await createSubcategory({ name, categoryId, sortOrder, isActive });
  }

  revalidatePath("/admin/categories");
  return {};
}

export async function removeSubcategory(id: number): Promise<ActionResult> {
  try {
    await deleteSubcategory(id);
  } catch {
    return { error: "Could not delete — this subcategory still has products." };
  }
  revalidatePath("/admin/categories");
  return {};
}
