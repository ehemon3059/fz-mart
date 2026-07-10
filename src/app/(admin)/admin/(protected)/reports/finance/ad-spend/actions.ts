"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AdChannel } from "@prisma/client";
import { takaToPaisa } from "@/lib/money";
import { isAdChannel } from "@/config/ad-channel";
import { createAdSpend, updateAdSpend, deleteAdSpend } from "@/server/finance/ad-spend";
import { requirePermission } from "@/server/admin/guard";

export interface ActionResult {
  error?: string;
}

export async function saveAdSpend(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requirePermission("expenses");
  const rawChannel = String(formData.get("channel") ?? "");
  const note = String(formData.get("note") ?? "").trim().slice(0, 255);
  const amountTaka = Number(formData.get("amount"));
  const spentOnRaw = String(formData.get("spentOn") ?? "");

  if (!isAdChannel(rawChannel)) {
    return { error: "Please choose a valid channel." };
  }
  if (!Number.isFinite(amountTaka) || amountTaka <= 0) {
    return { error: "Amount must be greater than zero." };
  }
  const spentOn = new Date(spentOnRaw);
  if (Number.isNaN(spentOn.getTime())) {
    return { error: "Please pick a valid date." };
  }

  const input = {
    channel: rawChannel as AdChannel,
    amount: takaToPaisa(amountTaka),
    spentOn,
    note: note || null,
  };

  if (id) {
    await updateAdSpend(id, input);
  } else {
    await createAdSpend({ ...input, createdBy: admin.username });
  }

  revalidatePath("/admin/reports/finance/ad-spend");
  revalidatePath("/admin/reports/finance");
  redirect("/admin/reports/finance/ad-spend");
}

export async function removeAdSpend(id: number): Promise<ActionResult> {
  await requirePermission("expenses");
  await deleteAdSpend(id);
  revalidatePath("/admin/reports/finance/ad-spend");
  revalidatePath("/admin/reports/finance");
  return {};
}
