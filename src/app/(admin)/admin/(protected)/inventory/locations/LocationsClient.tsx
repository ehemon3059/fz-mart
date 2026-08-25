"use client";

/**
 * Where stock sits, and what the ledger says is at each place.
 *
 * The balance column is DERIVED from stock movements, not maintained — so it
 * reports what has actually been recorded rather than a number someone keeps in
 * step by hand. "Not recorded" is every movement written before locations
 * existed: real stock whose whereabouts were never captured, shown rather than
 * hidden so the figures still add up to the shop.
 */

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveLocationAction, deleteLocationAction } from "../actions-locations";

export interface LocationView {
  id: number;
  name: string;
  note: string | null;
  isDefault: boolean;
  isActive: boolean;
}

export interface BalanceView {
  locationId: number | null;
  name: string;
  units: number;
  movements: number;
}

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-accent";
const label = "mb-1 block text-[12px] font-semibold text-stone-600";

export default function LocationsClient({
  locations,
  balances,
}: {
  locations: LocationView[];
  balances: BalanceView[];
}) {
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const balanceOf = new Map(balances.map((b) => [b.locationId, b]));

  function submit(id: number | null, formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await saveLocationAction(id, formData);
      if (res.error) setError(res.error);
      else setEditing(null);
    });
  }

  function remove(id: number, name: string) {
    if (
      !confirm(
        `Remove "${name}"?\n\nPast movements keep their history — they simply stop naming a location.`,
      )
    )
      return;
    setError(null);
    startTransition(async () => {
      const res = await deleteLocationAction(id);
      if (res.error) setError(res.error);
    });
  }

  const unrecorded = balanceOf.get(null);

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-hidden rounded-lg border border-stone-200 bg-white shadow-card">
        <table className="w-full text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-[11px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Location</th>
              <th className="px-4 py-3 text-right font-semibold">Net units</th>
              <th className="px-4 py-3 text-right font-semibold">Movements</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {locations.map((l) =>
              editing === l.id ? (
                <tr key={l.id}>
                  <td colSpan={4} className="bg-stone-50 px-4 py-3">
                    <LocationForm
                      location={l}
                      pending={pending}
                      onCancel={() => setEditing(null)}
                      onSubmit={(fd) => submit(l.id, fd)}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={l.id} className="hover:bg-stone-50/60">
                  <td className="px-4 py-3">
                    <span className="font-medium text-stone-900">{l.name}</span>
                    {l.isDefault && (
                      <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                        Default
                      </span>
                    )}
                    {!l.isActive && (
                      <span className="ml-2 text-[11.5px] text-stone-400">Inactive</span>
                    )}
                    {l.note && <div className="text-[11.5px] text-stone-400">{l.note}</div>}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-700">
                    {balanceOf.get(l.id)?.units ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-stone-400">
                    {balanceOf.get(l.id)?.movements ?? 0}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(l.id)}
                      className="text-[12.5px] font-semibold text-accent underline-offset-2 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(l.id, l.name)}
                      disabled={pending}
                      className="ml-3 text-[12.5px] text-stone-400 hover:text-danger-fg disabled:opacity-40"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ),
            )}

            {unrecorded && (
              <tr className="bg-stone-50/40">
                <td className="px-4 py-3">
                  <span className="italic text-stone-500">Not recorded</span>
                  <div className="text-[11.5px] text-stone-400">
                    Movements from before locations existed
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-stone-500">
                  {unrecorded.units}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-stone-400">
                  {unrecorded.movements}
                </td>
                <td />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editing === "new" ? (
        <div className="rounded-lg border border-stone-200 bg-white p-4 shadow-card">
          <LocationForm
            pending={pending}
            onCancel={() => setEditing(null)}
            onSubmit={(fd) => submit(null, fd)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:border-stone-400"
        >
          <Icon name="plus" size={14} />
          Add a location
        </button>
      )}

      <p className="rounded-lg border border-stone-200 bg-stone-50 px-4 py-3 text-[12.5px] leading-relaxed text-stone-600">
        <span className="font-semibold text-stone-700">Locations are labels, not separate stock.</span>{" "}
        The storefront still sells against one shop-wide figure, so nothing here can oversell or
        change what a customer sees. What it gives you is a record of where each delivery landed and
        what each count found.
      </p>
    </div>
  );
}

function LocationForm({
  location,
  pending,
  onSubmit,
  onCancel,
}: {
  location?: LocationView;
  pending: boolean;
  onSubmit: (fd: FormData) => void;
  onCancel: () => void;
}) {
  return (
    <form action={onSubmit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={label}>Name</label>
          <input
            name="name"
            required
            autoFocus
            defaultValue={location?.name ?? ""}
            placeholder="Warehouse"
            className={field}
          />
        </div>
        <div>
          <label className={label}>Note</label>
          <input
            name="note"
            defaultValue={location?.note ?? ""}
            placeholder="Optional"
            className={field}
          />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-[13px] text-stone-700">
          <input type="checkbox" name="isDefault" defaultChecked={location?.isDefault ?? false} />
          Deliveries land here by default
        </label>
        <label className="flex items-center gap-2 text-[13px] text-stone-700">
          <input
            type="checkbox"
            name="isActive"
            value="true"
            defaultChecked={location?.isActive ?? true}
          />
          Active
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
