"use client";

/**
 * Size guide list — every guide with its chips, its label, and where it is
 * attached. Deleting is refused while anything still points at the guide (the
 * FKs are SET NULL, so the DB would otherwise detach them silently).
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { removeSizeGuide } from "./actions";

export interface GuideRow {
  id: number;
  name: string;
  sizeLabel: string | null;
  hasChart: boolean;
  isActive: boolean;
  values: string[];
  categoryCount: number;
  productCount: number;
}

export default function SizeGuidesClient({ guides }: { guides: GuideRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const handleDelete = (g: GuideRow) => {
    setMessage(null);
    if (!window.confirm(`Delete “${g.name}”? Products keep their sizes — only the template goes.`)) return;
    startTransition(async () => {
      const result = await removeSizeGuide(g.id);
      if (result.ok) {
        router.refresh();
        return;
      }
      setMessage(
        result.blocked
          ? `“${g.name}” is still used by ${result.categoryCount} categor${result.categoryCount === 1 ? "y" : "ies"} and ${result.productCount} product${result.productCount === 1 ? "" : "s"}. Detach it there first.`
          : result.error,
      );
    });
  };

  if (guides.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 px-6 py-12 text-center">
        <p className="text-[14px] font-semibold text-stone-600">No size guides yet</p>
        <p className="mx-auto mt-1.5 max-w-md text-[13px] text-stone-400">
          A guide is a set of sizes you reuse — “32…52” for blouses, “S–XXL” for T-shirts. Attach one to a category and
          every product below it starts with the right chips, in the right order.
        </p>
        <Link
          href="/admin/size-guides/new"
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Icon name="plus" size={15} /> New size guide
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {message && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] text-amber-800">{message}</p>
      )}

      {guides.map((g) => (
        <div
          key={g.id}
          className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft transition hover:border-stone-300"
        >
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-[15px] font-bold tracking-tight text-stone-900">{g.name}</h2>
                {!g.isActive && (
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold text-stone-500">
                    Inactive
                  </span>
                )}
                {g.hasChart && (
                  <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
                    Size chart
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[12.5px] text-stone-400">
                Shows as “Select {g.sizeLabel || "Size"}:” · {g.values.length} size
                {g.values.length === 1 ? "" : "s"} · used by {g.categoryCount} categor
                {g.categoryCount === 1 ? "y" : "ies"} and {g.productCount} product{g.productCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Link
                href={`/admin/size-guides/${g.id}/edit`}
                className="rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
              >
                Edit
              </Link>
              <button
                type="button"
                onClick={() => handleDelete(g)}
                disabled={pending}
                aria-label={`Delete ${g.name}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
              >
                <Icon name="trash" size={15} />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 border-t border-stone-100 bg-stone-50/50 px-5 py-3">
            {g.values.map((v) => (
              <span
                key={v}
                className="rounded-md border border-stone-200 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-stone-700"
              >
                {v}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
