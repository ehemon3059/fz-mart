"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatTaka } from "@/lib/money";
import { saveLocation, type ActionResult } from "./actions";

export type Level = "division" | "district" | "upazila";

export interface ZoneChoice {
  id: number;
  name: string;
  charge: number;
}

/** Divisions with their districts — feeds the parent dropdowns. */
export interface ParentTree {
  id: number;
  name: string;
  districts: { id: number; name: string }[];
}

interface Props {
  level: Level;
  zones: ZoneChoice[];
  parents: ParentTree[];
  /** The zone this location would inherit if left on "Inherit" — shown inline. */
  inheritedLabel: string;
  /** Pre-selects the parent when adding from inside a division/district row. */
  defaultParentId?: number | null;
  location?: {
    id: number;
    name: string;
    shippingZoneId: number | null;
    isActive: boolean;
    sortOrder: number;
    parentId: number | null;
  };
}

const LEVEL_COPY: Record<Level, { title: string; parent: string | null }> = {
  division: { title: "Division", parent: null },
  district: { title: "District", parent: "Division" },
  upazila: { title: "Upazila / Thana", parent: "District" },
};

export default function LocationForm({
  level,
  zones,
  parents,
  inheritedLabel,
  defaultParentId = null,
  location,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [zoneId, setZoneId] = useState<string>(
    location?.shippingZoneId != null ? String(location.shippingZoneId) : "",
  );
  // Districts are chosen under a division, so the upazila form needs the
  // division picked first to know which districts to offer.
  const initialParent = location?.parentId ?? defaultParentId;
  const [divisionId, setDivisionId] = useState<string>(() => {
    if (level !== "upazila") return "";
    const owner = parents.find((p) => p.districts.some((d) => d.id === initialParent));
    return owner ? String(owner.id) : "";
  });
  const [parentId, setParentId] = useState<string>(
    initialParent != null ? String(initialParent) : "",
  );

  const copy = LEVEL_COPY[level];
  const districtOptions =
    parents.find((p) => String(p.id) === divisionId)?.districts ?? [];

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result: ActionResult = await saveLocation(level, location?.id ?? null, formData);
      if (result?.error) setError(result.error);
    });
  }

  const inputCls =
    "w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-[14.5px] text-stone-900 placeholder:text-stone-400 shadow-soft focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20";
  const labelCls = "mb-1.5 block text-[13px] font-semibold text-stone-700";

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-6">
        <h2 className="text-[15px] font-bold text-stone-900">{copy.title} details</h2>
        <p className="mt-0.5 text-[13px] text-stone-500">
          Shown in the checkout dropdown exactly as typed — write it in Bangla if that is what
          customers should see.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label htmlFor="name" className={labelCls}>
              Name
            </label>
            <input
              id="name"
              name="name"
              required
              maxLength={120}
              defaultValue={location?.name}
              placeholder={level === "division" ? "ঢাকা" : level === "district" ? "গাজীপুর" : "সাভার"}
              className={inputCls}
            />
          </div>

          {/* Parent pickers. An upazila needs its division first, purely to
              narrow the district list — only the district id is submitted. */}
          {level === "upazila" && (
            <div>
              <label htmlFor="divisionPicker" className={labelCls}>
                Division
              </label>
              <select
                id="divisionPicker"
                value={divisionId}
                onChange={(e) => {
                  setDivisionId(e.target.value);
                  setParentId("");
                }}
                className={inputCls}
              >
                <option value="">Select division</option>
                {parents.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {copy.parent && (
            <div>
              <label htmlFor="parentId" className={labelCls}>
                {copy.parent}
              </label>
              <select
                id="parentId"
                name="parentId"
                required
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                disabled={level === "upazila" && !divisionId}
                className={inputCls}
              >
                <option value="">Select {copy.parent.toLowerCase()}</option>
                {level === "district"
                  ? parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))
                  : districtOptions.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
              </select>
            </div>
          )}

          <div>
            <label htmlFor="shippingZoneId" className={labelCls}>
              Delivery zone
            </label>
            <select
              id="shippingZoneId"
              name="shippingZoneId"
              value={zoneId}
              onChange={(e) => setZoneId(e.target.value)}
              className={inputCls}
            >
              <option value="">Inherit — {inheritedLabel}</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.name} — {formatTaka(z.charge)}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] leading-relaxed text-stone-400">
              {zoneId === ""
                ? "Leave on Inherit unless this place costs a different rate than its parent — that is the normal case."
                : "This overrides the parent for this location and everything under it."}{" "}
              Manage the rates on{" "}
              <Link href="/admin/settings/shipping" className="underline">
                Shipping Zones
              </Link>
              .
            </p>
          </div>

          <div>
            <label htmlFor="sortOrder" className={labelCls}>
              Sort order
            </label>
            <input
              id="sortOrder"
              name="sortOrder"
              type="number"
              defaultValue={location?.sortOrder ?? 0}
              className={inputCls}
            />
            <p className="mt-1.5 text-[12px] text-stone-400">
              Lower numbers appear first in the dropdown.
            </p>
          </div>

          <label className="flex w-fit cursor-pointer items-center gap-2.5 text-[14px] font-medium text-stone-700">
            <input
              name="isActive"
              type="checkbox"
              defaultChecked={location?.isActive ?? true}
              className="h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500/30"
            />
            Active (customers can choose it at checkout)
          </label>
        </div>
      </div>

      {error && (
        <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13.5px] font-medium text-red-600">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-[14.5px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : `Save ${copy.title.toLowerCase()}`}
        </button>
        <Link
          href="/admin/settings/locations"
          className="text-[14px] font-semibold text-stone-500 hover:text-stone-800"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
