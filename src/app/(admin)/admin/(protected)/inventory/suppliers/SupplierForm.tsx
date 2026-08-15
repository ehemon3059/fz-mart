"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { saveSupplierAction } from "../purchase-orders/actions";

export interface SupplierFormValues {
  id: number | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  note: string;
  leadTimeDays: string;
  isActive: boolean;
}

const field =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";
const label = "mb-1 block text-[12px] font-semibold text-stone-600";

export default function SupplierForm({ initial }: { initial: SupplierFormValues }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      // On success this redirects, so anything returned is a failure.
      const res = await saveSupplierAction(initial.id, formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <form action={submit} className="max-w-2xl space-y-5">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Name</label>
            <input name="name" defaultValue={initial.name} required className={field} />
          </div>
          <div>
            <label className={label}>Phone</label>
            <input name="phone" defaultValue={initial.phone} className={field} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input name="email" type="email" defaultValue={initial.email} className={field} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Address</label>
            <textarea name="address" defaultValue={initial.address} rows={2} className={field} />
          </div>
          <div>
            <label className={label}>Lead time (days)</label>
            <input
              name="leadTimeDays"
              type="number"
              min="1"
              defaultValue={initial.leadTimeDays}
              className={field}
            />
            <p className="mt-1 text-[11px] text-stone-400">
              How long from order to delivery. Drives the reorder point for this supplier&rsquo;s
              products; blank uses the shop default.
            </p>
          </div>
          <div>
            <label className={label}>Status</label>
            <select name="isActive" defaultValue={String(initial.isActive)} className={field}>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
            <p className="mt-1 text-[11px] text-stone-400">
              Inactive suppliers stay on their past orders but can&rsquo;t take new ones.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Note</label>
            <textarea name="note" defaultValue={initial.note} rows={2} className={field} />
          </div>
        </div>
      </div>

      {error && <p className="text-sm text-danger-fg">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save supplier"}
        </button>
        <Link
          href="/admin/inventory/suppliers"
          className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
