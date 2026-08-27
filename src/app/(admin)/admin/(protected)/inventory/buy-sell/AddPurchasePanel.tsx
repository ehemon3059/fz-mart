"use client";

/**
 * Record the purchase behind a product that never had one.
 *
 * A side panel rather than a page on purpose: clearing this backlog means
 * working down a list of eighty rows, and every navigation away loses your
 * place. You open a row, answer four questions, and the list is still there.
 *
 * THE THING TO UNDERSTAND ABOUT THIS FORM: it does not change stock. These
 * goods are already on the shelf — they are why the product shows 50 on hand.
 * The form is recording where those 50 came from, not receiving 50 more. If it
 * behaved like an ordinary purchase order the shop would end up believing it
 * held 100, which is precisely the bug this feature exists to avoid creating.
 *
 * Quantity is therefore pre-filled with what is on hand: for goods bought once
 * and partly sold that is the low end of the truth, and it is a far better
 * starting point than an empty box. The admin corrects it when they remember
 * the real figure.
 */

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { formatTaka, takaToPaisa } from "@/lib/money";
import { Button } from "@/components/admin/ui/Button";
import { Icon } from "@/components/icons";
import {
  loadBackfillTargetAction,
  recordPurchaseAction,
  type BackfillLineInput,
} from "./actions";
import type { BackfillOption } from "@/server/purchasing/sourcing";
import type { SupplierOption } from "./BuySellClient";

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-[12px] font-semibold text-stone-600";

/** One editable row — an option plus what the admin is typing against it. */
interface Draft extends BackfillOption {
  quantity: string;
  unitCostTaka: string;
}

/** Today as yyyy-mm-dd in LOCAL time, for the date input's max. */
function todayLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function AddPurchasePanel({
  productId,
  productName,
  suppliers,
  onCancel,
  onRecorded,
}: {
  productId: number;
  productName: string;
  suppliers: SupplierOption[];
  onCancel: () => void;
  onRecorded: (message: string) => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [supplierId, setSupplierId] = useState("");
  const [purchasedOn, setPurchasedOn] = useState("");
  const [note, setNote] = useState("");
  const [drafts, setDrafts] = useState<Draft[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadBackfillTargetAction(productId).then((res) => {
      if (cancelled) return;
      if (res.error || !res.target) {
        setError(res.error ?? "Could not load this product.");
      } else {
        setDrafts(
          res.target.options.map((o) => ({
            ...o,
            // On hand is the honest starting guess — see the note at the top.
            quantity: o.stock > 0 ? String(o.stock) : "",
            // 0 means "never recorded", which must show as empty rather than
            // as a confident ৳0.
            unitCostTaka: o.purchaseCost > 0 ? String(o.purchaseCost / 100) : "",
          })),
        );
      }
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [productId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onCancel]);

  function setDraft(index: number, patch: Partial<Draft>) {
    setDrafts((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function submit() {
    if (!supplierId) return setError("Choose the supplier this was bought from.");

    const lines: BackfillLineInput[] = [];
    for (const d of drafts) {
      const quantity = Number(d.quantity);
      if (!d.quantity.trim() || quantity <= 0) continue;
      if (!Number.isInteger(quantity)) {
        return setError(`Quantity for ${d.label} must be a whole number.`);
      }
      const cost = Number(d.unitCostTaka || 0);
      if (!Number.isFinite(cost) || cost < 0) {
        return setError(`Unit cost for ${d.label} isn't a valid amount.`);
      }
      lines.push({ variantId: d.variantId, quantity, unitCostTaka: cost });
    }

    if (lines.length === 0) {
      return setError("Enter how many units you bought for at least one option.");
    }

    setError(null);
    startTransition(async () => {
      const res = await recordPurchaseAction({
        productId,
        supplierId: Number(supplierId),
        purchasedOn: purchasedOn || null,
        note: note || null,
        lines,
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      onRecorded(`Purchase recorded for ${productName}.`);
    });
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-ink/50" onClick={onCancel} aria-hidden="true" />

      <div
        ref={panelRef}
        className="relative flex h-full w-full max-w-lg flex-col bg-white shadow-pop"
      >
        <div className="flex items-start justify-between gap-4 border-b border-stone-200 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-stone-900">Add Purchase</h2>
            <p className="mt-0.5 truncate text-[13px] text-stone-500">{productName}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="shrink-0 rounded-md p-1 text-stone-400 hover:bg-stone-100 hover:text-stone-700"
            aria-label="Close"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-5">
          {/* Said plainly, because the opposite is what an admin would assume. */}
          <div className="flex items-start gap-2 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2.5 text-[12.5px] text-stone-600">
            <Icon name="info" size={15} className="mt-0.5 shrink-0 text-stone-400" />
            <p>
              This records a purchase that already happened.{" "}
              <span className="font-semibold text-stone-800">Stock does not change</span> — these
              units are already counted. Use a normal purchase order for goods still arriving.
            </p>
          </div>

          {loading ? (
            <p className="py-8 text-center text-sm text-stone-400">Loading options…</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={label} htmlFor="bs-supplier">
                    Bought from *
                  </label>
                  {suppliers.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-stone-300 px-3 py-2 text-[13px] text-stone-500">
                      No suppliers yet.{" "}
                      <Link
                        href="/admin/inventory/suppliers"
                        className="font-semibold text-accent hover:underline"
                      >
                        Add one
                      </Link>{" "}
                      first.
                    </p>
                  ) : (
                    <select
                      id="bs-supplier"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className={field}
                    >
                      <option value="">Select supplier…</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className={label} htmlFor="bs-date">
                    Bought on
                  </label>
                  <input
                    id="bs-date"
                    type="date"
                    value={purchasedOn}
                    max={todayLocal()}
                    onChange={(e) => setPurchasedOn(e.target.value)}
                    className={field}
                  />
                  <p className="mt-1 text-[11.5px] text-stone-400">
                    Leave blank if you don&apos;t remember.
                  </p>
                </div>
              </div>

              <div>
                <p className={label}>What you bought</p>
                <div className="space-y-2">
                  {drafts.map((d, i) => {
                    const cost = takaToPaisa(Number(d.unitCostTaka || 0));
                    const margin = cost > 0 ? d.price - cost : null;
                    return (
                      <div
                        key={d.variantId ?? "single"}
                        className="rounded-lg border border-stone-200 px-3 py-2.5"
                      >
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <span className="text-[13px] font-semibold text-stone-800">
                            {d.label}
                          </span>
                          <span className="text-[11.5px] text-stone-500">
                            sells at {formatTaka(d.price)} · {d.stock} on hand
                          </span>
                        </div>

                        <div className="mt-2 grid grid-cols-2 gap-2">
                          <div>
                            <label className="mb-1 block text-[11px] text-stone-500">
                              Quantity bought
                            </label>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              value={d.quantity}
                              onChange={(e) => setDraft(i, { quantity: e.target.value })}
                              className={field}
                            />
                          </div>
                          <div>
                            <label className="mb-1 block text-[11px] text-stone-500">
                              Unit cost (৳)
                            </label>
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={d.unitCostTaka}
                              onChange={(e) => setDraft(i, { unitCostTaka: e.target.value })}
                              className={field}
                            />
                          </div>
                        </div>

                        {/* The point of the whole screen, per option. */}
                        {margin != null && (
                          <p
                            className={
                              "mt-1.5 text-[11.5px] " +
                              (margin >= 0 ? "text-success-fg" : "text-danger-fg")
                            }
                          >
                            {margin >= 0
                              ? `Margin ${formatTaka(margin)} per unit`
                              : `Losing ${formatTaka(-margin)} per unit`}
                            {d.price > 0 && ` · ${Math.round((margin / d.price) * 100)}%`}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-1.5 text-[11.5px] text-stone-400">
                  Quantity starts at what is on hand. Raise it if some were already sold; leave an
                  option at 0 to skip it.
                </p>
              </div>

              <div>
                <label className={label} htmlFor="bs-note">
                  Note
                </label>
                <textarea
                  id="bs-note"
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Invoice number, or how you know these figures"
                  className={field}
                />
              </div>
            </>
          )}

          {error && (
            <p className="rounded-lg border border-danger bg-danger-soft px-3 py-2 text-[13px] text-danger-fg">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-stone-200 px-5 py-4">
          <Button variant="secondary" onClick={onCancel} disabled={pending}>
            Cancel
          </Button>
          <Button onClick={submit} loading={pending} disabled={loading || suppliers.length === 0}>
            Record purchase
          </Button>
        </div>
      </div>
    </div>
  );
}
