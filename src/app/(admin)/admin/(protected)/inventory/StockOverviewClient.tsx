"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { INVENTORY_COPY, type InvLang } from "./content";
import DigestToggle from "./DigestToggle";

/** Row shape flattened by the server page — no Dates, so it crosses the boundary. */
export interface OverviewRowView {
  key: string;
  productId: number;
  name: string;
  option: string | null;
  sku: string | null;
  categoryPath: string;
  onHand: number;
  reserved: number;
  available: number;
  incoming: number;
  incomingOn: string | null;
  unitCost: string | null;
  stockValue: string | null;
  reorderPoint: number;
  lowStockThreshold: number;
  dailyVelocity: number;
  status: "OUT" | "REORDER" | "DEAD" | "OK";
}

export interface OverviewTotalsView {
  outOfStock: number;
  needsReorder: number;
  deadRows: number;
  totalUnits: string;
  totalReserved: string;
  totalValue: string;
  deadValue: string;
  hasUnknownCost: boolean;
}

interface Props {
  rows: OverviewRowView[];
  totalRowCount: number;
  totals: OverviewTotalsView;
  filter?: string;
  digestEnabled: boolean;
  writeOffs: { units: number; value: string; days: number };
  constants: { deadDays: number; velocityWindow: number; leadDays: number; safetyDays: number };
}

/** Status pill colours, tuned to the ledger palette rather than generic tones. */
const STATUS_CLS: Record<OverviewRowView["status"], string> = {
  OUT: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
  REORDER: "bg-amber-50 text-amber-800 ring-1 ring-amber-200",
  DEAD: "bg-stone-100 text-stone-500 ring-1 ring-stone-200",
  OK: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
};

export default function StockOverviewClient({
  rows,
  totalRowCount,
  totals,
  filter,
  digestEnabled,
  writeOffs,
  constants,
}: Props) {
  const [lang, setLang] = useState<InvLang>("en");
  const t = INVENTORY_COPY[lang].overview;

  const statusLabel = (s: OverviewRowView["status"]) =>
    s === "OUT"
      ? t.statusOut
      : s === "REORDER"
        ? t.statusReorder
        : s === "DEAD"
          ? t.statusDead(constants.deadDays)
          : t.statusOk;

  const kpis = [
    {
      key: "out",
      label: t.kpiOut,
      value: String(totals.outOfStock),
      sub: t.kpiOutSub,
      accent: "text-rose-300",
    },
    {
      key: "reorder",
      label: t.kpiReorder,
      value: String(totals.needsReorder),
      sub: t.kpiReorderSub,
      accent: "text-amber-300",
    },
    {
      key: "dead",
      label: t.kpiDead,
      value: totals.deadValue,
      sub: t.kpiDeadSub(totals.deadRows, constants.deadDays),
      accent: "text-stone-300",
    },
    {
      key: "value",
      label: t.kpiValue,
      value: totals.totalValue,
      sub: t.kpiValueSub(totals.totalUnits, totals.totalReserved),
      accent: "text-emerald-300",
    },
  ];

  return (
    <div className="pb-10">
      {/* ── Dark header with the KPI strip, per the ledger design ───────── */}
      <header className="bg-[#0B2B26] text-stone-100">
        <div className="mx-auto max-w-[1400px] px-4 pb-8 pt-7 sm:px-7">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="nums text-[11px] uppercase tracking-[0.28em] text-amber-300/80">
                Inventory
              </p>
              <h1 className="mt-1.5 text-[26px] font-extrabold leading-none tracking-tight sm:text-[32px]">
                {t.heading}
              </h1>
              <p className="mt-2 max-w-xl text-[13px] leading-relaxed text-stone-300/70">
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

          {/* KPI strip — hairline gaps rather than separate cards, so the four
              numbers read as one instrument panel. */}
          <div className="mt-7 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 lg:grid-cols-4">
            {kpis.map((k) => {
              const inner = (
                <div className="h-full bg-[#123F37] p-4 sm:p-5">
                  <p className="text-[11px] uppercase tracking-widest text-stone-300/50">
                    {k.label}
                  </p>
                  <p className={`nums mt-1 text-2xl font-semibold ${k.accent}`}>{k.value}</p>
                  <p className="mt-1 text-[11.5px] text-stone-300/45">{k.sub}</p>
                </div>
              );
              return k.key === "value" ? (
                <div key={k.key}>{inner}</div>
              ) : (
                <Link
                  key={k.key}
                  href={`/admin/inventory?filter=${k.key}`}
                  className="outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-amber-300"
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1400px] space-y-5 px-4 pt-6 sm:px-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            {filter && (
              <>
                <span className="text-sm text-stone-500">
                  {t.showing(rows.length, totalRowCount)}
                </span>
                <Link
                  href="/admin/inventory"
                  className="text-sm text-emerald-700 underline-offset-2 hover:underline"
                >
                  {t.clearFilter}
                </Link>
              </>
            )}
          </div>
          <DigestToggle
            enabled={digestEnabled}
            labels={{ title: t.digestTitle, sub: t.digestSub, send: t.digestSend }}
          />
        </div>

        {writeOffs.units > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-l-4 border-rose-400 border-y border-r border-stone-200 bg-white px-4 py-3">
            <p className="text-[13px]">
              <span className="font-semibold text-stone-800">{t.writeOff(writeOffs.units)}</span>
              <span className="text-stone-500">
                {t.writeOffTail(writeOffs.days, writeOffs.value)}
              </span>
            </p>
            <Link
              href="/admin/inventory/movements?type=DAMAGE"
              className="text-[13px] text-emerald-700 underline-offset-2 hover:underline"
            >
              {t.writeOffLink}
            </Link>
          </div>
        )}

        {totals.hasUnknownCost && (
          <p className="rounded-xl border-l-4 border-amber-400 border-y border-r border-stone-200 bg-white px-4 py-3 text-[13px] text-stone-600">
            {t.unknownCost}
          </p>
        )}

        {/* ── The table ──────────────────────────────────────────────────── */}
        {totalRowCount === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-white px-6 py-14 text-center">
            <p className="text-[15px] font-semibold text-stone-800">{t.emptyTitle}</p>
            <p className="mt-1 text-[13px] text-stone-500">{t.emptyBody}</p>
            <Link
              href="/admin/products/new"
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0B2B26] px-4 py-2 text-[13px] font-semibold text-white"
            >
              <Icon name="plus" size={14} />
              {t.emptyAction}
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-[#0B2B26] text-[11px] uppercase tracking-wider text-stone-100">
                  <tr>
                    <th className="px-5 py-3 text-left font-semibold">{t.colProduct}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.colOnHand}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.colReserved}</th>
                    {/* Available is the number that matters — lifted out of the
                        header row with a lighter panel so the eye lands on it. */}
                    <th className="bg-white/10 px-4 py-3 text-right font-semibold">
                      {t.colAvailable}
                    </th>
                    <th className="px-4 py-3 text-right font-semibold">{t.colIncoming}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.colReorderAt}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.colSoldPerDay}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t.colValue}</th>
                    <th className="px-5 py-3 text-left font-semibold">{t.colStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.key} className="border-b border-stone-100 hover:bg-stone-50/60">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/products/${r.productId}/edit`}
                          className="font-semibold text-stone-800 hover:text-emerald-700 hover:underline"
                        >
                          {r.name}
                        </Link>
                        {r.option && <span className="text-stone-500"> — {r.option}</span>}
                        <div className="nums text-[11px] text-stone-400">
                          {r.sku ?? r.categoryPath}
                        </div>
                      </td>
                      <td className="nums px-4 py-3.5 text-right text-stone-600">{r.onHand}</td>
                      <td
                        className={`nums px-4 py-3.5 text-right ${
                          r.reserved > 0 ? "text-stone-600" : "text-stone-300"
                        }`}
                      >
                        {r.reserved > 0 ? r.reserved : "—"}
                      </td>
                      <td
                        className={`nums bg-stone-50 px-4 py-3.5 text-right font-bold ${
                          r.available <= 0 ? "text-rose-600" : "text-stone-900"
                        }`}
                      >
                        {r.available}
                      </td>
                      <td
                        className={`nums px-4 py-3.5 text-right ${
                          r.incoming > 0 ? "text-emerald-600" : "text-stone-300"
                        }`}
                      >
                        {r.incoming > 0 ? `+${r.incoming}` : "—"}
                        {r.incoming > 0 && r.incomingOn && (
                          <div className="text-[10.5px] font-normal text-stone-400">
                            {r.incomingOn}
                          </div>
                        )}
                      </td>
                      <td className="nums px-4 py-3.5 text-right text-stone-500">
                        {r.reorderPoint > 0
                          ? r.reorderPoint
                          : r.lowStockThreshold > 0
                            ? r.lowStockThreshold
                            : "—"}
                      </td>
                      <td className="nums px-4 py-3.5 text-right text-stone-500">
                        {r.dailyVelocity > 0 ? r.dailyVelocity.toFixed(2) : "—"}
                      </td>
                      <td className="nums px-4 py-3.5 text-right font-medium text-stone-800">
                        {r.stockValue ?? "—"}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className={`inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_CLS[r.status]}`}
                        >
                          {statusLabel(r.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={9} className="px-4 py-12 text-center text-sm text-stone-400">
                        {t.noMatch}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── How the numbers are derived. Shown, not hidden: a reorder point
            nobody can explain is a reorder point nobody trusts. ─────────── */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {[
            {
              title: t.explainAvailableTitle,
              formula: t.explainAvailableFormula,
              body: t.explainAvailableBody,
            },
            {
              title: t.explainReorderTitle,
              formula: t.explainReorderFormula(constants.leadDays, constants.safetyDays),
              body: t.explainReorderBody(constants.velocityWindow),
            },
            {
              title: t.explainValueTitle,
              formula: t.explainValueFormula,
              body: t.explainValueBody,
            },
            {
              title: t.explainDeadTitle,
              formula: t.explainDeadFormula(constants.deadDays),
              body: t.explainDeadBody,
            },
          ].map((card) => (
            <div key={card.title} className="rounded-xl border border-stone-200 bg-white p-5">
              <p className="text-[13.5px] font-bold text-stone-900">{card.title}</p>
              <p className="nums mt-2 rounded-md bg-stone-100 px-3 py-2 text-[12px] text-stone-600">
                {card.formula}
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-stone-500">{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
