"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  getCategoryDeleteImpact,
  moveCategorySibling,
} from "@/server/categories/admin";
import type { DeleteImpact } from "@/server/categories/tree";

export interface ActionResult {
  error?: string;
}

/** Result of a delete attempt: succeeded, or blocked with the affected counts. */
export type DeleteResult =
  | { ok: true }
  | ({ ok: false; blocked: true } & DeleteImpact)
  | { ok: false; blocked: false; error: string };

/**
 * Create or update a category node. `parentId` (from the form) decides where it
 * sits in the tree: absent/empty → a root; otherwise a child of that node.
 */
export async function saveCategory(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("categories");
  const name = String(formData.get("name") ?? "").trim();
  const parentRaw = String(formData.get("parentId") ?? "").trim();
  const parentId = parentRaw ? Number(parentRaw) : null;
  const imageUrl = String(formData.get("imageUrl") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";
  const metaTitle = String(formData.get("metaTitle") ?? "").trim() || null;
  const metaDescription = String(formData.get("metaDescription") ?? "").trim() || null;

  if (!name) return { error: "Name is required." };
  if (parentId != null && Number.isNaN(parentId)) return { error: "Invalid parent category." };

  const data = { name, parentId, imageUrl, description, sortOrder, isActive, metaTitle, metaDescription };
  try {
    if (id) {
      await updateCategory(id, data);
    } else {
      await createCategory(data);
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the category." };
  }

  revalidatePath("/admin/categories");
  revalidatePath("/category");
  return {};
}

/** Preview what deleting this node would affect — called before confirming. */
export async function getDeleteImpact(id: number): Promise<DeleteImpact> {
  await requirePermission("categories");
  return getCategoryDeleteImpact(id);
}

export async function removeCategory(id: number): Promise<DeleteResult> {
  await requirePermission("categories");
  // Re-check impact server-side (never trust the client's preview) and refuse
  // to delete anything that still has sub-categories or products.
  const impact = await getCategoryDeleteImpact(id);
  if (impact.descendantCount > 0 || impact.productCount > 0) {
    return { ok: false, blocked: true, ...impact };
  }
  try {
    await deleteCategory(id);
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      error: err instanceof Error ? err.message : "Could not delete this category.",
    };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/category");
  return { ok: true };
}

export async function moveCategory(id: number, direction: "up" | "down"): Promise<ActionResult> {
  await requirePermission("categories");
  try {
    await moveCategorySibling(id, direction);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not reorder the category." };
  }
  revalidatePath("/admin/categories");
  revalidatePath("/category");
  return {};
}
