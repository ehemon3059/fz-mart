"use client";

import Link from "next/link";
import { useState } from "react";
import type { StockMovementType } from "@prisma/client";
import { Icon } from "@/components/icons";
import { INVENTORY_COPY, type InvLang } from "../content";

export interface MovementRowView {
  id: number;
  when: string;
  type: StockMovementType;
  delta: number;
  beforeQty: number;
  afterQty: number;
  unitCost: string | null;
  reason: string | null;
  actorName: string;
  productId: number;
  productName: string;
  option: string | null;
  sku: string | null;
  orderId: number | null;
  orderNo: string | null;
  isBackfill: boolean;
}

interface Props {
  rows: MovementRowView[];
  products: { id: number; name: string }[];
  total: number;
  page: number;
  pageCount: number;
  active: { product?: string; type?: string; from?: string; to?: string };
}

/** Movement-type pill colours: green in, red out, amber for the odd ones. */
const TYPE_CLS: Record<StockMovementType, string> = {
  PURCHASE: "bg-emerald-50 text-emerald-700",
  SALE: "bg-stone-100 text-stone-600",
  RETURN: "bg-amber-50 text-amber-800",
  CANCEL_RESTOCK: "bg-sky-50 text-sky-700",
  DAMAGE: "bg-rose-50 text-rose-700",
  ADJUSTMENT: "bg-violet-50 text-violet-700",
  // Opening reads as an arrival, but a paler one: no supplier stands behind it.
  OPENING: "bg-teal-50 text-teal-700",
};

const ALL_TYPES: StockMovementType[] = [
  "SALE",
  "CANCEL_RESTOCK",
  "RETURN",
  "DAMAGE",
  "PURCHASE",
  "ADJUSTMENT",
  "OPENING",
];

export default function MovementsClient({ rows, products, total, page, pageCount, active }: Props) {
  const [lang, setLang] = useState<InvLang>("en");
  const t = INVENTORY_COPY[lang].movements;

  const typeLabel = (type: StockMovementType) =>
    ({
      SALE: t.typeSale,
      CANCEL_RESTOCK: t.typeCancelRestock,
      RETURN: t.typeReturn,
      DAMAGE: t.typeDamage,
      PURCHASE: t.typePurchase,
      ADJUSTMENT: t.typeAdjustment,
      OPENING: t.typeOpening,
    })[type];

  /** Keep the active filters when paging. */
  const pageHref = (n: number) => {
    const params = new URLSearchParams();
    if (active.product) params.set("product", active.product);
    if (active.type) params.set("type", active.type);
    if (active.from) params.set("from", active.from);
    if (active.to) params.set("to", active.to);
    if (n > 1) params.set("page", String(n));
    const qs = params.toString();
    return qs ? `/admin/inventory/movements?${qs}` : "/admin/inventory/movements";
  };

  const hasFilters = Boolean(active.product || active.type || active.from || active.to);
  const field =
    "rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-[#0B2B26]";
  const label = "mb-1 block text-[12px] font-semibold text-stone-600";

  return (
    <div className="pb-10">
      <header className="bg-[#0B2B26] text-stone-100">
        <div className="mx-auto max-w-[1400px] px-4 pb-7 pt-7 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="nums text-[11px] uppercase tracking-[0.28em] text-amber-300/80">
                Ledger
              </p>
              <h1 className="mt-1.5 text-[26px] font-extrabold leading-none tracking-tight sm:text-[32px]">
                {t.heading}
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-stone-300/70">
                {t.subtitle}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setLang((l) => (l === "en" ? "bn" : "en"))}
              className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/10 px-3.5 py-2 text-[13px] font-semibold text-stone-100 hover:bg-white/20"
            >
              <Icon name="globe" size={15} />
              {INVENTORY_COPY[lang].toggleLabel}
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-6 sm:px-7">
        {/* Plain GET form, so every view is a shareable URL. */}
        <form className="flex flex-wrap items-end gap-3 rounded-xl border border-stone-200 bg-white p-4">
          <div>
            <label className={label}>{t.filterProduct}</label>
            <select name="product" defaultValue={active.product ?? ""} className={field}>
              <option value="">{t.filterAllProducts}</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>{t.filterType}</label>
            <select name="type" defaultValue={active.type ?? ""} className={field}>
              <option value="">{t.filterAllTypes}</option>
              {ALL_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {typeLabel(ty)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>{t.filterFrom}</label>
            <input type="date" name="from" defaultValue={active.from ?? ""} className={field} />
          </div>
          <div>
            <label className={label}>{t.filterTo}</label>
            <input type="date" name="to" defaultValue={active.to ?? ""} className={field} />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[#0B2B26] px-4 py-2 text-sm font-semibold text-white"
          >
            {t.filterApply}
          </button>
          {hasFilters && (
            <Link
              href="/admin/inventory/movements"
              className="px-1 py-2 text-sm text-stone-500 underline-offset-2 hover:text-emerald-700 hover:underline"
            >
              {t.filterClear}
            </Link>
          )}
        </form>

        {total === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-stone-800">
              {hasFilters ? t.emptyFilteredTitle : t.emptyTitle}
            </p>
            <p className="mt-1 text-[13px] text-stone-500">
              {hasFilters ? t.emptyFilteredBody : t.emptyBody}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1020px] text-sm">
                  <thead className="bg-[#0B2B26] text-[11px] uppercase tracking-wider text-stone-100">
                    <tr>
                      <th className="px-5 py-3 text-left font-semibold">{t.colWhen}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t.colProduct}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t.colType}</th>
                      <th className="px-4 py-3 text-right font-semibold">{t.colChange}</th>
                      <th className="px-4 py-3 text-right font-semibold">{t.colBefore}</th>
                      <th className="px-4 py-3 text-right font-semibold">{t.colAfter}</th>
                      <th className="px-4 py-3 text-left font-semibold">{t.colReference}</th>
                      <th className="px-4 py-3 text-right font-semibold">{t.colUnitCost}</th>
                      <th className="px-5 py-3 text-left font-semibold">{t.colBy}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <tr key={m.id} className="border-b border-stone-100 hover:bg-stone-50/60">
                        <td className="nums whitespace-nowrap px-5 py-3.5 text-stone-500">
                          {m.when}
                        </td>
                        <td className="px-4 py-3.5">
                          <Link
                            href={`/admin/products/${m.productId}/edit`}
                            className="font-medium text-stone-800 hover:text-emerald-700 hover:underline"
                          >
                            {m.productName}
                          </Link>
                          {m.option && <span className="text-stone-500"> — {m.option}</span>}
                          {m.sku && <div className="nums text-[11px] text-stone-400">{m.sku}</div>}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`nums inline-block rounded px-2 py-1 text-[10px] font-semibold ${TYPE_CLS[m.type]}`}
                          >
                            {typeLabel(m.type)}
                          </span>
                        </td>
                        <td
                          className={`nums px-4 py-3.5 text-right font-bold ${
                            m.delta > 0 ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {m.delta > 0 ? `+${m.delta}` : m.delta}
                        </td>
                        {/* Backfilled rows carry a real delta but no historical
                            levels — "0 → 0" would be a lie, so they read as
                            unknown. */}
                        <td className="nums px-4 py-3.5 text-right text-stone-400">
                          {m.isBackfill ? "—" : m.beforeQty}
                        </td>
                        <td
                          className={`nums px-4 py-3.5 text-right ${
                            m.isBackfill ? "text-stone-400" : "font-semibold text-stone-700"
                          }`}
                        >
                          {m.isBackfill ? "—" : m.afterQty}
                        </td>
                        <td className="px-4 py-3.5 text-stone-500">
                          {m.orderId && m.orderNo ? (
                            <Link
                              href={`/admin/orders/${m.orderId}`}
                              className="nums hover:text-emerald-700 hover:underline"
                            >
                              {m.orderNo}
                            </Link>
                          ) : (
                            <span className="text-[12px]">{m.reason ?? "—"}</span>
                          )}
                        </td>
                        <td className="nums px-4 py-3.5 text-right text-stone-500">
                          {m.unitCost ?? "—"}
                        </td>
                        <td className="px-5 py-3.5 text-[12px] text-stone-500">{m.actorName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {pageCount > 1 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-stone-500">
                  {t.pageInfo(page, pageCount, total.toLocaleString("en-BD"))}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={pageHref(page - 1)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 hover:border-stone-400"
                    >
                      {t.prev}
                    </Link>
                  )}
                  {page < pageCount && (
                    <Link
                      href={pageHref(page + 1)}
                      className="rounded-lg border border-stone-300 px-3 py-1.5 hover:border-stone-400"
                    >
                      {t.next}
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        <div className="rounded-xl border-l-4 border-amber-400 border-y border-r border-stone-200 bg-white p-5">
          <p className="text-[13.5px] font-bold text-stone-900">{t.noteTitle}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-stone-500">{t.noteBody}</p>
        </div>
      </div>
    </div>
  );
}
