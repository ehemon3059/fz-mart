"use server";

import { revalidatePath } from "next/cache";
import {
  setPixelId,
  setCapiAccessToken,
  setCapiTestEventCode,
} from "@/server/settings/tracking";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function savePixelId(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const pixelId = String(formData.get("pixelId") ?? "").trim();
  const accessToken = String(formData.get("capiAccessToken") ?? "").trim();
  const testEventCode = String(formData.get("capiTestEventCode") ?? "").trim();

  if (pixelId && !/^\d{10,20}$/.test(pixelId)) {
    return { error: "Pixel id should be a numeric id (or leave blank to disable)." };
  }
  // The token is opaque; only sanity-check length so an accidental paste of
  // something tiny is caught. Blank leaves the existing token untouched (so an
  // admin editing the pixel id doesn't have to re-paste the secret).
  if (accessToken && accessToken.length < 20) {
    return { error: "That access token looks too short — copy the full System User token from Meta." };
  }

  await setPixelId(pixelId);
  if (accessToken) await setCapiAccessToken(accessToken);
  await setCapiTestEventCode(testEventCode);
  revalidatePath("/admin/settings/pixel");
  revalidatePath("/", "layout");
  return { success: true };
}
