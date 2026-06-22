"use server";

import { revalidatePath } from "next/cache";
import { setGtmId } from "@/server/settings/tracking";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function saveGtmId(formData: FormData): Promise<ActionResult> {
  const gtmId = String(formData.get("gtmId") ?? "").trim();

  if (gtmId && !/^GTM-[A-Z0-9]+$/i.test(gtmId)) {
    return { error: "GTM id should look like GTM-XXXXXXX (or leave blank to disable)." };
  }

  await setGtmId(gtmId);
  revalidatePath("/admin/settings/tag-manager");
  revalidatePath("/", "layout");
  return { success: true };
}
