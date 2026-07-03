"use server";

import { revalidatePath } from "next/cache";
import { getCourierConfig, saveCourierConfig } from "@/server/settings/courier";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function saveCourierSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const provider = String(formData.get("provider") ?? "").trim();
  const apiUrl = String(formData.get("apiUrl") ?? "").trim();
  const apiKeyInput = String(formData.get("apiKey") ?? "");
  const webhookSecretInput = String(formData.get("webhookSecret") ?? "");

  const existing = await getCourierConfig();
  const apiKey = apiKeyInput || existing?.apiKey || "";
  const webhookSecret = webhookSecretInput || existing?.webhookSecret || "";

  if (!apiKey) return { error: "API key is required." };
  if (!webhookSecret) return { error: "Webhook secret is required." };

  await saveCourierConfig({ provider, apiUrl, apiKey, webhookSecret });
  revalidatePath("/admin/settings/courier");
  return { success: true };
}
