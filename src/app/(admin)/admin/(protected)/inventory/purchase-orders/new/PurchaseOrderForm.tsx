"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { formatTaka } from "@/lib/money";
import SearchSelect from "@/components/admin/ui/SearchSelect";
import { createPurchaseOrderAction, updatePurchaseOrderAction } from "../actions";
import QuickProductPanel, { type CategoryOption, type GuideOption } from "./QuickProductPanel";

interface VariantOption {
  id: number;
  label: string;
  /** Last known landed cost in paisa; prefills the line. */
  purchaseCost: number;
}
interface ProductOption {
  id: number;
  name: string;
  purchaseCost: number;
  variants: VariantOption[];
}

interface LineDraft {
  key: number;
  productId: string;
  variantId: string;
  quantity: string;
  /** Unit cost in TAKA, as typed. Converted to paisa server-side. */
  unitCost: string;
}

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";
const label = "mb-1 block text-[12px] font-semibold text-stone-600";

let nextKey = 1;
const blankLine = (): LineDraft => ({
  key: nextKey++,
  productId: "",
  variantId: "",
  quantity: "",
  unitCost: "",
});

/** An existing DRAFT being edited; omitted when writing a new order. */
export interface ExistingOrder {
  id: number;
  supplierId: number;
  /** "yyyy-mm-dd" for the date input, or "". */
  expectedOn: string;
  /** Taka, as strings for the inputs. */
  shippingCost: string;
  customsCost: string;
  note: string;
  lines: {
    productId: string;
    variantId: string;
    quantity: string;
    unitCost: string;
  }[];
}

export default function PurchaseOrderForm({
  suppliers,
  products: initialProducts,
  categories,
  sizeGuides = [],
  order,
}: {
  suppliers: { id: number; name: string }[];
  products: ProductOption[];
  categories: CategoryOption[];
  /** Active size guides, for the quick-create panel's sizing step. */
  sizeGuides?: GuideOption[];
  order?: ExistingOrder;
}) {
  const isEdit = !!order;
  const [lines, setLines] = useState<LineDraft[]>(
    order && order.lines.length > 0
      ? order.lines.map((l) => ({ ...blankLine(), ...l }))
      : [blankLine()],
  );
  // Products are state, not a prop: a draft created from this form has to join
  // the picker immediately, without a round trip that would lose the order
  // being written.
  const [products, setProducts] = useState<ProductOption[]>(initialProducts);
  // Which line opened the "new product" panel, so the result attaches to it.
  const [creatingFor, setCreatingFor] = useState<number | null>(null);
  const [shipping, setShipping] = useState(order?.shippingCost ?? "");
  const [customs, setCustoms] = useState(order?.customsCost ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const byId = new Map(products.map((p) => [String(p.id), p]));

  function patch(key: number, changes: Partial<LineDraft>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...changes } : l)));
  }

  /** Choosing a product resets the option and prefills its last known cost. */
  function chooseProduct(key: number, productId: string) {
    const product = byId.get(productId);
    patch(key, {
      productId,
      variantId: "",
      unitCost: product && product.purchaseCost > 0 ? String(product.purchaseCost / 100) : "",
    });
  }

  /** A variant carries its own cost when set; 0 means inherit the product's. */
  function chooseVariant(key: number, variantId: string) {
    const line = lines.find((l) => l.key === key);
    const product = line ? byId.get(line.productId) : undefined;
    const variant = product?.variants.find((v) => String(v.id) === variantId);
    const cost = variant?.purchaseCost || product?.purchaseCost || 0;
    patch(key, { variantId, unitCost: cost > 0 ? String(cost / 100) : "" });
  }

  /** A draft just created from this form: add it and select it on its line. */
  function adoptNewProduct(
    lineKey: number,
    created: { id: number; name: string; purchaseCost: number; variants: { id: number; label: string }[] },
  ) {
    const option: ProductOption = {
      id: created.id,
      name: created.name,
      purchaseCost: created.purchaseCost,
      variants: created.variants.map((v) => ({ ...v, purchaseCost: 0 })),
    };
    setProducts((prev) => [...prev, option].sort((a, b) => a.name.localeCompare(b.name)));
    patch(lineKey, { productId: String(created.id), variantId: "", unitCost: "" });
    setCreatingFor(null);
  }

  // Running totals, so the admin sees the order's value as they build it.
  const goodsValue = lines.reduce((sum, l) => {
    const qty = Number(l.quantity) || 0;
    const cost = Number(l.unitCost) || 0;
    return sum + qty * cost * 100;
  }, 0);
  const overhead = (Number(shipping) || 0) * 100 + (Number(customs) || 0) * 100;

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // Both actions redirect on success, so anything returned is a failure.
      const res = order
        ? await updatePurchaseOrderAction(order.id, formData)
        : await createPurchaseOrderAction(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={submit} className="space-y-5">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Supplier</label>
            <select name="supplierId" required defaultValue={order?.supplierId ?? ""} className={field}>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Expected on</label>
            <input type="date" name="expectedOn" defaultValue={order?.expectedOn ?? ""} className={field} />
            <p className="mt-1 text-[11px] text-stone-400">When the goods should arrive.</p>
          </div>
          <div>
            <label className={label}>Note</label>
            <input name="note" defaultValue={order?.note ?? ""} className={field} placeholder="Optional" />
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <h2 className="mb-3 text-[13px] font-semibold text-stone-900">Products</h2>
        <div className="space-y-3">
          {lines.map((line) => {
            const product = byId.get(line.productId);
            const hasVariants = (product?.variants.length ?? 0) > 0;
            return (
              <div
                key={line.key}
                className="grid gap-2 rounded-lg border border-stone-200 p-3 sm:grid-cols-12"
              >
                <div className="sm:col-span-5">
                  <label className={label}>Product</label>
                  {/* Always submits, even when empty, so the parallel arrays in
                      the action stay aligned across rows. */}
                  <SearchSelect
                    name="lineProductId"
                    value={line.productId}
                    onChange={(v) => chooseProduct(line.key, v)}
                    placeholder="Type to search…"
                    options={products.map((p) => ({
                      value: String(p.id),
                      label: p.name,
                      hint: p.variants.length > 0 ? `${p.variants.length} options` : undefined,
                    }))}
                    action={{ label: "New product", onSelect: () => setCreatingFor(line.key) }}
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className={label}>Option</label>
                  {/* Always submitted, even when empty, so the parallel arrays
                      in the action stay aligned across rows. */}
                  <select
                    name="lineVariantId"
                    value={line.variantId}
                    onChange={(e) => chooseVariant(line.key, e.target.value)}
                    disabled={!hasVariants}
                    className={`${field} disabled:bg-stone-50 disabled:text-stone-400`}
                  >
                    <option value="">{hasVariants ? "Choose…" : "—"}</option>
                    {product?.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Quantity</label>
                  <input
                    name="lineQuantity"
                    type="number"
                    min="1"
                    value={line.quantity}
                    onChange={(e) => patch(line.key, { quantity: e.target.value })}
                    className={field}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={label}>Unit cost ৳</label>
                  <input
                    name="lineUnitCost"
                    type="number"
                    min="0"
                    step="0.01"
                    value={line.unitCost}
                    onChange={(e) => patch(line.key, { unitCost: e.target.value })}
                    className={field}
                  />
                </div>
                {lines.length > 1 && (
                  <div className="sm:col-span-12">
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((l) => l.key !== line.key))}
                      className="text-[12px] text-stone-400 hover:text-danger-fg"
                    >
                      Remove line
                    </button>
                  </div>
                )}

                {/* Sits inside the row that opened it, so it is obvious which
                    line the new product will land on. */}
                {creatingFor === line.key && (
                  <div className="sm:col-span-12">
                    <QuickProductPanel
                      categories={categories}
                      sizeGuides={sizeGuides}
                      onCreated={(created) => adoptNewProduct(line.key, created)}
                      onCancel={() => setCreatingFor(null)}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => setLines((prev) => [...prev, blankLine()])}
          className="mt-3 rounded-lg border border-stone-300 px-3 py-1.5 text-[13px] font-medium text-stone-700 hover:border-stone-400"
        >
          Add another product
        </button>
      </div>

      {/* Shipment-level costs */}
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <h2 className="mb-1 text-[13px] font-semibold text-stone-900">Shipment costs</h2>
        <p className="mb-3 text-[12px] text-stone-500">
          Costs for the delivery as a whole. Spread across the lines by value when you receive
          them, so each product&rsquo;s landed cost reflects what it really cost to get here.
        </p>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className={label}>Freight ৳</label>
            <input
              name="shippingCost"
              type="number"
              min="0"
              step="0.01"
              value={shipping}
              onChange={(e) => setShipping(e.target.value)}
              className={field}
            />
          </div>
          <div>
            <label className={label}>Customs / clearing ৳</label>
            <input
              name="customsCost"
              type="number"
              min="0"
              step="0.01"
              value={customs}
              onChange={(e) => setCustoms(e.target.value)}
              className={field}
            />
          </div>
          <div className="flex items-end">
            <div className="w-full rounded-lg bg-stone-50 px-3 py-2">
              <p className="text-[11px] uppercase tracking-wide text-stone-500">Order total</p>
              <p className="nums text-lg font-bold text-stone-900">
                {formatTaka(goodsValue + overhead)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger-fg">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : isEdit ? "Save changes" : "Create draft"}
        </button>
        <Link
          href={
            order
              ? `/admin/inventory/purchase-orders/${order.id}`
              : "/admin/inventory/purchase-orders"
          }
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          Cancel
        </Link>
      </div>
      <p className="text-[12px] text-stone-400">
        {isEdit
          ? "Still a draft. Nothing counts as incoming until you place it."
          : "Saved as a draft. Nothing counts as incoming until you place it."}
      </p>
    </form>
  );
}
