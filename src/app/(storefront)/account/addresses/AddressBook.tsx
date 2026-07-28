"use client";

import { useState, useTransition } from "react";
import { formatTaka } from "@/lib/money";
import type { SavedAddress, ZoneOption } from "@/lib/customer-address";
import { addAddress, editAddress, makeDefaultAddress, removeAddress } from "../actions";

interface Props {
  addresses: SavedAddress[];
  zones: ZoneOption[];
  max: number;
  defaults: { fullName: string; phone: string };
}

const LABEL_PRESETS = ["Home", "Office", "Other"];

type Editing = { mode: "new" } | { mode: "edit"; address: SavedAddress } | null;

export default function AddressBook({ addresses, zones, max, defaults }: Props) {
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
          zones={zones}
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
          const zone = zones.find((z) => z.id === a.shippingZoneId);
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
              {zone && (
                <p className="mt-1 text-xs text-gray-400">
                  {zone.name} · delivery {formatTaka(zone.charge)}
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
  zones,
  initial,
  defaults,
  pending,
  onCancel,
  onSubmit,
}: {
  zones: ZoneOption[];
  initial: SavedAddress | null;
  defaults: { fullName: string; phone: string };
  pending: boolean;
  onCancel: () => void;
  onSubmit: (formData: FormData) => void;
}) {
  const [label, setLabel] = useState(initial?.label ?? LABEL_PRESETS[0]);
  const [phone, setPhone] = useState(initial?.phone ?? defaults.phone);

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

        <div>
          <label htmlFor="shippingZoneId" className={labelCls}>
            Delivery area
          </label>
          <select
            id="shippingZoneId"
            name="shippingZoneId"
            defaultValue={initial?.shippingZoneId ?? ""}
            className={field}
          >
            <option value="">Choose at checkout</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>
                {z.name} — {formatTaka(z.charge)}
              </option>
            ))}
          </select>
        </div>

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
