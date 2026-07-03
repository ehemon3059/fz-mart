"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { takaToPaisa } from "@/lib/money";
import { requirePermission } from "@/server/admin/guard";
import {
  createShippingZone,
  updateShippingZone,
  deleteShippingZone,
} from "@/server/settings/shippingAdmin";

export interface ActionResult {
  error?: string;
}

export async function saveShippingZone(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("settings");
  const name = String(formData.get("name") ?? "").trim();
  const chargeTaka = Number(formData.get("charge"));
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!name) return { error: "Name is required." };
  if (!Number.isFinite(chargeTaka) || chargeTaka < 0) {
    return { error: "Charge must be zero or a positive number." };
  }

  const input = { name, charge: takaToPaisa(chargeTaka), sortOrder, isActive };

  if (id) {
    await updateShippingZone(id, input);
  } else {
    await createShippingZone(input);
  }

  revalidatePath("/admin/settings/shipping");
  revalidatePath("/checkout");
  redirect("/admin/settings/shipping");
}

export async function removeShippingZone(id: number): Promise<ActionResult> {
  await requirePermission("settings");
  try {
    await deleteShippingZone(id);
  } catch {
    return { error: "Could not delete — orders still reference this zone." };
  }
  revalidatePath("/admin/settings/shipping");
  revalidatePath("/checkout");
  return {};
}
