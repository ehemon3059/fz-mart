"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createBanner, updateBanner, deleteBanner } from "@/server/banners/admin";

export interface ActionResult {
  error?: string;
}

export async function saveBanner(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  const imageUrl = String(formData.get("imageUrl") ?? "").trim();
  const link = String(formData.get("link") ?? "").trim();
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!imageUrl) return { error: "Image URL is required." };

  if (id) {
    await updateBanner(id, { imageUrl, link: link || null, sortOrder, isActive });
  } else {
    await createBanner({ imageUrl, link: link || null, sortOrder, isActive });
  }

  revalidatePath("/admin/banners");
  revalidatePath("/");
  redirect("/admin/banners");
}

export async function removeBanner(id: number): Promise<ActionResult> {
  await deleteBanner(id);
  revalidatePath("/admin/banners");
  revalidatePath("/");
  return {};
}
