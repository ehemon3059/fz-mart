"use client";

/**
 * The counting screen.
 *
 * Built around a handheld scanner, which is just a keyboard that types a code
 * and presses Enter. So the scan box keeps focus, accepts the code, resolves it
 * and asks only for the number on the shelf — nothing else may steal focus, or
 * the next scan lands in the wrong field.
 *
 * Typing works exactly the same way, because plenty of stock in a shop like
 * this was never labelled, and a count that only accepts barcodes would quietly
 * skip it.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import {
  scanAction,
  searchRowsAction,
  countLineAction,
  removeLineAction,
  commitStockTakeAction,
  cancelStockTakeAction,
} from "../actions";
import type { ScanHit } from "@/server/inventory/barcode";
import type { CommitSummary } from "@/server/inventory/stocktake";

export interface LineView {
  id: number;
  productId: number;
  variantId: number | null;
  productName: string;
  variantLabel: string | null;
  expectedQty: number;
  countedQty: number | null;
  note: string | null;
}

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent";

export default function CountClient({
  stockTakeId,
  reference,
  isOpen,
  lines: initialLines,
}: {
  stockTakeId: number;
  reference: string;
  isOpen: boolean;
  lines: LineView[];
}) {
  const [lines, setLines] = useState(initialLines);
  const [code, setCode] = useState("");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<CommitSummary | null>(null);
  // The row a scan resolved to, waiting for its count.
  const [target, setTarget] = useState<ScanHit | null>(null);
  const [choices, setChoices] = useState<ScanHit[]>([]);
  const [qty, setQty] = useState("");

  const scanRef = useRef<HTMLInputElement>(null);
  const qtyRef = useRef<HTMLInputElement>(null);

  // Keep the scan box focused whenever nothing else needs the keyboard. A
  // scanner fires the instant it is pointed at a label; if focus has drifted,
  // the code is typed into whatever happens to be focused instead.
  useEffect(() => {
    if (!isOpen) return;
    if (target) qtyRef.current?.focus();
    else scanRef.current?.focus();
  }, [target, isOpen, lines.length]);

  useEffect(() => {
    setLines(initialLines);
  }, [initialLines]);

  function resolve(raw: string) {
    const value = raw.trim();
    if (!value) return;
    setError(null);
    setMessage(null);
    setChoices([]);

    startTransition(async () => {
      const res = await scanAction(value);
      if (res.kind === "hit") {
        setTarget(res.row);
        setCode("");
        setQty("");
        return;
      }
      if (res.kind === "ambiguous") {
        setChoices(res.rows);
        setCode("");
        return;
      }
      // Nothing matched the code — fall back to a name search, since an unlabelled
      // product is the common case rather than an error.
      const found = await searchRowsAction(value);
      if (found.length === 1) {
        setTarget(found[0]);
        setCode("");
        setQty("");
      } else if (found.length > 1) {
        setChoices(found);
        setCode("");
      } else {
        setError(`Nothing found for "${value}".`);
      }
    });
  }

  function saveCount() {
    if (!target) return;
    const counted = Number(qty);
    if (!Number.isInteger(counted) || counted < 0) {
      setError("Enter the number on the shelf — zero or more.");
      return;
    }
    startTransition(async () => {
      const res = await countLineAction(stockTakeId, {
        productId: target.productId,
        variantId: target.variantId,
        countedQty: counted,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      const name = [target.productName, target.variantLabel].filter(Boolean).join(" — ");
      setMessage(`Counted ${counted} × ${name}`);
      setTarget(null);
      setQty("");
    });
  }

  function drop(lineId: number) {
    startTransition(async () => {
      const res = await removeLineAction(stockTakeId, lineId);
      if (res.error) setError(res.error);
      else setLines((prev) => prev.filter((l) => l.id !== lineId));
    });
  }

  function commit() {
    const countedLines = lines.filter((l) => l.countedQty != null);
    const variances = countedLines.filter((l) => l.countedQty !== l.expectedQty);
    if (
      !confirm(
        `Apply ${reference}?\n\n${countedLines.length} line(s) counted, ${variances.length} with a variance.\n` +
          `Stock will be adjusted to match what you counted. This can't be undone.`,
      )
    )
      return;

    startTransition(async () => {
      const res = await commitStockTakeAction(stockTakeId);
      if (res.error) setError(res.error);
      if (res.summary) setSummary(res.summary);
    });
  }

  function abandon() {
    if (!confirm(`Cancel ${reference}? The counts are kept, but no stock will change.`)) return;
    startTransition(async () => {
      const res = await cancelStockTakeAction(stockTakeId);
      if (res.error) setError(res.error);
    });
  }

  const counted = lines.filter((l) => l.countedQty != null);
  const variances = counted.filter((l) => l.countedQty !== l.expectedQty);
  const netUnits = variances.reduce((sum, l) => sum + (l.countedQty! - l.expectedQty), 0);

  return (
    <div className="space-y-5">
      {isOpen && (
        <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
          <label className="mb-1 block text-[12px] font-semibold text-stone-600">
            Scan a barcode, or type a SKU or product name
          </label>
          <div className="flex gap-2">
            <input
              ref={scanRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                // A scanner ends with Enter, which must not submit anything —
                // only resolve what was typed.
                if (e.key === "Enter") {
                  e.preventDefault();
                  resolve(code);
                }
              }}
              placeholder="SAR-PUR-32"
              autoComplete="off"
              className={`${field} font-mono`}
            />
            <button
              type="button"
              onClick={() => resolve(code)}
              disabled={pending || !code.trim()}
              className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Find
            </button>
          </div>

          {choices.length > 0 && (
            <div className="mt-3 rounded-lg border border-stone-200">
              <p className="border-b border-stone-100 px-3 py-2 text-[12px] font-semibold text-stone-600">
                Which one?
              </p>
              <ul className="max-h-56 overflow-auto">
                {choices.map((c) => (
                  <li key={`${c.productId}-${c.variantId ?? "base"}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setTarget(c);
                        setChoices([]);
                        setQty("");
                      }}
                      className="flex w-full items-baseline justify-between gap-3 px-3 py-2 text-left hover:bg-stone-50"
                    >
                      <span className="text-[13px] text-stone-800">
                        {c.productName}
                        {c.variantLabel && (
                          <span className="text-stone-500"> — {c.variantLabel}</span>
                        )}
                      </span>
                      <span className="font-mono text-[11.5px] text-stone-400">
                        {c.sku ?? "no SKU"}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {target && (
            <div className="mt-3 rounded-lg border border-accent/30 bg-accent-soft/40 p-3">
              <p className="text-[13px] font-semibold text-stone-900">
                {target.productName}
                {target.variantLabel && (
                  <span className="font-normal text-stone-600"> — {target.variantLabel}</span>
                )}
              </p>
              <p className="mt-0.5 text-[12px] text-stone-500">
                System says {target.stock} on hand
                {target.reserved > 0 && ` · ${target.reserved} reserved`}
              </p>
              <div className="mt-2.5 flex gap-2">
                <input
                  ref={qtyRef}
                  type="number"
                  min="0"
                  step="1"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      saveCount();
                    }
                    if (e.key === "Escape") setTarget(null);
                  }}
                  placeholder="Count on shelf"
                  className={field}
                />
                <button
                  type="button"
                  onClick={saveCount}
                  disabled={pending}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => setTarget(null)}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-semibold text-stone-600"
                >
                  Skip
                </button>
              </div>
            </div>
          )}

          {message && <p className="mt-2 text-[12.5px] text-success-fg">{message}</p>}
          {error && <p className="mt-2 text-[12.5px] text-danger-fg">{error}</p>}
        </div>
      )}

      {summary && (
        <div className="rounded-lg border border-success/30 bg-success-soft px-4 py-3 text-[13px] text-success-fg">
          <p className="font-semibold">Count applied.</p>
          <p className="mt-0.5">
            {summary.applied} line(s) adjusted, {summary.unchanged} already correct, net{" "}
            {summary.netUnits > 0 ? "+" : ""}
            {summary.netUnits} unit(s).
          </p>
          {summary.failures.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-danger-fg">
              {summary.failures.map((f) => (
                <li key={f.label}>
                  {f.label}: {f.reason}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── The sheet ── */}
      <div className="rounded-lg border border-stone-200 bg-white shadow-card">
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-stone-200 px-5 py-3">
          <h2 className="text-[13px] font-semibold text-stone-900">
            Counted {counted.length} of {lines.length}
          </h2>
          <p className="text-[12.5px] text-stone-500">
            {variances.length} variance(s) · net {netUnits > 0 ? "+" : ""}
            {netUnits} unit(s)
          </p>
        </div>

        {lines.length === 0 ? (
          <p className="px-5 py-10 text-center text-[13px] text-stone-500">
            Nothing counted yet. Scan a barcode to begin.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-sm">
              <thead className="border-b border-stone-100 bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="px-4 py-2.5 text-left font-semibold">Item</th>
                  <th className="px-4 py-2.5 text-right font-semibold">System</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Counted</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Variance</th>
                  {isOpen && <th className="px-4 py-2.5" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {lines.map((l) => {
                  const variance = l.countedQty == null ? null : l.countedQty - l.expectedQty;
                  return (
                    <tr key={l.id} className="hover:bg-stone-50/60">
                      <td className="px-4 py-2.5">
                        <span className="text-stone-800">{l.productName}</span>
                        {l.variantLabel && (
                          <span className="text-stone-500"> — {l.variantLabel}</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-500">
                        {l.expectedQty}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-stone-800">
                        {l.countedQty ?? "—"}
                      </td>
                      <td
                        className={[
                          "px-4 py-2.5 text-right font-semibold tabular-nums",
                          variance == null
                            ? "text-stone-300"
                            : variance === 0
                              ? "text-stone-400"
                              : variance > 0
                                ? "text-success-fg"
                                : "text-danger-fg",
                        ].join(" ")}
                      >
                        {variance == null ? "—" : variance === 0 ? "0" : variance > 0 ? `+${variance}` : variance}
                      </td>
                      {isOpen && (
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => drop(l.id)}
                            disabled={pending}
                            className="text-[12px] text-stone-400 hover:text-danger-fg disabled:opacity-40"
                          >
                            Remove
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isOpen && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={commit}
            disabled={pending || counted.length === 0}
            className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Icon name="check" size={14} className="mr-1.5 inline" />
            Apply count
          </button>
          <button
            type="button"
            onClick={abandon}
            disabled={pending}
            className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-50"
          >
            Cancel stock-take
          </button>
          <span className="text-[12px] text-stone-400">
            Applying adjusts stock to your counts, and records each change in the ledger.
          </span>
        </div>
      )}
    </div>
  );
}
