"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/admin/guard";
import {
  createLocation,
  updateLocation,
  deleteLocation,
  LocationAdminError,
  type LocationLevel,
} from "@/server/settings/locationsAdmin";

export interface ActionResult {
  error?: string;
}

const LEVELS: LocationLevel[] = ["division", "district", "upazila"];

function isLevel(value: string): value is LocationLevel {
  return (LEVELS as string[]).includes(value);
}

/**
 * Editing locations changes what every shopper sees and pays, so both the
 * checkout and the product page's shipping table are revalidated on any write —
 * otherwise a rate change would sit behind a cached page.
 */
function revalidateAll() {
  revalidatePath("/admin/settings/locations");
  revalidatePath("/admin/settings/shipping");
  revalidatePath("/checkout");
  revalidatePath("/account/addresses");
  revalidatePath("/products", "layout");
}

export async function saveLocation(
  level: string,
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  await requirePermission("settings");
  if (!isLevel(level)) return { error: "Unknown location type." };

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Name is required." };
  if (name.length > 120) return { error: "Name is too long (120 characters max)." };

  const rawZone = String(formData.get("shippingZoneId") ?? "").trim();
  const shippingZoneId = rawZone === "" ? null : Number(rawZone);
  if (shippingZoneId !== null && !Number.isInteger(shippingZoneId)) {
    return { error: "Choose a valid delivery zone." };
  }

  const rawParent = String(formData.get("parentId") ?? "").trim();
  const parentId = rawParent === "" ? null : Number(rawParent);
  if (level !== "division" && (!parentId || !Number.isInteger(parentId))) {
    return { error: level === "district" ? "Choose a division." : "Choose a district." };
  }

  const sortOrderRaw = Number(formData.get("sortOrder") ?? 0);
  const sortOrder = Number.isFinite(sortOrderRaw) ? sortOrderRaw : 0;

  const input = {
    name,
    shippingZoneId,
    isActive: formData.get("isActive") === "on",
    sortOrder,
    parentId,
  };

  try {
    if (id) {
      await updateLocation(level, id, input);
    } else {
      await createLocation(level, input);
    }
  } catch (err) {
    if (err instanceof LocationAdminError) return { error: err.message };
    console.error("[admin] saving location failed:", err);
    return { error: "Could not save that location. Please try again." };
  }

  revalidateAll();
  redirect("/admin/settings/locations");
}

export async function removeLocation(level: string, id: number): Promise<ActionResult> {
  await requirePermission("settings");
  if (!isLevel(level)) return { error: "Unknown location type." };
  try {
    await deleteLocation(level, id);
  } catch (err) {
    console.error("[admin] deleting location failed:", err);
    return { error: "Could not delete that location." };
  }
  revalidateAll();
  return {};
}

/**
 * Flip a location's active flag straight from the list — the common edit by
 * far (a courier suspends a district for a week), so it should not require
 * opening the full form.
 */
export async function toggleLocationActive(
  level: string,
  id: number,
  isActive: boolean,
): Promise<ActionResult> {
  await requirePermission("settings");
  if (!isLevel(level)) return { error: "Unknown location type." };
  const { prisma } = await import("@/lib/prisma");
  const data = { isActive };
  if (level === "division") await prisma.division.update({ where: { id }, data });
  else if (level === "district") await prisma.district.update({ where: { id }, data });
  else await prisma.upazila.update({ where: { id }, data });
  revalidateAll();
  return {};
}
