"use client";

import { useState, useTransition } from "react";
import { saveGtmId } from "./actions";

export default function TagManagerForm({ initialGtmId }: { initialGtmId: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveGtmId(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Google Tag Manager ID</label>
        <input
          name="gtmId"
          defaultValue={initialGtmId ?? ""}
          placeholder="GTM-XXXXXXX"
          className="w-full border rounded px-3 py-2 font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank to disable — no script is injected when empty.
        </p>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-700 text-sm">Saved.</p>}
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
