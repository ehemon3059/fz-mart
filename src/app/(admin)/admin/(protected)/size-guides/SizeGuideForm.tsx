"use client";

/**
 * Size guide editor — name it, list its sizes IN ORDER, and write the chart.
 *
 * The size list is the point of the whole screen: chip order here is the order
 * shoppers see, which is why sizes are entered as reorderable chips rather than
 * free text. Typing "32,33,34" or pasting a whole list adds them in one go.
 *
 * The chart reuses the product accordion's Markdown toolbar and renderer, so a
 * size table looks identical here, in the product page's Size Chart modal, and
 * in any accordion panel.
 */

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { renderMarkdown } from "@/lib/markdown";
import MarkdownToolbar, { useMarkdownActions } from "../products/MarkdownToolbar";
import { saveSizeGuide } from "./actions";

export interface SizeGuideFormValue {
  id: number;
  name: string;
  sizeLabel: string | null;
  chart: string | null;
  isActive: boolean;
  values: string[];
}

const CHART_STARTER = `| Size | Chest | Length | Shoulder |
| --- | --- | --- | --- |
| **S** | 38" | 26" | 16" |
| **M** | 40" | 27" | 17" |
| **L** | 42" | 28" | 18" |

*Measurements are in inches and may vary by ±0.5".*`;

/** Split a typed/pasted run of sizes on commas, tabs and newlines. */
const splitSizes = (raw: string) =>
  raw
    .split(/[,\n\t]+/)
    .map((s) => s.trim())
    .filter(Boolean);

export default function SizeGuideForm({ guide }: { guide?: SizeGuideFormValue }) {
  const isEdit = !!guide;
  const router = useRouter();
  const [name, setName] = useState(guide?.name ?? "");
  const [sizeLabel, setSizeLabel] = useState(guide?.sizeLabel ?? "");
  const [isActive, setIsActive] = useState(guide?.isActive ?? true);
  const [values, setValues] = useState<string[]>(guide?.values ?? []);
  const [draft, setDraft] = useState("");
  const [chart, setChart] = useState(guide?.chart ?? "");
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const chartRef = useRef<HTMLTextAreaElement>(null);

  const chartActions = useMarkdownActions(chartRef, chart, setChart);

  /** Add whatever is in the draft box, ignoring sizes already listed. */
  const commitDraft = (raw: string) => {
    const added = splitSizes(raw);
    if (added.length === 0) return;
    setValues((prev) => {
      const seen = new Set(prev);
      const fresh: string[] = [];
      for (const v of added) {
        if (seen.has(v)) continue;
        seen.add(v);
        fresh.push(v);
      }
      return [...prev, ...fresh];
    });
    setDraft("");
  };

  const removeValue = (idx: number) => setValues((prev) => prev.filter((_, i) => i !== idx));
  const moveValue = (idx: number, dir: -1 | 1) =>
    setValues((prev) => {
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const out = [...prev];
      [out[idx], out[next]] = [out[next], out[idx]];
      return out;
    });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    // Anything still sitting in the draft box is clearly meant to be included.
    const pendingDraft = splitSizes(draft);
    const finalValues = pendingDraft.length
      ? [...values, ...pendingDraft.filter((v) => !values.includes(v))]
      : values;
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (finalValues.length === 0) {
      setError("Add at least one size.");
      return;
    }
    const fd = new FormData(e.currentTarget);
    fd.set("values", JSON.stringify(finalValues));
    startTransition(async () => {
      const result = await saveSizeGuide(guide?.id ?? null, fd);
      if (result?.error) setError(result.error);
      else router.push("/admin/size-guides");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="font-manrope mx-auto w-full max-w-[820px] px-5 py-6 pb-32 lg:px-8 lg:pb-10">
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="sizeLabel" value={sizeLabel} />
      <input type="hidden" name="chart" value={chart} />
      <input type="hidden" name="values" value={JSON.stringify(values)} />
      {isActive && <input type="hidden" name="isActive" value="on" />}

      <nav className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-stone-500">
        <Link href="/admin/size-guides" className="rounded-md px-1 py-0.5 hover:bg-stone-100 hover:text-stone-700">
          Size Guides
        </Link>
        <Icon name="chevronRight" size={13} className="text-stone-300" />
        <span className="text-stone-800">{isEdit ? "Edit" : "New"}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">
            {isEdit ? "Edit Size Guide" : "New Size Guide"}
          </h1>
          <p className="mt-1 text-[14px] text-stone-500">
            Attach this to a category and every product below it starts with these sizes.
          </p>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/admin/size-guides"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Size Guide"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>
      )}

      <div className="mt-7 space-y-6">
        {/* ── basics ── */}
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
          <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <Icon name="info" size={15} />
            </span>
            <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">Basics</h2>
          </header>
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Guide name</span>
                <span className="text-red-500">*</span>
                <span className="ml-auto text-[12px] font-normal text-stone-400">admin only</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Blouse / bust sizes"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50 placeholder:text-stone-400"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Label shoppers see</span>
                <span className="ml-auto text-[12px] font-normal text-stone-400">blank = “Size”</span>
              </label>
              <input
                type="text"
                value={sizeLabel}
                onChange={(e) => setSizeLabel(e.target.value)}
                placeholder="e.g. Bust Size"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50 placeholder:text-stone-400"
              />
              <p className="mt-1.5 text-[12px] text-stone-400">
                Shows on the product page as “Select {sizeLabel.trim() || "Size"}:”.
              </p>
            </div>

            <div className="flex items-center gap-3 border-t border-stone-100 pt-4">
              <div className="min-w-0 flex-1">
                <p className="text-[13.5px] font-semibold text-stone-800">Active</p>
                <p className="text-[12px] text-stone-400">
                  {isActive
                    ? "Offered on the category and product forms."
                    : "Retired — stays attached where it is, but stops applying on the storefront."}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isActive}
                onClick={() => setIsActive((v) => !v)}
                className={[
                  "relative h-6 w-11 shrink-0 rounded-full transition",
                  isActive ? "bg-brand-600" : "bg-stone-300",
                ].join(" ")}
              >
                <span
                  className={[
                    "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
                    isActive ? "left-[22px]" : "left-0.5",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── the sizes ── */}
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
          <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <Icon name="specGrid" size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">Sizes</h2>
              <p className="text-[12.5px] text-stone-400">This order is the order on the product page.</p>
            </div>
          </header>
          <div className="space-y-4 p-5">
            <div className="flex gap-2">
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  // Enter and comma both commit — typing a long numeric run
                  // shouldn't need a click between each size.
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    commitDraft(draft);
                  }
                }}
                placeholder="Type or paste: 32, 33, 34, 35 …"
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50 placeholder:text-stone-400"
              />
              <button
                type="button"
                onClick={() => commitDraft(draft)}
                className="shrink-0 rounded-lg border border-stone-200 bg-white px-3.5 py-2.5 text-[13px] font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                Add
              </button>
            </div>

            {values.length === 0 ? (
              <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50/60 px-4 py-6 text-center text-[13px] text-stone-400">
                No sizes yet — add them above.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {values.map((v, idx) => (
                  <span
                    key={v}
                    className="group flex items-center gap-1 rounded-lg border border-stone-200 bg-stone-50/70 py-1 pl-2.5 pr-1"
                  >
                    <span className="text-[13.5px] font-semibold text-stone-800">{v}</span>
                    <button
                      type="button"
                      onClick={() => moveValue(idx, -1)}
                      disabled={idx === 0}
                      aria-label={`Move ${v} earlier`}
                      className="flex h-6 w-5 items-center justify-center rounded text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-25"
                    >
                      <Icon name="chevronRight" size={12} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveValue(idx, 1)}
                      disabled={idx === values.length - 1}
                      aria-label={`Move ${v} later`}
                      className="flex h-6 w-5 items-center justify-center rounded text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-25"
                    >
                      <Icon name="chevronRight" size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeValue(idx)}
                      aria-label={`Remove ${v}`}
                      className="flex h-6 w-6 items-center justify-center rounded text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Icon name="x" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {values.length > 0 && (
              <p className="text-[12px] text-stone-400">
                {values.length} size{values.length === 1 ? "" : "s"} · shoppers will see them left to right in this
                order.
              </p>
            )}
          </div>
        </section>

        {/* ── the chart ── */}
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
          <header className="flex items-center justify-between gap-2.5 border-b border-stone-100 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
                <Icon name="grid" size={15} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">Size chart</h2>
                <p className="text-[12.5px] text-stone-400">Opens from the “Size Chart” link. Optional.</p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {(["write", "preview"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={[
                    "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[12px] font-semibold capitalize transition",
                    tab === t ? "bg-stone-100 text-stone-900" : "text-stone-500 hover:text-stone-800",
                  ].join(" ")}
                >
                  <Icon name={t === "write" ? "pencil" : "eye"} size={13} /> {t}
                </button>
              ))}
            </div>
          </header>
          <div className="p-5">
            {tab === "write" ? (
              <div className="overflow-hidden rounded-lg border border-stone-200">
                <MarkdownToolbar actions={chartActions} showH2={false} />
                <textarea
                  ref={chartRef}
                  value={chart}
                  onChange={(e) => setChart(e.target.value)}
                  rows={10}
                  spellCheck
                  placeholder={"A measurement table, in Markdown.\n\n" + CHART_STARTER}
                  className="block max-h-[70vh] min-h-[220px] w-full resize-y bg-white px-3 py-2.5 font-spline-mono text-[12.5px] leading-[1.7] text-stone-800 outline-none placeholder:text-stone-300"
                />
              </div>
            ) : (
              <div className="min-h-[220px] rounded-lg border border-stone-200 bg-white px-3.5 py-3">
                {chart.trim() ? (
                  <div
                    className="prose prose-sm max-w-none prose-headings:font-bold prose-headings:text-stone-900 prose-p:text-stone-700 prose-strong:text-stone-900 prose-li:text-stone-700 prose-table:text-[13px] prose-th:text-left"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(chart) }}
                  />
                ) : (
                  <p className="py-10 text-center text-[13px] text-stone-400">Nothing to preview yet.</p>
                )}
              </div>
            )}
            {!chart.trim() && tab === "write" && (
              <button
                type="button"
                onClick={() => setChart(CHART_STARTER)}
                className="mt-2.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 px-3 py-1.5 text-[12.5px] font-semibold text-stone-500 transition hover:border-brand-300 hover:text-brand-600"
              >
                Start from an example table
              </button>
            )}
          </div>
        </section>
      </div>

      {/* mobile sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-2 border-t border-stone-200 bg-white p-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.08)] lg:hidden">
        <Link
          href="/admin/size-guides"
          className="rounded-xl border border-stone-200 px-4 py-3 text-[14px] font-semibold text-stone-600"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Size Guide"}
        </button>
      </div>
    </form>
  );
}
