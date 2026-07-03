"use server";

import { revalidatePath } from "next/cache";
import { getSmsConfig, saveSmsConfig } from "@/server/settings/sms";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function saveSmsSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const apiUrl = String(formData.get("apiUrl") ?? "").trim();
  const apiKeyInput = String(formData.get("apiKey") ?? "");
  const senderId = String(formData.get("senderId") ?? "").trim();

  // Blank API key means "keep the existing one".
  const existing = await getSmsConfig();
  const apiKey = apiKeyInput || existing?.apiKey || "";

  if (!apiKey) return { error: "API key is required." };

  await saveSmsConfig({ apiUrl, apiKey, senderId });
  revalidatePath("/admin/settings/sms");
  return { success: true };
}
