"use client";

import { useMemo, useState, useTransition } from "react";
import { setListedQtyAction } from "../../inventory-actions";

// How much of the shelf is actually for sale.
//
// The distinction this panel exists to make visible: PHYSICAL stock and
// OFFERED stock are two different numbers, and only the first belongs to the
// ledger. Buying 100 shirts and selling 50 of them is one product with one
// stock figure and a listing decision on top — not two listings, and not a
// half-received purchase order.
//
// A blank box means UNLIMITED — "sell whatever is on hand" — which is NOT the
// same as a typed 0 ("list nothing, take it off sale"). The two are kept
// distinct all the way to the database, so the placeholder says so out loud.

export interface ListingRowView {
  variantId: number | null;
  label: string;
  stock: number;
  reserved: number;
  listedQty: number | null;
  maxListable: number;
  available: number;
  heldBack: number;
}

export interface ListingTotalsView {
  onHand: number;
  reserved: number;
  listed: number | null;
  available: number;
  heldBack: number;
  purchased: number;
  sold: number;
  incoming: number;
}

const box =
  "w-24 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-[13px] text-stone-800 outline-none focus:border-brand-500 disabled:bg-stone-50 disabled:text-stone-400";

/** One figure in the summary strip. */
function Stat({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "plain" | "good" | "warn";
}) {
  const colour =
    tone === "good" ? "text-emerald-700" : tone === "warn" ? "text-amber-700" : "text-stone-900";
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-stone-400">{label}</div>
      <div className={`text-[17px] font-bold tabular-nums ${colour}`}>{value}</div>
      {hint && <div className="text-[11px] text-stone-400">{hint}</div>}
    </div>
  );
}

export default function ListingPanel({
  productId,
  rows: initialRows,
  totals: initialTotals,
}: {
  productId: number;
  rows: ListingRowView[];
  totals: ListingTotalsView;
}) {
  // Draft values as typed. "" = unlimited, which is why these are strings
  // rather than numbers — a number type cannot hold the difference between
  // "no limit" and "zero".
  const [draft, setDraft] = useState<string[]>(() =>
    initialRows.map((r) => (r.listedQty == null ? "" : String(r.listedQty))),
  );
  const [bulk, setBulk] = useState("");
  const [rows, setRows] = useState(initialRows);
  const [totals, setTotals] = useState(initialTotals);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isVariant = rows.length > 1 || rows[0]?.variantId != null;

  /** Live preview of what the typed values would mean, before saving. */
  const preview = useMemo(() => {
    let listed = 0;
    let anyCap = false;
    let available = 0;
    let over = 0;
    rows.forEach((r, i) => {
      const raw = draft[i]?.trim() ?? "";
      if (raw === "") {
        available += r.maxListable; // uncapped: everything free is sellable
        return;
      }
      const n = Math.max(0, Math.floor(Number(raw) || 0));
      anyCap = true;
      listed += n;
      available += Math.min(r.maxListable, n);
      if (n > r.maxListable) over++;
    });
    return { listed: anyCap ? listed : null, available, over };
  }, [draft, rows]);

  const dirty = rows.some((r, i) => {
    const raw = draft[i]?.trim() ?? "";
    const current = r.listedQty == null ? "" : String(r.listedQty);
    return raw !== current;
  });

  const setRow = (i: number, v: string) =>
    setDraft((d) => d.map((x, j) => (j === i ? v.replace(/[^\d]/g, "") : x)));

  /** Put the same number on every option, clamped to what each one can hold. */
  const applyBulk = () => {
    const raw = bulk.trim();
    if (raw === "") return;
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    setDraft(rows.map((r) => String(Math.min(n, r.maxListable))));
  };

  /** Offer everything that is physically free — the common "sell it all" case. */
  const listEverything = () => setDraft(rows.map((r) => String(r.maxListable)));

  /** Blank every box: no limit at all, the pre-listing behaviour. */
  const clearAll = () => setDraft(rows.map(() => ""));

  function save() {
    setError(null);
    setSaved(null);
    if (preview.over > 0) {
      setError(
        `${preview.over} option${preview.over === 1 ? "" : "s"} ask for more units than are available in inventory.`,
      );
      return;
    }
    const fd = new FormData();
    rows.forEach((r, i) => {
      fd.append("listingVariantId", r.variantId == null ? "" : String(r.variantId));
      fd.append("listingQty", draft[i]?.trim() ?? "");
    });
    startTransition(async () => {
      const res = await setListedQtyAction(productId, fd);
      if (res.error) {
        setError(res.error);
        return;
      }
      // Reflect what was just saved without a round trip: recompute each row
      // from the values the server accepted.
      const next = rows.map((r, i) => {
        const raw = draft[i]?.trim() ?? "";
        const listedQty = raw === "" ? null : Math.max(0, Math.floor(Number(raw) || 0));
        const available = listedQty == null ? r.maxListable : Math.min(r.maxListable, listedQty);
        return { ...r, listedQty, available, heldBack: Math.max(0, r.maxListable - available) };
      });
      setRows(next);
      const capped = next.filter((r) => r.listedQty != null);
      setTotals((t) => ({
        ...t,
        listed: capped.length === 0 ? null : capped.reduce((s, r) => s + (r.listedQty ?? 0), 0),
        available: next.reduce((s, r) => s + r.available, 0),
        heldBack: next.reduce((s, r) => s + r.heldBack, 0),
      }));
      setSaved(res.success ?? "Saved.");
    });
  }

  return (
    <div className="rounded-xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">How much is for sale</h2>
        <span className="text-[12px] text-stone-400">
          Changing this never moves stock — it only decides how much of it customers can buy.
        </span>
      </div>

      {/* ── the five figures that answer "where did it all go" ── */}
      <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg border border-stone-200 bg-stone-50/60 p-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Purchased" value={totals.purchased} hint="received, all time" />
        <Stat label="Sold" value={totals.sold} hint="shipped, all time" />
        <Stat label="On hand" value={totals.onHand} hint="physically here" />
        <Stat label="Reserved" value={totals.reserved} hint="open orders" />
        <Stat
          label="For sale"
          value={totals.listed == null ? "All" : totals.listed}
          hint={totals.listed == null ? "no limit set" : "authorised"}
          tone="good"
        />
        <Stat
          label="Held back"
          value={totals.heldBack}
          hint="here, not offered"
          tone={totals.heldBack > 0 ? "warn" : "plain"}
        />
      </div>

      {totals.incoming > 0 && (
        <p className="mt-2 text-[12px] text-stone-500">
          {totals.incoming} more unit(s) are on order and not yet received — they can be listed once
          they arrive.
        </p>
      )}

      {/* ── bulk controls ── */}
      <div className="mt-5 flex flex-wrap items-end gap-2 rounded-lg border border-stone-200 p-3">
        <label className="min-w-0">
          <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
            {isVariant ? "Units per option" : "Units for sale"}
          </span>
          <input
            value={bulk}
            onChange={(e) => setBulk(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="e.g. 10"
            className={box}
          />
        </label>
        <button
          type="button"
          onClick={applyBulk}
          disabled={!bulk.trim()}
          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-600 transition hover:bg-stone-50 disabled:opacity-40"
        >
          Apply to every option
        </button>
        <button
          type="button"
          onClick={listEverything}
          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
        >
          Sell everything
        </button>
        <button
          type="button"
          onClick={clearAll}
          title="Blank means no limit — sell whatever is on hand"
          className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
        >
          No limit
        </button>
      </div>

      {/* ── per-option rows ── */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-stone-200 text-[11.5px] uppercase tracking-wide text-stone-400">
              <th className="py-2 pr-3 font-semibold">{isVariant ? "Option" : "Stock"}</th>
              <th className="py-2 pr-3 text-right font-semibold">On hand</th>
              <th className="py-2 pr-3 text-right font-semibold">Reserved</th>
              <th className="py-2 pr-3 text-right font-semibold">Can list</th>
              <th className="py-2 pr-3 font-semibold">For sale</th>
              <th className="py-2 text-right font-semibold">Buyable now</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const raw = draft[i]?.trim() ?? "";
              const n = raw === "" ? null : Math.max(0, Math.floor(Number(raw) || 0));
              const over = n != null && n > r.maxListable;
              const buyable = n == null ? r.maxListable : Math.min(r.maxListable, n);
              return (
                <tr key={r.variantId ?? "product"} className="border-b border-stone-100">
                  <td className="py-2 pr-3 font-medium text-stone-800">{r.label}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-stone-600">{r.stock}</td>
                  <td className="py-2 pr-3 text-right tabular-nums text-stone-500">
                    {r.reserved || "—"}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums text-stone-500">{r.maxListable}</td>
                  <td className="py-2 pr-3">
                    <input
                      value={raw}
                      onChange={(e) => setRow(i, e.target.value)}
                      placeholder="No limit"
                      aria-label={`Units for sale — ${r.label}`}
                      className={`${box} ${over ? "border-red-400 bg-red-50" : ""}`}
                    />
                  </td>
                  <td className="py-2 text-right">
                    {over ? (
                      <span className="font-semibold text-red-600">only {r.maxListable}</span>
                    ) : (
                      <span className="font-semibold tabular-nums text-emerald-700">{buyable}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-[11.5px] text-stone-400">
        Leave a box blank for <span className="font-semibold text-stone-500">no limit</span> — every
        unit on hand is sellable. Type <span className="font-semibold text-stone-500">0</span> to take
        an option off sale entirely. Orders already placed always ship, whatever you set here.
      </p>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] text-emerald-800">
          {saved}
        </p>
      )}

      <div className="mt-4 flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty || preview.over > 0}
          className="rounded-lg bg-stone-800 px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-stone-900 disabled:opacity-40"
        >
          {pending ? "Saving…" : "Save what's for sale"}
        </button>
        {dirty && !pending && (
          <span className="text-[12px] text-stone-500">
            {preview.available} unit(s) would be buyable
            {preview.listed != null && ` · ${preview.listed} listed`}
          </span>
        )}
      </div>
    </div>
  );
}
