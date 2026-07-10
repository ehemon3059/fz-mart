"use server";

import { revalidatePath } from "next/cache";
import type { CourierProvider } from "@prisma/client";
import { getCourierConfig, saveCourierConfig } from "@/server/settings/courier";
import { getPathaoConfig, savePathaoConfig } from "@/server/settings/courier-pathao";
import { getRedxConfig, saveRedxConfig } from "@/server/settings/courier-redx";
import { setActiveProvider } from "@/server/settings/courier-active";
import { testCourierConnection } from "@/integrations/courier";
import { resolveAdapter } from "@/integrations/courier/dispatch";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

/** Resolve the credentials to use, merging blank inputs with stored values. */
async function resolveConfig(formData: FormData) {
  const provider = String(formData.get("provider") ?? "").trim();
  const apiUrl = String(formData.get("apiUrl") ?? "").trim();
  const apiKeyInput = String(formData.get("apiKey") ?? "");
  const secretKeyInput = String(formData.get("secretKey") ?? "");
  const webhookSecretInput = String(formData.get("webhookSecret") ?? "");

  const existing = await getCourierConfig();
  return {
    provider,
    apiUrl,
    apiKey: apiKeyInput || existing?.apiKey || "",
    secretKey: secretKeyInput || existing?.secretKey || "",
    webhookSecret: webhookSecretInput || existing?.webhookSecret || "",
  };
}

export async function saveCourierSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const config = await resolveConfig(formData);

  if (!config.apiKey) return { error: "API key is required." };
  if (!config.secretKey) return { error: "Secret key is required." };
  if (!config.webhookSecret) return { error: "Webhook secret is required." };

  // Validate credentials against the live provider before persisting, so a
  // typo'd key can't be saved and silently break every shipment.
  const test = await testCourierConnection(config);
  if (!test.ok) {
    return { error: `Could not verify credentials: ${test.message}` };
  }

  await saveCourierConfig(config);
  revalidatePath("/admin/settings/courier");
  return { success: true };
}

/** Live "test connection" without saving — used by the button in the form. */
export async function testCourierSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const config = await resolveConfig(formData);

  if (!config.apiKey || !config.secretKey) {
    return { error: "Enter both the API key and secret key to test." };
  }

  const test = await testCourierConnection(config);
  return test.ok ? { success: true } : { error: test.message };
}

// ── Active provider ─────────────────────────────────────────────────────────

const PROVIDERS: readonly CourierProvider[] = ["STEADFAST", "PATHAO", "REDX"];

export async function setCourierActiveProvider(
  provider: string,
): Promise<ActionResult> {
  await requirePermission("settings");
  if (!(PROVIDERS as readonly string[]).includes(provider)) {
    return { error: "Unknown provider." };
  }
  await setActiveProvider(provider as CourierProvider);
  revalidatePath("/admin/settings/courier");
  return { success: true };
}

// ── Pathao ──────────────────────────────────────────────────────────────────

async function resolvePathaoConfig(formData: FormData) {
  const existing = await getPathaoConfig();
  const secret = (name: string, current: string) =>
    String(formData.get(name) ?? "") || current;
  return {
    clientId: secret("clientId", existing?.clientId ?? ""),
    clientSecret: secret("clientSecret", existing?.clientSecret ?? ""),
    storeId: String(formData.get("storeId") ?? "").trim(),
    senderName: String(formData.get("senderName") ?? "").trim(),
    senderPhone: String(formData.get("senderPhone") ?? "").trim(),
    mode: (String(formData.get("mode") ?? "sandbox") === "live"
      ? "live"
      : "sandbox") as "sandbox" | "live",
    webhookSecret: secret("webhookSecret", existing?.webhookSecret ?? ""),
  };
}

export async function savePathaoSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const config = await resolvePathaoConfig(formData);
  if (!config.clientId || !config.clientSecret) {
    return { error: "Client id and client secret are required." };
  }

  await savePathaoConfig(config);
  // Validate AFTER saving so testConnection reads the just-saved credentials
  // (the Pathao adapter reads config from the settings store, not the form).
  const test = await resolveAdapter("PATHAO").testConnection();
  if (!test.ok) return { error: `Saved, but could not verify: ${test.message}` };

  revalidatePath("/admin/settings/courier");
  return { success: true };
}

export async function testPathaoSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const config = await resolvePathaoConfig(formData);
  if (!config.clientId || !config.clientSecret) {
    return { error: "Enter the client id and secret to test." };
  }
  // Persist first so the adapter (which reads from settings) sees these creds.
  await savePathaoConfig(config);
  const test = await resolveAdapter("PATHAO").testConnection();
  return test.ok ? { success: true } : { error: test.message };
}

// ── RedX ─────────────────────────────────────────────────────────────────────

async function resolveRedxConfig(formData: FormData) {
  const existing = await getRedxConfig();
  const secret = (name: string, current: string) =>
    String(formData.get(name) ?? "") || current;
  return {
    apiKey: secret("apiKey", existing?.apiKey ?? ""),
    pickupStoreId: String(formData.get("pickupStoreId") ?? "").trim(),
    senderName: String(formData.get("senderName") ?? "").trim(),
    senderPhone: String(formData.get("senderPhone") ?? "").trim(),
    webhookSecret: secret("webhookSecret", existing?.webhookSecret ?? ""),
  };
}

export async function saveRedxSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const config = await resolveRedxConfig(formData);
  if (!config.apiKey) return { error: "API key is required." };

  await saveRedxConfig(config);
  const test = await resolveAdapter("REDX").testConnection();
  if (!test.ok) return { error: `Saved, but could not verify: ${test.message}` };

  revalidatePath("/admin/settings/courier");
  return { success: true };
}

export async function testRedxSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const config = await resolveRedxConfig(formData);
  if (!config.apiKey) return { error: "Enter the API key to test." };
  await saveRedxConfig(config);
  const test = await resolveAdapter("REDX").testConnection();
  return test.ok ? { success: true } : { error: test.message };
}
