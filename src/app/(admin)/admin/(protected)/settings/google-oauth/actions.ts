"use server";

import { revalidatePath } from "next/cache";
import { getGoogleOAuthConfig, saveGoogleOAuthConfig } from "@/server/settings/google-oauth";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function saveGoogleOAuthSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const clientId = String(formData.get("clientId") ?? "").trim();
  const clientSecretInput = String(formData.get("clientSecret") ?? "");
  const redirectUri = String(formData.get("redirectUri") ?? "").trim();

  if (!clientId) return { error: "Client ID is required." };
  if (!redirectUri) return { error: "Redirect URI is required." };

  // Blank secret field means "keep the existing one" — otherwise re-saving
  // the form without retyping the secret would wipe it.
  const existing = await getGoogleOAuthConfig();
  const clientSecret = clientSecretInput || existing?.clientSecret || "";

  if (!clientSecret) return { error: "Client Secret is required." };

  await saveGoogleOAuthConfig({ clientId, clientSecret, redirectUri });
  revalidatePath("/admin/settings/google-oauth");
  return { success: true };
}
