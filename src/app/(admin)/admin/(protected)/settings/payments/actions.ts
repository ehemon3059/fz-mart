"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { getPaymentsConfig, savePaymentsConfig } from "@/server/settings/payments";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

function parseFeeBps(formData: FormData, name: string): number | null {
  // The form collects a human percentage ("2.5"); stored as basis points.
  const raw = String(formData.get(name) ?? "").trim();
  if (!raw) return 0;
  const pct = Number(raw);
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) return null;
  return Math.round(pct * 100);
}

export async function savePaymentsSettings(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");

  const sslcommerzFeeBps = parseFeeBps(formData, "sslcommerzFeePct");
  const bkashFeeBps = parseFeeBps(formData, "bkashFeePct");
  if (sslcommerzFeeBps == null || bkashFeeBps == null) {
    return { error: "Gateway fee must be a percentage between 0 and 100." };
  }

  // Blank password-type fields mean "keep the existing secret" — same
  // convention as the SMTP/courier forms.
  const existing = await getPaymentsConfig();
  const sslcommerzStorePassword =
    String(formData.get("sslcommerzStorePassword") ?? "") || existing.sslcommerz.storePassword;
  const bkashAppSecret =
    String(formData.get("bkashAppSecret") ?? "") || existing.bkash.appSecret;
  const bkashPassword =
    String(formData.get("bkashPassword") ?? "") || existing.bkash.password;

  await savePaymentsConfig({
    onlineEnabled: formData.get("onlineEnabled") === "on",
    partialEnabled: formData.get("partialEnabled") === "on",
    sslcommerz: {
      enabled: formData.get("sslcommerzEnabled") === "on",
      sandbox: formData.get("sslcommerzSandbox") === "on",
      storeId: String(formData.get("sslcommerzStoreId") ?? "").trim(),
      storePassword: sslcommerzStorePassword,
      feeBps: sslcommerzFeeBps,
    },
    bkash: {
      enabled: formData.get("bkashEnabled") === "on",
      sandbox: formData.get("bkashSandbox") === "on",
      appKey: String(formData.get("bkashAppKey") ?? "").trim(),
      appSecret: bkashAppSecret,
      username: String(formData.get("bkashUsername") ?? "").trim(),
      password: bkashPassword,
      feeBps: bkashFeeBps,
    },
    mock: {
      enabled: formData.get("mockEnabled") === "on",
      feeBps: existing.mock.feeBps,
    },
  });

  revalidatePath("/admin/settings/payments");
  revalidatePath("/checkout");
  return { success: true };
}
