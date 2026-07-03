"use client";

import { useState, useTransition } from "react";
import { notifyMeAction } from "@/app/(storefront)/products/[slug]/wishlist-actions";

// Shown when a product is out of stock: collect an email or phone to alert the
// customer once it's restocked.
export default function NotifyBackInStock({ productId }: { productId: number }) {
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await notifyMeAction(productId, null, formData);
      setMsg(res.error ? { type: "err", text: res.error } : { type: "ok", text: res.success! });
    });
  }

  return (
    <form action={submit} className="rounded-lg border border-gray-200 p-4">
      <p className="text-sm font-medium text-gray-800">Out of stock — get notified when it&apos;s back</p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          name="email"
          type="email"
          placeholder="Email"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
        />
        <input
          name="phone"
          inputMode="numeric"
          placeholder="or Phone (01…)"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          Notify me
        </button>
      </div>
      {msg && (
        <p className={`mt-2 text-sm ${msg.type === "ok" ? "text-green-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}
    </form>
  );
}
