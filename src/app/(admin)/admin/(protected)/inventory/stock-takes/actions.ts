"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import {
  createStockTake,
  countLine,
  removeLine,
  commitStockTake,
  cancelStockTake,
  StockTakeError,
  type CommitSummary,
} from "@/server/inventory/stocktake";
import { scanCode, searchStockRows, type ScanResult, type ScanHit } from "@/server/inventory/barcode";

export interface TakeResult {
  error?: string;
  success?: string;
}

export async function createStockTakeAction(formData: FormData): Promise<TakeResult> {
  const admin = await requirePermission("inventory");
  const rawLocation = String(formData.get("locationId") ?? "").trim();

  const take = await createStockTake({
    locationId: rawLocation ? Number(rawLocation) : null,
    note: String(formData.get("note") ?? ""),
    actorName: admin.username,
  });

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "stock_take.start",
    detail: take.reference,
  });
  revalidatePath("/admin/inventory/stock-takes");
  redirect(`/admin/inventory/stock-takes/${take.id}`);
}

/** Resolve a scanned code. Pure lookup — nothing is written. */
export async function scanAction(code: string): Promise<ScanResult> {
  await requirePermission("inventory");
  return scanCode(code);
}

/** Name search, for the stock that was never labelled with a SKU. */
export async function searchRowsAction(query: string): Promise<ScanHit[]> {
  await requirePermission("inventory");
  return searchStockRows(query);
}

export async function countLineAction(
  stockTakeId: number,
  input: { productId: number; variantId: number | null; countedQty: number; note?: string },
): Promise<TakeResult> {
  await requirePermission("inventory");
  try {
    await countLine({ stockTakeId, ...input });
  } catch (err) {
    if (err instanceof StockTakeError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/admin/inventory/stock-takes/${stockTakeId}`);
  return {};
}

export async function removeLineAction(stockTakeId: number, lineId: number): Promise<TakeResult> {
  await requirePermission("inventory");
  try {
    await removeLine(stockTakeId, lineId);
  } catch (err) {
    if (err instanceof StockTakeError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/admin/inventory/stock-takes/${stockTakeId}`);
  return {};
}

export interface CommitResult extends TakeResult {
  summary?: CommitSummary;
}

export async function commitStockTakeAction(id: number): Promise<CommitResult> {
  const admin = await requirePermission("inventory");
  let summary: CommitSummary;
  try {
    summary = await commitStockTake(id, admin.username);
  } catch (err) {
    if (err instanceof StockTakeError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "stock_take.commit",
    detail: `#${id} · ${summary.applied} line(s), net ${summary.netUnits}`,
  });
  revalidatePath(`/admin/inventory/stock-takes/${id}`);
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/movements");
  return { summary, success: "Count applied." };
}

export async function cancelStockTakeAction(id: number): Promise<TakeResult> {
  const admin = await requirePermission("inventory");
  try {
    await cancelStockTake(id);
  } catch (err) {
    if (err instanceof StockTakeError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "stock_take.cancel",
    detail: `#${id}`,
  });
  revalidatePath(`/admin/inventory/stock-takes/${id}`);
  return { success: "Stock-take cancelled." };
}
