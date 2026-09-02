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
  updatePurchaseOrder,
  deletePurchaseOrder,
  markOrdered,
  cancelPurchaseOrder,
  receivePurchaseOrder,
  recordSupplierPayment,
  deleteSupplierPayment,
  PurchasingError,
  type PurchaseOrderLineInput,
} from "@/server/purchasing";
import {
  createProduct,
  getProductById,
  ProductPublishError,
  ProductStockError,
} from "@/server/products/admin";

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

  let removed;
  try {
    removed = await deleteSupplier(id);
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }

  // The name and the order count are recorded because the row itself is gone:
  // "#7" in the log answers nothing once there is no supplier #7 to look up.
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "supplier.delete",
    detail:
      removed.deletedOrders > 0
        ? `${removed.name} (#${id}) with ${removed.deletedOrders} purchase order(s)`
        : `${removed.name} (#${id})`,
  });
  revalidatePath("/admin/inventory/suppliers");
  revalidatePath("/admin/inventory/purchase-orders");
  return { success: `${removed.name} deleted.` };
}

// ── Purchase orders ─────────────────────────────────────────────────────────

/**
 * Lines arrive as parallel arrays from the repeating row UI, one entry per
 * rendered row. Blank rows are skipped rather than rejected — the form always
 * renders one spare, and an empty spare is not a mistake.
 */
function parseLines(formData: FormData): PurchaseOrderLineInput[] {
  const productIds = formData.getAll("lineProductId").map(String);
  const variantIds = formData.getAll("lineVariantId").map(String);
  const quantities = formData.getAll("lineQuantity").map(String);
  const unitCosts = formData.getAll("lineUnitCost").map(String);

  const lines: PurchaseOrderLineInput[] = [];
  for (let i = 0; i < productIds.length; i++) {
    const productId = Number(productIds[i]);
    const quantity = Number(quantities[i]);
    if (!productId || !quantity) continue;
    lines.push({
      productId,
      variantId: variantIds[i] ? Number(variantIds[i]) : null,
      quantity,
      unitCost: takaToPaisa(Number(unitCosts[i]) || 0),
    });
  }
  return lines;
}

/** "2026-08-27" from a date input, or null when blank/unparseable. */
function parseDate(value: FormDataEntryValue | null): Date | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createPurchaseOrderAction(formData: FormData): Promise<ActionResult> {
  const admin = await requirePermission("inventory");

  const lines = parseLines(formData);
  if (lines.length === 0) return { error: "Add at least one product to the order." };

  const expectedOn = parseDate(formData.get("expectedOn"));

  let po;
  try {
    po = await createPurchaseOrder({
      supplierId: Number(formData.get("supplierId")),
      expectedOn,
      shippingCost: takaToPaisa(Number(formData.get("shippingCost")) || 0),
      customsCost: takaToPaisa(Number(formData.get("customsCost")) || 0),
      labourCost: takaToPaisa(Number(formData.get("labourCost")) || 0),
      miscCost: takaToPaisa(Number(formData.get("miscCost")) || 0),
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

export async function updatePurchaseOrderAction(
  id: number,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requirePermission("inventory");

  const lines = parseLines(formData);
  if (lines.length === 0) return { error: "Add at least one product to the order." };

  let po;
  try {
    po = await updatePurchaseOrder(id, {
      supplierId: Number(formData.get("supplierId")),
      expectedOn: parseDate(formData.get("expectedOn")),
      shippingCost: takaToPaisa(Number(formData.get("shippingCost")) || 0),
      customsCost: takaToPaisa(Number(formData.get("customsCost")) || 0),
      labourCost: takaToPaisa(Number(formData.get("labourCost")) || 0),
      miscCost: takaToPaisa(Number(formData.get("miscCost")) || 0),
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
    action: "purchase_order.update",
    detail: po.poNo,
  });
  revalidatePath(`/admin/inventory/purchase-orders/${id}`);
  revalidatePath("/admin/inventory/purchase-orders");
  redirect(`/admin/inventory/purchase-orders/${id}`);
}

export async function deletePurchaseOrderAction(
  id: number,
  /**
   * Where the caller is standing. From the detail page the order being deleted
   * IS the page, so it has to leave; from the list the row simply disappears
   * and a redirect would throw away the tab and page number the admin is on.
   */
  options: { stayOnPage?: boolean } = {},
): Promise<ActionResult> {
  const admin = await requirePermission("inventory");
  try {
    await deletePurchaseOrder(id);
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "purchase_order.delete",
    detail: `#${id}`,
  });
  revalidatePath("/admin/inventory/purchase-orders");
  if (options.stayOnPage) return { success: "Purchase order deleted." };
  redirect("/admin/inventory/purchase-orders");
}

// ── Supplier payments ───────────────────────────────────────────────────────

export async function recordPaymentAction(
  purchaseOrderId: number,
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requirePermission("inventory");

  const paidOn = parseDate(formData.get("paidOn")) ?? new Date();

  try {
    await recordSupplierPayment({
      purchaseOrderId,
      amount: takaToPaisa(Number(formData.get("amount")) || 0),
      paidOn,
      method: String(formData.get("method") ?? ""),
      note: String(formData.get("note") ?? ""),
      actorName: admin.username,
    });
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }

  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "supplier_payment.record",
    detail: `PO #${purchaseOrderId} · ৳${formData.get("amount")}`,
  });
  revalidatePath(`/admin/inventory/purchase-orders/${purchaseOrderId}`);
  revalidatePath("/admin/inventory/suppliers");
  return { success: "Payment recorded." };
}

export async function deletePaymentAction(
  id: number,
  purchaseOrderId: number,
): Promise<ActionResult> {
  const admin = await requirePermission("inventory");
  try {
    await deleteSupplierPayment(id);
  } catch (err) {
    if (err instanceof PurchasingError) return { error: err.message };
    throw err;
  }
  await logActivity({
    adminId: admin.id,
    actorName: admin.username,
    action: "supplier_payment.delete",
    detail: `#${id}`,
  });
  revalidatePath(`/admin/inventory/purchase-orders/${purchaseOrderId}`);
  revalidatePath("/admin/inventory/suppliers");
  return { success: "Payment removed." };
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
    // Where the delivery landed. Blank means the shop keeps no locations, and
    // the movement records none rather than guessing at one.
    const rawLocation = String(formData.get("locationId") ?? "").trim();
    const locationId = rawLocation ? Number(rawLocation) : null;

    await receivePurchaseOrder(
      id,
      receipts,
      admin.username,
      Number.isFinite(locationId) ? locationId : null,
    );
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

// ── Quick product creation, from inside a purchase order ────────────────────

/** One option of a quick-created product, as the picker will show it. */
export interface QuickVariant {
  id: number;
  label: string;
}

export interface QuickProductResult {
  error?: string;
  product?: {
    id: number;
    name: string;
    purchaseCost: number;
    variants: QuickVariant[];
  };
}

/**
 * Create a DRAFT product from the purchase-order form.
 *
 * A purchase-order line needs a product row to point at, so ordering stock for
 * something new used to mean leaving the form, inventing a price and a stock
 * figure the product doesn't have yet, and coming back. This captures only what
 * a PO actually needs — how it sells, a category, and the options being ordered
 * — and leaves the product DRAFT so it can't reach the storefront until someone
 * photographs and prices it.
 *
 * `sellingType` is authoritative over the two option lists: it is what the
 * admin picked first, and colours/sizes that don't belong to that shape are
 * discarded rather than quietly turned into variants.
 *
 * Opening stock is deliberately zero: the units are being ORDERED, not held.
 * They arrive through the ledger when the PO is received, which is the whole
 * point of ordering them here.
 */
export async function quickCreateProductAction(formData: FormData): Promise<QuickProductResult> {
  const admin = await requirePermission("inventory");

  const name = String(formData.get("name") ?? "").trim();
  const categoryId = Number(formData.get("categoryId"));
  if (!name) return { error: "Give the product a name." };
  if (!categoryId) return { error: "Choose a category." };

  // How it is sold is picked FIRST on the panel, and it decides which of the
  // two lists below is allowed to contribute rows — mirroring the product
  // form, where the same three cards drive the whole Options step.
  const sellingType = String(formData.get("sellingType") ?? "");
  if (sellingType !== "single" && sellingType !== "colors" && sellingType !== "sizes") {
    return { error: "Choose how the product is sold." };
  }

  // Colours and sizes arrive as comma-separated text — the fastest thing to
  // type while you have a supplier on the phone. The full matrix editor is on
  // the product form, for when the product is finished.
  const split = (key: string) =>
    String(formData.get(key) ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

  // A SINGLE product carries no options at all, and a COLORS one carries no
  // sizes — dropping them here rather than trusting the panel keeps a stale
  // field from silently becoming a variant matrix nobody asked for.
  const colors = sellingType === "single" ? [] : [...new Set(split("colors"))];
  const sizes = sellingType === "sizes" ? [...new Set(split("sizes"))] : [];

  if (sellingType === "colors" && colors.length === 0) {
    return { error: "Name at least one colour, or sell it as a single item." };
  }
  if (sellingType === "sizes" && sizes.length === 0) {
    return { error: "Name at least one size, or sell it as a single item." };
  }

  // Every combination that was named. With neither list this is a simple
  // product and carries no variants at all.
  const variants: { colorName: string | null; size: string | null; price: number; stock: number }[] = [];
  if (colors.length > 0 || sizes.length > 0) {
    const colorList = colors.length > 0 ? colors : [null];
    const sizeList = sizes.length > 0 ? sizes : [null];
    for (const c of colorList) {
      for (const s of sizeList) {
        variants.push({ colorName: c, size: s, price: 0, stock: 0 });
      }
    }
  }

  // Sizing travels with the product so the finished form and the storefront
  // resolve the same chips, label and chart. "" means inherit the category's,
  // which is the normal case — an explicit guide here is the override.
  const sizeGuideRaw = String(formData.get("sizeGuideId") ?? "").trim();
  const sizeGuideId = sellingType === "sizes" && sizeGuideRaw ? Number(sizeGuideRaw) : null;
  const sizeLabel = sellingType === "sizes" ? String(formData.get("sizeLabel") ?? "").trim() : "";
  const sizeChart = sellingType === "sizes" ? String(formData.get("sizeChart") ?? "").trim() : "";

  try {
    const created = await createProduct(
      {
        name,
        categoryId,
        // Not priced yet — that is what finishing the product is for. The
        // publish guard blocks ACTIVE until a real price and a photo exist.
        price: 0,
        stock: 0,
        purchaseCost: takaToPaisa(Number(formData.get("purchaseCost")) || 0),
        status: "DRAFT",
        variants: variants.length > 0 ? variants : undefined,
        colors: colors.map((c) => ({ name: c, hexCode: "#000000" })),
        sizeGuideId,
        sizeLabel: sizeLabel || null,
        sizeChart: sizeChart || null,
      },
      admin.username,
    );

    const fresh = await getProductById(created.id);

    await logActivity({
      adminId: admin.id,
      actorName: admin.username,
      action: "product.quick_create",
      detail: `${name} (draft, from purchase order)`,
    });

    return {
      product: {
        id: created.id,
        name: created.name,
        purchaseCost: created.purchaseCost,
        variants: (fresh?.variants ?? []).map((v) => ({
          id: v.id,
          label: [v.colorName, v.size].filter(Boolean).join(" / ") || "Option",
        })),
      },
    };
  } catch (err) {
    if (err instanceof ProductPublishError || err instanceof ProductStockError) {
      return { error: err.message };
    }
    throw err;
  }
}
