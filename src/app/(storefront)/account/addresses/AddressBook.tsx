"use client";

import { useState, useTransition } from "react";
import { formatTaka } from "@/lib/money";
import type { SavedAddress } from "@/lib/customer-address";
import type { LocationTree } from "@/server/settings/locations";
import { addAddress, editAddress, makeDefaultAddress, removeAddress } from "../actions";

interface Props {
  addresses: SavedAddress[];
  /** Admin-managed location tree; the zone (and its charge) is derived from it. */
  locations: LocationTree;
  max: number;
  defaults: { fullName: string; phone: string };
}

const LABEL_PRESETS = ["Home", "Office", "Other"];

/**
 * Human-readable location for a saved address, plus the charge its zone
 * currently costs. Resolved from the live tree rather than stored text, so a
 * repriced zone shows the new charge here without touching the saved row.
 * Returns null for addresses saved before locations existed, or whose location
 * the admin has since removed.
 */
function describeLocation(
  tree: LocationTree,
  a: SavedAddress,
): { where: string; zoneName: string; charge: number } | null {
  const division = tree.divisions.find((d) => d.id === a.divisionId);
  const district = division?.districts.find((d) => d.id === a.districtId);
  if (!division || !district) return null;
  const upazila = district.upazilas.find((u) => u.id === a.upazilaId);
  const src = upazila ?? district;
  return {
    where: [upazila?.name, district.name, division.name].filter(Boolean).join(", "),
    zoneName: src.zoneName,
    charge: src.charge,
  };
}

type Editing = { mode: "new" } | { mode: "edit"; address: SavedAddress } | null;

export default function AddressBook({ addresses, locations, max, defaults }: Props) {
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const full = addresses.length >= max;

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result =
        editing?.mode === "edit"
          ? await editAddress(editing.address.id, formData)
          : await addAddress(formData);
      if (result?.error) setError(result.error);
      else setEditing(null); // the page revalidates and re-renders the list
    });
  }

  function handleDelete(id: number) {
    setError(null);
    startTransition(async () => {
      const result = await removeAddress(id);
      if (result?.error) setError(result.error);
    });
  }

  function handleMakeDefault(id: number) {
    setError(null);
    startTransition(async () => {
      const result = await makeDefaultAddress(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Delivery addresses</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Save up to {max} addresses and pick one at checkout.{" "}
            <span className="font-medium text-gray-600">
              {addresses.length} of {max} used
            </span>
            .
          </p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={() => {
              setError(null);
              setEditing({ mode: "new" });
            }}
            disabled={full}
            title={full ? `Delete an address first — the limit is ${max}.` : undefined}
            className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Add address
          </button>
        )}
      </div>

      {full && !editing && (
        <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
          You&apos;ve saved the maximum of {max} addresses. Delete one to add another.
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
          {error}
        </p>
      )}

      {editing && (
        <AddressForm
          key={editing.mode === "edit" ? editing.address.id : "new"}
          locations={locations}
          initial={editing.mode === "edit" ? editing.address : null}
          defaults={defaults}
          pending={pending}
          onCancel={() => {
            setEditing(null);
            setError(null);
          }}
          onSubmit={handleSubmit}
        />
      )}

      {addresses.length === 0 && !editing && (
        <p className="rounded-2xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm text-gray-500">
          No saved addresses yet. Add one to check out faster next time.
        </p>
      )}

      <div className="mt-4 space-y-3">
        {addresses.map((a) => {
          const place = describeLocation(locations, a);
          return (
            <div key={a.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                  {a.label}
                </span>
                {a.isDefault && (
                  <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
                    Default
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm font-semibold text-gray-900">{a.fullName}</p>
              <p className="text-sm text-gray-600">{a.phone}</p>
              <p className="mt-1 whitespace-pre-line text-sm text-gray-600">{a.address}</p>
              {place && (
                <p className="mt-1 text-xs text-gray-400">
                  {place.where} · {place.zoneName} · delivery {formatTaka(place.charge)}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-3 border-t border-gray-100 pt-3 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setEditing({ mode: "edit", address: a });
                  }}
                  disabled={pending}
                  className="text-brand-700 hover:underline disabled:opacity-50"
                >
                  Edit
                </button>
                {!a.isDefault && (
                  <button
                    type="button"
                    onClick={() => handleMakeDefault(a.id)}
                    disabled={pending}
                    className="text-gray-600 hover:underline disabled:opacity-50"
                  >
                    Set as default
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(a.id)}
                  disabled={pending}
                  className="ml-auto text-red-600 hover:underline disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function AddressForm({
  locations,
  initial,
  defaults,
  pending,
  onCancel,
  onSubmit,
}: {
  locations: LocationTree;
  initial: SavedAddress | null;
  defaults: { fullName: string; phone: string };
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? LABEL_PRESETS[0]);
  const [phone, setPhone] = useState(initial?.phone ?? defaults.phone);
  // Controlled so each level can clear the ones below it; an edit re-opens on
  // whatever the address was saved with.
  const [loc, setLoc] = useState({
    divisionId: initial?.divisionId ?? null,
    districtId: initial?.districtId ?? null,
    upazilaId: initial?.upazilaId ?? null,
  });

  const selectedDivision = locations.divisions.find((d) => d.id === loc.divisionId);
  const selectedDistrict = selectedDivision?.districts.find((d) => d.id === loc.districtId);
  const selectedUpazila = selectedDistrict?.upazilas.find((u) => u.id === loc.upazilaId);
  // Preview only — the server re-derives the zone when the address is saved.
  const pickedCharge = selectedDistrict
    ? (selectedUpazila ?? selectedDistrict)
    : null;

  const field =
    "w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100";
  const labelCls = "mb-1.5 block text-sm font-semibold text-gray-700";

  return (
    <form action={onSubmit} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <h3 className="text-base font-bold text-gray-900">
        {initial ? "Edit address" : "New address"}
      </h3>

      <div className="mt-4 space-y-4">
        <div>
          <span className={labelCls}>Label</span>
          <div className="flex flex-wrap gap-2">
            {LABEL_PRESETS.map((preset) => (
              <button
                type="button"
                key={preset}
                onClick={() => setLabel(preset)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                  label === preset
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
          {/* Free text too, so "Mum's place" works as well as the presets. */}
          <input
            name="label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            maxLength={30}
            required
            className={`${field} mt-2`}
            aria-label="Address label"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="fullName" className={labelCls}>
              Recipient name
            </label>
            <input
              id="fullName"
              name="fullName"
              defaultValue={initial?.fullName ?? defaults.fullName}
              maxLength={80}
              required
              placeholder="Who receives the parcel"
              className={field}
            />
          </div>
          <div>
            <label htmlFor="phone" className={labelCls}>
              Mobile number
            </label>
            <input
              id="phone"
              name="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
              inputMode="numeric"
              required
              placeholder="017XXXXXXXX"
              className={field}
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className={labelCls}>
            Full address
          </label>
          <textarea
            id="address"
            name="address"
            defaultValue={initial?.address ?? ""}
            rows={3}
            maxLength={400}
            required
            placeholder="House / road / block / area, city"
            className={field}
          />
        </div>

        {/* Delivery location — the charge follows from it, so there is no
            separate "delivery area" to keep in sync. */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="divisionId" className={labelCls}>
              Division
            </label>
            <select
              id="divisionId"
              name="divisionId"
              required
              value={loc.divisionId ?? ""}
              onChange={(e) =>
                setLoc({
                  divisionId: e.target.value === "" ? null : Number(e.target.value),
                  districtId: null,
                  upazilaId: null,
                })
              }
              className={field}
            >
              <option value="">Select division</option>
              {locations.divisions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="districtId" className={labelCls}>
              District
            </label>
            <select
              id="districtId"
              name="districtId"
              required
              disabled={!selectedDivision}
              value={loc.districtId ?? ""}
              onChange={(e) =>
                setLoc((prev) => ({
                  ...prev,
                  districtId: e.target.value === "" ? null : Number(e.target.value),
                  upazilaId: null,
                }))
              }
              className={field}
            >
              <option value="">
                {selectedDivision ? "Select district" : "Choose a division first"}
              </option>
              {(selectedDivision?.districts ?? []).map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {(selectedDistrict?.upazilas.length ?? 0) > 0 && (
          <div>
            <label htmlFor="upazilaId" className={labelCls}>
              Upazila / Thana
            </label>
            <select
              id="upazilaId"
              name="upazilaId"
              value={loc.upazilaId ?? ""}
              onChange={(e) =>
                setLoc((prev) => ({
                  ...prev,
                  upazilaId: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
              className={field}
            >
              <option value="">Select upazila / thana</option>
              {(selectedDistrict?.upazilas ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {pickedCharge && (
          <p className="rounded-xl bg-brand-50 px-3.5 py-2.5 text-xs font-semibold text-brand-700">
            {pickedCharge.zoneName} · delivery {formatTaka(pickedCharge.charge)}
          </p>
        )}

        <label className="flex items-center gap-2.5 text-sm text-gray-700">
          <input
            type="checkbox"
            name="isDefault"
            defaultChecked={initial?.isDefault ?? false}
            disabled={initial?.isDefault ?? false}
            className="h-4 w-4 accent-brand-600"
          />
          Use as my default address
          {initial?.isDefault && (
            <span className="text-xs text-gray-400">(already the default)</span>
          )}
        </label>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : initial ? "Save address" : "Add address"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
