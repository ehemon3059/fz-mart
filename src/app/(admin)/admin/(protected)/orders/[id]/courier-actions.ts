"use server";

import { revalidatePath } from "next/cache";
import type { CourierProvider } from "@prisma/client";
import {
  shipOrder,
  syncShipmentStatus,
  CourierServiceError,
  type ShipOrderOptions,
} from "@/server/courier";
import {
  getPathaoCities,
  getPathaoZones,
  getPathaoAreas,
  type PathaoLocation,
} from "@/integrations/courier/pathao";
import { requirePermission } from "@/server/admin/guard";

export interface CourierActionResult {
  error?: string;
}

export interface CreateShipmentInput {
  provider?: CourierProvider;
  recipientCityId?: number;
  recipientZoneId?: number;
  recipientAreaId?: number;
}

export async function createShipment(
  orderId: number,
  input: CreateShipmentInput = {},
): Promise<CourierActionResult> {
  await requirePermission("orders");
  try {
    const options: ShipOrderOptions = {
      provider: input.provider,
      recipientCityId: input.recipientCityId,
      recipientZoneId: input.recipientZoneId,
      recipientAreaId: input.recipientAreaId,
    };
    await shipOrder(orderId, options);
  } catch (err) {
    if (err instanceof CourierServiceError) {
      return { error: err.message };
    }
    console.error("[admin] courier shipment creation failed:", err);
    return { error: "Failed to create shipment. See server logs." };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

export async function refreshShipmentStatus(
  orderId: number,
): Promise<CourierActionResult> {
  await requirePermission("orders");
  try {
    await syncShipmentStatus(orderId);
  } catch (err) {
    if (err instanceof CourierServiceError) {
      return { error: err.message };
    }
    console.error("[admin] courier status sync failed:", err);
    return { error: "Failed to sync status. See server logs." };
  }
  revalidatePath(`/admin/orders/${orderId}`);
  return {};
}

// ── Pathao location lookups (for the consignment picker) ─────────────────────

export interface PathaoLocationResult {
  error?: string;
  locations?: PathaoLocation[];
}

export async function fetchPathaoCities(): Promise<PathaoLocationResult> {
  await requirePermission("orders");
  try {
    return { locations: await getPathaoCities() };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not load cities." };
  }
}

export async function fetchPathaoZones(cityId: number): Promise<PathaoLocationResult> {
  await requirePermission("orders");
  try {
    return { locations: await getPathaoZones(cityId) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not load zones." };
  }
}

export async function fetchPathaoAreas(zoneId: number): Promise<PathaoLocationResult> {
  await requirePermission("orders");
  try {
    return { locations: await getPathaoAreas(zoneId) };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not load areas." };
  }
}
