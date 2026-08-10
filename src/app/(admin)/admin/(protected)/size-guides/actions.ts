"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import {
  createSizeGuide,
  deleteSizeGuide,
  getSizeGuideUsage,
  updateSizeGuide,
  type SizeGuideUsage,
} from "@/server/size-guides/admin";

export interface ActionResult {
  error?: string;
}

/** Delete outcome: done, or blocked with what still points at the guide. */
export type DeleteResult =
  | { ok: true }
  | ({ ok: false; blocked: true } & SizeGuideUsage)
  | { ok: false; blocked: false; error: string };

/**
 * Create or update a guide. Values arrive as one JSON array of strings, in the
 * order the admin arranged the chips — that order IS the storefront order.
 */
export async function saveSizeGuide(id: number | null, formData: FormData): Promise<ActionResult> {
  await requirePermission("products");

  const name = String(formData.get("name") ?? "").trim();
  const sizeLabel = String(formData.get("sizeLabel") ?? "").trim() || null;
  const chart = String(formData.get("chart") ?? "").trim() || null;
  const isActive = formData.get("isActive") === "on";

  let values: string[] = [];
  try {
    const parsed = JSON.parse(String(formData.get("values") ?? "[]"));
    if (Array.isArray(parsed)) values = parsed.filter((v): v is string => typeof v === "string");
  } catch {
    return { error: "Could not read the size list." };
  }

  if (!name) return { error: "Name is required." };
  if (values.length === 0) return { error: "Add at least one size." };

  try {
    if (id) await updateSizeGuide(id, { name, sizeLabel, chart, isActive, values });
    else await createSizeGuide({ name, sizeLabel, chart, isActive, values });
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not save the size guide." };
  }

  revalidatePath("/admin/size-guides");
  return {};
}

/** What still uses this guide — checked before offering to delete it. */
export async function getUsage(id: number): Promise<SizeGuideUsage> {
  await requirePermission("products");
  return getSizeGuideUsage(id);
}

export async function removeSizeGuide(id: number): Promise<DeleteResult> {
  await requirePermission("products");
  // Re-check server-side; never trust the client's preview.
  const usage = await getSizeGuideUsage(id);
  if (usage.categoryCount > 0 || usage.productCount > 0) {
    return { ok: false, blocked: true, ...usage };
  }
  try {
    await deleteSizeGuide(id);
  } catch (err) {
    return {
      ok: false,
      blocked: false,
      error: err instanceof Error ? err.message : "Could not delete this size guide.",
    };
  }
  revalidatePath("/admin/size-guides");
  return { ok: true };
}
