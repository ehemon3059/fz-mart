"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { formatTaka } from "@/lib/money";
import { Icon } from "@/components/icons";
import { removeLocation, toggleLocationActive } from "./actions";

/**
 * Collapsible Division → District → Upazila tree.
 *
 * Collapsed by default: a fully seeded tree is ~350 rows, and an admin editing
 * one district should not have to scroll past the other 63.
 */

interface ZoneRef {
  id: number;
  name: string;
  charge: number;
  isActive: boolean;
}

interface Node {
  id: number;
  name: string;
  isActive: boolean;
  sortOrder: number;
  zone: ZoneRef | null;
}

interface Upazila extends Node {}
interface District extends Node {
  upazilas: Upazila[];
}
interface Division extends Node {
  districts: District[];
}

type Level = "division" | "district" | "upazila";

/**
 * The zone a row resolves to, and whether it owns that zone or inherited it.
 * Showing "inherited" explicitly is the point of this screen — otherwise an
 * admin cannot tell why a district costs what it costs.
 */
function resolved(own: ZoneRef | null, inherited: ZoneRef | null) {
  const zone = own && own.isActive ? own : inherited;
  return { zone, isOwn: Boolean(own && own.isActive) };
}

function ZoneBadge({ zone, isOwn }: { zone: ZoneRef | null; isOwn: boolean }) {
  if (!zone) {
    return (
      <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[11.5px] font-semibold text-stone-500">
        Fallback zone
      </span>
    );
  }
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${
        isOwn ? "bg-brand-50 text-brand-700" : "bg-stone-100 text-stone-500"
      }`}
      title={isOwn ? "Set on this location" : "Inherited from its parent"}
    >
      {zone.name} · {formatTaka(zone.charge)}
      {!isOwn && " (inherited)"}
    </span>
  );
}

function RowActions({
  level,
  id,
  name,
  isActive,
  childCount,
}: {
  level: Level;
  id: number;
  name: string;
  isActive: boolean;
  childCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleToggle() {
    setError(null);
    startTransition(async () => {
      const res = await toggleLocationActive(level, id, !isActive);
      if (res.error) setError(res.error);
    });
  }

  function handleDelete() {
    const extra =
      childCount > 0
        ? `\n\nThis also deletes ${childCount} location${childCount === 1 ? "" : "s"} inside it.`
        : "";
    if (!confirm(`Delete "${name}"?${extra}\n\nPlaced orders keep their address and are unaffected.`)) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await removeLocation(level, id);
      if (res.error) setError(res.error);
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      {error && <span className="text-[11.5px] text-red-600">{error}</span>}
      <button
        type="button"
        onClick={handleToggle}
        disabled={pending}
        title={isActive ? "Hide from checkout" : "Show at checkout"}
        className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold disabled:opacity-50 ${
          isActive
            ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            : "bg-stone-100 text-stone-500 hover:bg-stone-200"
        }`}
      >
        {isActive ? "Active" : "Hidden"}
      </button>
      <Link
        href={`/admin/settings/locations/${level}/${id}/edit`}
        aria-label={`Edit ${name}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
      >
        <Icon name="pencil" size={16} />
      </Link>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        aria-label={`Delete ${name}`}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
      >
        <Icon name="trash" size={16} />
      </button>
    </div>
  );
}

export default function LocationTreeView({ divisions }: { divisions: Division[] }) {
  const [openDivisions, setOpenDivisions] = useState<Set<number>>(new Set());
  const [openDistricts, setOpenDistricts] = useState<Set<number>>(new Set());

  const toggle = (set: Set<number>, id: number) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  return (
    <div className="space-y-3">
      {divisions.map((div) => {
        const divZone = resolved(div.zone, null);
        const open = openDivisions.has(div.id);
        const upazilaTotal = div.districts.reduce((n, d) => n + d.upazilas.length, 0);

        return (
          <div key={div.id} className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
            {/* ── division row ── */}
            <div className="flex items-center gap-3 px-4 py-3.5">
              <button
                type="button"
                onClick={() => setOpenDivisions((s) => toggle(s, div.id))}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
              >
                <span
                  className={`text-stone-400 transition-transform ${open ? "rotate-90" : ""}`}
                  aria-hidden="true"
                >
                  <Icon name="chevronRight" size={16} />
                </span>
                <span className="truncate text-[15px] font-bold text-stone-900">{div.name}</span>
                <span className="shrink-0 text-[12px] text-stone-400">
                  {div.districts.length} districts
                </span>
              </button>
              <ZoneBadge zone={divZone.zone} isOwn={divZone.isOwn} />
              <RowActions
                level="division"
                id={div.id}
                name={div.name}
                isActive={div.isActive}
                childCount={div.districts.length + upazilaTotal}
              />
            </div>

            {open && (
              <div className="border-t border-stone-100 bg-stone-50/50 px-3 py-3">
                <div className="mb-2 flex justify-end">
                  <Link
                    href={`/admin/settings/locations/new?level=district&parent=${div.id}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-stone-700 hover:bg-stone-50"
                  >
                    <Icon name="plus" size={14} /> District in {div.name}
                  </Link>
                </div>

                {div.districts.length === 0 ? (
                  <p className="px-2 py-3 text-[13px] text-stone-400">
                    No districts yet — customers cannot choose this division at checkout.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {div.districts.map((dis) => {
                      const disZone = resolved(dis.zone, divZone.zone);
                      const disOpen = openDistricts.has(dis.id);
                      return (
                        <div key={dis.id} className="overflow-hidden rounded-lg border border-stone-200 bg-white">
                          <div className="flex items-center gap-3 px-3.5 py-2.5">
                            <button
                              type="button"
                              onClick={() => setOpenDistricts((s) => toggle(s, dis.id))}
                              aria-expanded={disOpen}
                              className="flex min-w-0 flex-1 items-center gap-2 text-left"
                            >
                              <span
                                className={`text-stone-300 transition-transform ${disOpen ? "rotate-90" : ""}`}
                                aria-hidden="true"
                              >
                                <Icon name="chevronRight" size={14} />
                              </span>
                              <span className="truncate text-[14px] font-semibold text-stone-800">
                                {dis.name}
                              </span>
                              <span className="shrink-0 text-[11.5px] text-stone-400">
                                {dis.upazilas.length} upazilas
                              </span>
                            </button>
                            <ZoneBadge zone={disZone.zone} isOwn={disZone.isOwn} />
                            <RowActions
                              level="district"
                              id={dis.id}
                              name={dis.name}
                              isActive={dis.isActive}
                              childCount={dis.upazilas.length}
                            />
                          </div>

                          {disOpen && (
                            <div className="border-t border-stone-100 px-3 py-2.5">
                              <div className="mb-2 flex justify-end">
                                <Link
                                  href={`/admin/settings/locations/new?level=upazila&parent=${dis.id}`}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 px-2.5 py-1.5 text-[12px] font-semibold text-stone-600 hover:bg-stone-50"
                                >
                                  <Icon name="plus" size={13} /> Upazila in {dis.name}
                                </Link>
                              </div>
                              {dis.upazilas.length === 0 ? (
                                <p className="px-1 py-1.5 text-[12.5px] text-stone-400">
                                  No upazilas — checkout charges this district&apos;s rate for the
                                  whole district.
                                </p>
                              ) : (
                                <div className="divide-y divide-stone-100">
                                  {dis.upazilas.map((upz) => {
                                    const upzZone = resolved(upz.zone, disZone.zone);
                                    return (
                                      <div key={upz.id} className="flex items-center gap-3 py-2">
                                        <span className="min-w-0 flex-1 truncate pl-5 text-[13.5px] text-stone-700">
                                          {upz.name}
                                        </span>
                                        <ZoneBadge zone={upzZone.zone} isOwn={upzZone.isOwn} />
                                        <RowActions
                                          level="upazila"
                                          id={upz.id}
                                          name={upz.name}
                                          isActive={upz.isActive}
                                          childCount={0}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
