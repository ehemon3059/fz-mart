"use client";

import { useState, useTransition } from "react";
import { saveSiteUrl } from "./actions";

interface Props {
  /** Currently configured domain (empty if falling back to env/localhost). */
  initialValue: string;
  /** The URL the site actually resolves to right now (for the preview). */
  effectiveUrl: string;
}

export default function SiteUrlForm({ initialValue, effectiveUrl }: Props) {
  const [value, setValue] = useState(initialValue);
  const [resolved, setResolved] = useState(effectiveUrl);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveSiteUrl(value);
      if (result.error) {
        setError(result.error);
      } else {
        setValue(result.value ?? "");
        setResolved(result.value || effectiveUrl);
        setSaved(true);
      }
    });
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-[17px] font-bold text-stone-900">Site URL (domain)</h2>
      <p className="mt-1 max-w-xl text-[13.5px] text-stone-500">
        Your store’s public web address. This is used for marketing feeds (Facebook &amp; Google),
        your sitemap, SEO/share links, and the links in cart-reminder and back-in-stock emails. Set
        it to your real domain after you go live.
      </p>

      <div className="mt-4 max-w-md">
        <label
          htmlFor="siteUrl"
          className="mb-1.5 block text-[13px] font-semibold text-stone-700"
        >
          Domain
        </label>
        <input
          id="siteUrl"
          type="url"
          inputMode="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setSaved(false);
          }}
          placeholder="https://yourstore.com"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-[14px] outline-none focus:border-stone-900"
        />
        <p className="mt-1.5 text-[12.5px] text-stone-400">
          Include <code className="font-mono">https://</code>. Leave empty to fall back to the
          server’s configured URL.
        </p>
      </div>

      <div className="mt-3 rounded-lg border border-stone-100 bg-stone-50 px-3 py-2.5 text-[12.5px] text-stone-500">
        Links currently resolve to{" "}
        <span className="font-mono font-semibold text-stone-700">{resolved}</span>
      </div>

      {error && (
        <p className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-medium text-red-600">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-[13px] font-medium text-green-700">
          Saved — feeds, sitemap and links now use this domain.
        </p>
      )}

      <div className="mt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={pending}
          className="rounded-lg bg-stone-900 px-5 py-2 text-[14px] font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save domain"}
        </button>
      </div>
    </div>
  );
}
