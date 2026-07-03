"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBanner, updateBanner, deleteBanner } from "@/server/banners/admin";
import { isBannerSlot } from "@/lib/banner-slots";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
}

export async function saveBanner(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("banners");
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  const slotRaw = String(formData.get("slot") ?? "MAIN");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!imageUrl) return { error: "Image URL is required." };
  if (!isBannerSlot(slotRaw)) return { error: "Please choose which hero card this image is for." };

  if (id) {
    await updateBanner(id, { imageUrl, link: link || null, slot: slotRaw, sortOrder, isActive });
  } else {
    await createBanner({ imageUrl, link: link || null, slot: slotRaw, sortOrder, isActive });
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners");
}

export async function removeBanner(id: number): Promise<ActionResult> {
  await requirePermission("banners");
  await deleteBanner(id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return {};
}
