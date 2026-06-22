"use client";

import { useState, useTransition } from "react";
import { savePixelId } from "./actions";

export default function PixelForm({ initialPixelId }: { initialPixelId: string | null }) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await savePixelId(formData);
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
        <label className="block text-sm font-medium mb-1">Facebook Pixel ID</label>
        <input
          name="pixelId"
          defaultValue={initialPixelId ?? ""}
          placeholder="1234567890123456"
          className="w-full border rounded px-3 py-2 font-mono"
        />
        <p className="text-xs text-gray-500 mt-1">
          Leave blank to disable. Fires PageView automatically, plus AddToCart and
          Purchase events from the storefront.
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
