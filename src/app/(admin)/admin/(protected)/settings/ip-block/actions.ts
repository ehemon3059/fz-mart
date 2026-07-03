"use server";

import { revalidatePath } from "next/cache";
import { blockIp, unblockIp } from "@/lib/ip-block";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
}

const IP_PATTERN = /^(\d{1,3}\.){3}\d{1,3}$/;

export async function addBlockedIp(formData: FormData): Promise<ActionResult> {
  await requirePermission("settings");
  const ip = String(formData.get("ip") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!IP_PATTERN.test(ip)) {
    return { error: "Enter a valid IPv4 address (e.g. 203.0.113.5)." };
  }

  await blockIp(ip, reason || undefined);
  revalidatePath("/admin/settings/ip-block");
  return {};
}

export async function removeBlockedIp(ip: string): Promise<ActionResult> {
  await requirePermission("settings");
  await unblockIp(ip);
  revalidatePath("/admin/settings/ip-block");
  return {};
}
