"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { paisaToTaka } from "@/lib/money";
import { saveShippingZone } from "./actions";

interface Props {
  zone?: {
    id: number;
    name: string;
    charge: number;
    sortOrder: number;
    isActive: boolean;
    isFallback: boolean;
  };
}

export default function ShippingZoneForm({ zone }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await saveShippingZone(zone?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputCls =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-900">Zone details</h2>
        <p className="mt-0.5 text-[13px] text-stone-500">
          A zone is a delivery rate. Customers never pick one directly — they choose a{" "}
          <Link href="/admin/settings/locations" className="underline">
            delivery location
          </Link>
          , and the zone mapped to it (or to its district/division) sets the charge.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Name</label>
            <input
              name="name"
              required
              defaultValue={zone?.name}
              placeholder="e.g. Inside Dhaka"
              className={inputCls}
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Charge (BDT)</label>
              <input
                name="charge"
                type="number"
                step="0.01"
                required
                defaultValue={zone ? paisaToTaka(zone.charge) : undefined}
                placeholder="0.00"
                className={inputCls}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Sort order</label>
              <input
                name="sortOrder"
                type="number"
                defaultValue={zone?.sortOrder ?? 0}
                className={inputCls}
              />
              <p className="mt-1.5 text-[12px] text-stone-400">Lower numbers appear first.</p>
            </div>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[14px] font-medium text-stone-700">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={zone?.isActive ?? true}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/30"
            />
            Active (available at checkout)
          </label>

          <div className="rounded-xl border border-stone-200 bg-stone-50 p-3.5">
            <label className="flex cursor-pointer items-start gap-2.5 text-[14px] font-medium text-stone-700">
              <input
                name="isFallback"
                type="checkbox"
                defaultChecked={zone?.isFallback ?? false}
                className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/30"
              />
              <span>
                Use as the fallback zone
                <span className="mt-0.5 block text-[12px] font-normal leading-relaxed text-stone-500">
                  Charged whenever a customer&apos;s location — and everything above it — has no
                  zone of its own. Only one zone can be the fallback; ticking this un-ticks
                  whichever zone holds it now.
                </span>
              </span>
            </label>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save zone"}
      </button>
    </form>
  );
}
