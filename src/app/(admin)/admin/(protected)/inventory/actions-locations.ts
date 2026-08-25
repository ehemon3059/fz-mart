"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { saveLocation, deleteLocation, LocationError } from "@/server/inventory/locations";

export interface LocationResult {
  error?: string;
  success?: string;
}

export async function saveLocationAction(
  id: number | null,
  formData: FormData,
): Promise<LocationResult> {
  const admin = await requirePermission("inventory");
  try {
    await saveLocation(id, {
      name: String(formData.get("name") ?? ""),
      note: String(formData.get("note") ?? ""),
      isDefault: formData.get("isDefault") === "on",
      isActive: formData.get("isActive") !== "false",
    });
  } catch (err) {
    if (err instanceof LocationError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: id ? "location.update" : "location.create",
    detail: String(formData.get("name") ?? ""),
  });
  revalidatePath("/admin/inventory/locations");
  return { success: id ? "Location updated." : "Location added." };
}

export async function deleteLocationAction(id: number): Promise<LocationResult> {
  const admin = await requirePermission("inventory");
  try {
    await deleteLocation(id);
  } catch (err) {
    if (err instanceof LocationError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "location.delete",
    detail: `#${id}`,
  });
  revalidatePath("/admin/inventory/locations");
  return { success: "Location removed." };
}
