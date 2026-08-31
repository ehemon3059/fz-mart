"use client";

/**
 * Supplier -> purchased product, at the top of the create screen.
 *
 * The mistake this prevents: goods arrive on a purchase order, which leaves a
 * DRAFT product holding the stock, the supplier and the cost but no price and
 * no photos. The admin then comes to "New product" to put it on sale and types
 * the same shirt in again — and now the shop has two rows for one shirt, the
 * stock on one and the price on the other.
 *
 * So the first question this screen asks is no longer "what is it called" but
 * "who did you buy it from". Picking a supplier lists what they have sold us,
 * unfinished drafts first, and picking one of those continues that product on
 * its edit page instead of starting a second record. Creating something
 * genuinely new is still one click away, underneath.
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { ProductStatus } from "@prisma/client";
import { formatTaka } from "@/lib/money";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";
import { Icon } from "@/components/icons";
import { loadSupplierProductsAction, type SupplierProductView } from "./actions";

export interface SupplierOption {
  id: number;
  name: string;
}

const STATUS: Record<ProductStatus, { label: string; tone: BadgeTone }> = {
  DRAFT: { label: "Draft", tone: "warning" },
  ACTIVE: { label: "Published", tone: "success" },
  INACTIVE: { label: "Hidden", tone: "neutral" },
};

export default function SupplierSourcing({
  suppliers,
  onCreateNew,
  createNewChosen,
}: {
  suppliers: SupplierOption[];
  /** "None of these" — reveals the blank form below. */
  onCreateNew: () => void;
  /** The blank form is already open, so the button becomes a quiet reminder. */
  createNewChosen: boolean;
}) {
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [rows, setRows] = useState<SupplierProductView[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  function pickSupplier(value: string) {
    const id = value ? Number(value) : null;
    setSupplierId(id);
    setRows(null);
    setError(null);
    setQuery("");
    if (id == null) return;
    startTransition(async () => {
      const res = await loadSupplierProductsAction(id);
      if (res.error) setError(res.error);
      else setRows(res.rows ?? []);
    });
  }

  const visible = useMemo(() => {
    if (!rows) return [];
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.lastPurchase.poNo.toLowerCase().includes(q),
    );
  }, [rows, query]);

  const draftCount = rows?.filter((r) => r.status === "DRAFT").length ?? 0;
  // Where the "already on the storefront" half of the list starts, so the two
  // groups can be separated without sorting them again on the client.
  const firstFinishedIndex = visible.findIndex((r) => r.status !== "DRAFT");

  return (
    <div className="rounded-xl border border-stone-200 bg-white shadow-card">
      <div className="border-b border-stone-100 px-5 py-4">
        <h2 className="text-[15px] font-bold text-stone-900">Did you already buy this?</h2>
        <p className="mt-1 max-w-3xl text-[13px] text-stone-500">
          Goods received on a purchase order are already in the catalogue as drafts — with their
          supplier, cost and quantity attached. Pick the supplier to find one and finish it, rather
          than creating a second record for the same product.
        </p>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[16rem] flex-1">
            <label
              htmlFor="sourcing-supplier"
              className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-stone-500"
            >
              Supplier
            </label>
            <select
              id="sourcing-supplier"
              value={supplierId ?? ""}
              onChange={(e) => pickSupplier(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
            >
              <option value="">Choose a supplier…</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {rows && rows.length > 6 && (
            <div className="min-w-[14rem] flex-1">
              <label
                htmlFor="sourcing-search"
                className="mb-1 block text-[12px] font-semibold uppercase tracking-wide text-stone-500"
              >
                Find
              </label>
              <input
                id="sourcing-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Product name or PO number"
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-800 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </div>
          )}
        </div>

        {suppliers.length === 0 && (
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-[13px] text-stone-600">
            No suppliers on record yet.{" "}
            <Link href="/admin/inventory/suppliers" className="font-semibold text-accent underline-offset-2 hover:underline">
              Add one
            </Link>{" "}
            to start buying through purchase orders — or just create the product below.
          </p>
        )}

        {pending && (
          <p className="px-1 py-6 text-center text-[13px] text-stone-400">
            Looking up what this supplier has sent you…
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-danger bg-danger-soft px-4 py-3 text-[13px] text-danger-fg">
            {error}
          </p>
        )}

        {!pending && rows && rows.length === 0 && (
          <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-6 text-center text-[13px] text-stone-500">
            Nothing has been purchased from this supplier yet. Create the product below, or{" "}
            <Link
              href="/admin/inventory/purchase-orders/new"
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              write a purchase order
            </Link>{" "}
            first.
          </p>
        )}

        {!pending && rows && rows.length > 0 && (
          <>
            {draftCount > 0 && (
              <p className="text-[12.5px] text-stone-500">
                <span className="font-semibold text-stone-700">
                  {draftCount} unfinished {draftCount === 1 ? "product" : "products"}
                </span>{" "}
                from this supplier — bought and in stock, but not yet on sale.
              </p>
            )}

            <ul className="space-y-2">
              {visible.map((row, i) => (
                <li key={row.productId}>
                  {/* The heading only makes sense between the two groups, and
                      only when the drafts above it were actually rendered. */}
                  {i === firstFinishedIndex && i > 0 && (
                    <div className="px-1 pb-2 pt-3 text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
                      Already set up
                    </div>
                  )}
                  <PurchasedRow row={row} />
                </li>
              ))}
              {visible.length === 0 && (
                <li className="px-1 py-6 text-center text-[13px] text-stone-400">
                  Nothing here matches “{query}”.
                </li>
              )}
            </ul>
          </>
        )}
      </div>

      <div className="border-t border-stone-100 bg-stone-50/70 px-5 py-4">
        {createNewChosen ? (
          <p className="text-[13px] text-stone-500">
            Creating a brand-new product below. Bought it from a supplier already? Pick them above
            instead, so the purchase and the listing stay on one record.
          </p>
        ) : (
          <button
            type="button"
            onClick={onCreateNew}
            className="inline-flex items-center gap-2 rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:border-stone-400 hover:bg-white"
          >
            <Icon name="plus" size={16} />
            None of these — create a brand-new product
          </button>
        )}
      </div>
    </div>
  );
}

/** One purchased product: what it cost, what is on the shelf, what is missing. */
function PurchasedRow({ row }: { row: SupplierProductView }) {
  const status = STATUS[row.status];
  const needsPrice = row.price == null || row.unpricedOptions > 0;

  return (
    <Link
      href={`/admin/products/${row.productId}/edit`}
      className="flex items-start gap-4 rounded-xl border border-stone-200 bg-white p-3 transition hover:border-accent hover:bg-accent-soft/30"
    >
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
        {row.imageUrl ? (
          <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <Icon name="image" size={18} />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-[14px] font-semibold text-stone-900">{row.name}</span>
          <Badge tone={status.tone}>{status.label}</Badge>
          {row.variantCount > 0 && (
            <span className="text-[11.5px] text-stone-400">{row.variantCount} options</span>
          )}
        </div>

        <div className="mt-0.5 text-[12px] text-stone-500">
          {row.lastPurchase.poNo} · {row.lastPurchase.on}
          {row.lastPurchase.isBackfill && " · recorded after the fact"}
          {row.incoming > 0 && ` · ${row.incoming} still incoming`}
        </div>

        <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5 text-[12px]">
          <Fact
            label={row.lastPurchase.isLanded ? "Landed cost" : "Ordered at"}
            value={row.lastPurchase.unitCost > 0 ? formatTaka(row.lastPurchase.unitCost) : "—"}
          />
          <Fact label="On hand" value={String(row.onHand)} />
          <Fact
            label="Listed"
            value={row.listedQty == null ? "All" : String(row.listedQty)}
            hint={row.listedQty == null ? "no cap set" : `${row.available} sellable`}
          />
          <Fact
            label="Sell price"
            value={row.price != null ? formatTaka(row.price) : "Not set"}
            tone={needsPrice ? "warn" : "plain"}
            hint={
              row.unpricedOptions > 0
                ? `${row.unpricedOptions} option${row.unpricedOptions === 1 ? "" : "s"} unpriced`
                : undefined
            }
          />
          <Fact label="Bought" value={`${row.unitsPurchased} units`} />
        </div>
      </div>

      <span className="mt-1 shrink-0 self-center text-stone-300">
        <Icon name="chevronRight" size={18} />
      </span>
    </Link>
  );
}

function Fact({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "plain" | "warn";
}) {
  return (
    <span className="inline-flex flex-col">
      <span className="text-[10.5px] font-semibold uppercase tracking-wide text-stone-400">
        {label}
      </span>
      <span
        className={`nums font-semibold ${tone === "warn" ? "text-warning-fg" : "text-stone-800"}`}
      >
        {value}
      </span>
      {hint && <span className="text-[10.5px] text-stone-400">{hint}</span>}
    </span>
  );
}
