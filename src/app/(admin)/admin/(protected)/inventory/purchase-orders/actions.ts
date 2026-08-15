"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requirePermission } from "@/server/admin/guard";
import { logActivity } from "@/server/admin/audit";
import { takaToPaisa } from "@/lib/money";
import {
  saveSupplier,
  deleteSupplier,
  createPurchaseOrder,
  markOrdered,
  cancelPurchaseOrder,
  receivePurchaseOrder,
  PurchasingError,
  type PurchaseOrderLineInput,
} from "@/server/purchasing";

export interface ActionResult {
  error?: string;
  success?: string;
}

// ── Suppliers ───────────────────────────────────────────────────────────────

export async function saveSupplierAction(
  id: number | null,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requirePermission("inventory");
  const leadRaw = String(formData.get("leadTimeDays") ?? "").trim();

  try {
    await saveSupplier(id, {
      name: String(formData.get("name") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      address: String(formData.get("address") ?? ""),
      note: String(formData.get("note") ?? ""),
      leadTimeDays: leadRaw ? Number(leadRaw) : null,
      isActive: formData.get("isActive") !== "false",
    });
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: id ? "supplier.update" : "supplier.create",
    detail: String(formData.get("name") ?? ""),
  });
  revalidatePath("/admin/inventory/suppliers");
  redirect("/admin/inventory/suppliers");
}

export async function deleteSupplierAction(id: number): Promise<ActionResult> {
  const admin = await requirePermission("inventory");
  try {
    await deleteSupplier(id);
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "supplier.delete",
    detail: `#${id}`,
  });
  revalidatePath("/admin/inventory/suppliers");
  return {};
}

// ── Purchase orders ─────────────────────────────────────────────────────────

export async function createPurchaseOrderAction(formData: FormData): Promise<ActionResult> {
  const admin = await requirePermission("inventory");

  // Lines arrive as parallel arrays from the repeating row UI.
  const productIds = formData.getAll("lineProductId").map(String);
  const variantIds = formData.getAll("lineVariantId").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  const unitCosts = formData.getAll("lineUnitCost").map(String);

  const lines: PurchaseOrderLineInput[] = [];
  for (let i = 0; i < productIds.length; i++) {
    const productId = Number(productIds[i]);
    const quantity = Number(quantities[i]);
    // Skip blank rows rather than erroring — the form always renders one spare.
    if (!productId || !quantity) continue;
    lines.push({
      productId,
      variantId: variantIds[i] ? Number(variantIds[i]) : null,
      quantity,
      unitCost: takaToPaisa(Number(unitCosts[i]) || 0),
    });
  }

  if (lines.length === 0) return { error: "Add at least one product to the order." };

  const expectedRaw = String(formData.get("expectedOn") ?? "").trim();
  const expectedOn = expectedRaw ? new Date(`${expectedRaw}T00:00:00`) : null;

  let po;
  try {
    po = await createPurchaseOrder({
      supplierId: Number(formData.get("supplierId")),
      expectedOn: expectedOn && !Number.isNaN(expectedOn.getTime()) ? expectedOn : null,
      shippingCost: takaToPaisa(Number(formData.get("shippingCost")) || 0),
      customsCost: takaToPaisa(Number(formData.get("customsCost")) || 0),
      note: String(formData.get("note") ?? ""),
      lines,
    });
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "purchase_order.create",
    detail: po.poNo,
  });
  revalidatePath("/admin/inventory/purchase-orders");
  redirect(`/admin/inventory/purchase-orders/${po.id}`);
}

export async function markOrderedAction(id: number): Promise<ActionResult> {
  const admin = await requirePermission("inventory");
  try {
    await markOrdered(id);
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "purchase_order.placed",
    detail: `#${id}`,
  });
  revalidatePath(`/admin/inventory/purchase-orders/${id}`);
  revalidatePath("/admin/inventory");
  return { success: "Order placed — its units now count as incoming." };
}

export async function cancelPurchaseOrderAction(id: number): Promise<ActionResult> {
  const admin = await requirePermission("inventory");
  try {
    await cancelPurchaseOrder(id);
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "purchase_order.cancel",
    detail: `#${id}`,
  });
  revalidatePath(`/admin/inventory/purchase-orders/${id}`);
  revalidatePath("/admin/inventory");
  return { success: "Order cancelled." };
}

export async function receiveAction(id: number, formData: FormData): Promise<ActionResult> {
  const admin = await requirePermission("inventory");

  const lineIds = formData.getAll("receiveLineId").map(String);
  const quantities = formData.getAll("receiveQty").map(String);

  const receipts = lineIds
    .map((lineId, i) => ({ lineId: Number(lineId), quantity: Number(quantities[i]) || 0 }))
    .filter((r) => r.lineId && r.quantity > 0);

  if (receipts.length === 0) {
    return { error: "Enter how many units arrived on at least one line." };
  }

  try {
    await receivePurchaseOrder(id, receipts, admin.username);
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "purchase_order.receive",
    detail: `#${id} · ${receipts.reduce((s, r) => s + r.quantity, 0)} unit(s)`,
  });
  revalidatePath(`/admin/inventory/purchase-orders/${id}`);
  revalidatePath("/admin/inventory");
  revalidatePath("/admin/inventory/movements");
  return { success: "Received — stock updated." };
}
