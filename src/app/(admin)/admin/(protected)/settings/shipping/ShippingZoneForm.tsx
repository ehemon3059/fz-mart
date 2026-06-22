"use client";

import { useState, useTransition } from "react";
import { paisaToTaka } from "@/lib/money";
import { saveShippingZone } from "./actions";

interface Props {
  zone?: {
    id: number;
    name: string;
    charge: number;
    sortOrder: number;
    isActive: boolean;
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

  return (
    <form action={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Name</label>
        <input
          name="name"
          required
          defaultValue={zone?.name}
          placeholder="e.g. Inside Dhaka"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Charge (BDT)</label>
        <input
          name="charge"
          type="number"
          step="0.01"
          required
          defaultValue={zone ? paisaToTaka(zone.charge) : undefined}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Sort Order</label>
        <input
          name="sortOrder"
          type="number"
          defaultValue={zone?.sortOrder ?? 0}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input name="isActive" type="checkbox" defaultChecked={zone?.isActive ?? true} />
        Active
      </label>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
