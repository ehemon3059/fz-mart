"use server";

import { revalidatePath } from "next/cache";
import { setPixelId } from "@/server/settings/tracking";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function savePixelId(formData: FormData): Promise<ActionResult> {
  const pixelId = String(formData.get("pixelId") ?? "").trim();

  if (pixelId && !/^\d{10,20}$/.test(pixelId)) {
    return { error: "Pixel id should be a numeric id (or leave blank to disable)." };
  }

  await setPixelId(pixelId);
  revalidatePath("/admin/settings/pixel");
  revalidatePath("/", "layout");
  return { success: true };
}
