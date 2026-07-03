"use server";

import { revalidatePath } from "next/cache";
import { getFraudConfig, saveFraudConfig } from "@/server/settings/fraud";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function saveFraudSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const apiUrl = String(formData.get("apiUrl") ?? "").trim();
  const apiKeyInput = String(formData.get("apiKey") ?? "");

  const existing = await getFraudConfig();
  const apiKey = apiKeyInput || existing?.apiKey || "";

  if (!apiKey) return { error: "API key is required." };

  await saveFraudConfig({ apiUrl, apiKey });
  revalidatePath("/admin/settings/fraud");
  return { success: true };
}
