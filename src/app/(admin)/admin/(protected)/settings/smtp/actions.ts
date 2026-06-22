"use server";

import { revalidatePath } from "next/cache";
import { getSmtpConfig, saveSmtpConfig } from "@/server/settings/smtp";

export interface ActionResult {
  error?: string;
  success?: boolean;
}

export async function saveSmtpSettings(formData: FormData): Promise<ActionResult> {
  const host = String(formData.get("host") ?? "").trim();
  const port = Number(formData.get("port") ?? 587);
  const secure = formData.get("secure") === "on";
  const user = String(formData.get("user") ?? "").trim();
  const passwordInput = String(formData.get("password") ?? "");
  const fromAddress = String(formData.get("fromAddress") ?? "").trim();
  const fromName = String(formData.get("fromName") ?? "").trim();

  if (!host) return { error: "SMTP host is required." };
  if (!Number.isFinite(port) || port <= 0) return { error: "Port must be a positive number." };
  if (!fromAddress) return { error: "From address is required." };

  // Blank password field means "keep the existing one" — otherwise saving
  // the form again without retyping the password would wipe it.
  const existing = await getSmtpConfig();
  const password = passwordInput || existing?.password || "";

  await saveSmtpConfig({ host, port, secure, user, password, fromAddress, fromName });
  revalidatePath("/admin/settings/smtp");
  return { success: true };
}
