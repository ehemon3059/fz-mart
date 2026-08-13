"use client";

/**
 * Editor for the footer's "Shop" column.
 *
 * The whole list is edited locally and submitted in one save, rather than each
 * row hitting the server on change: reordering is a two-row swap that would
 * otherwise mean two writes, and an admin mid-edit on a half-typed link should
 * not be publishing it to the live footer keystroke by keystroke.
 *
 * `categories` are offered as a datalist of ready-made paths — the column is
 * almost always category links — but the field stays free text so any internal
 * path (/products, /pages/faq) can be used too.
 */

import { useState, useTransition } from "react";
import { Icon } from "@/components/icons";
import { saveFooterShopLinks } from "@/app/(admin)/admin/(protected)/pages/actions";
import type { ShopLink } from "@/server/settings/footer-links";

interface Props {
  initialLinks: ShopLink[];
  /** False until an admin saves once; the list shown is the built-in default. */
  configured: boolean;
  max: number;
  /** Suggested internal paths for the URL field's datalist. */
  categories: { name: string; slug: string }[];
}

export default function FooterShopLinks({ initialLinks, configured, max, categories }: Props) {
  const [links, setLinks] = useState<ShopLink[]>(initialLinks);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  // Any edit invalidates the "Saved" confirmation from the previous save.
  const mutate = (next: ShopLink[]) => {
    setLinks(next);
    setSaved(false);
    setError(null);
  };

  const update = (idx: number, patch: Partial<ShopLink>) =>
    mutate(links.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const add = () => mutate([...links, { label: "", href: "" }]);
  const remove = (idx: number) => mutate(links.filter((_, i) => i !== idx));
  const move = (idx: number, dir: -1 | 1) => {
    const to = idx + dir;
    if (to < 0 || to >= links.length) return;
    const next = [...links];
    [next[idx], next[to]] = [next[to], next[idx]];
    mutate(next);
  };

  function save() {
    setError(null);
    startTransition(async () => {
      const data = new FormData();
      data.set("links", JSON.stringify(links));
      const result = await saveFooterShopLinks(data);
      if (result?.error) {
        setError(result.error);
        return;
      }
      // Drop the blank rows the action ignored, so what's on screen matches
      // what was actually stored.
      setLinks((ls) => ls.filter((l) => l.label.trim() || l.href.trim()));
      setSaved(true);
    });
  }

  const atCap = links.length >= max;
  const inputCls =
    "w-full min-w-0 rounded-lg border border-stone-200 bg-white px-2.5 py-2 text-[13.5px] text-stone-800 outline-none transition focus:border-brand-500 placeholder:text-stone-400";

  return (
    <section className="rounded-xl border border-stone-200 bg-white p-5 shadow-soft sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-bold text-stone-900">
            Footer “Shop” links
            <span className="ml-2 text-[13px] font-semibold text-stone-400">
              {links.length} / {max}
            </span>
          </h2>
          <p className="mt-0.5 text-[13px] text-stone-500">
            The Shop column in the storefront footer. Up to {max} links, shown in the order below.
          </p>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="rounded-lg bg-brand-600 px-4 py-2 text-[13.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save links"}
        </button>
      </div>

      {!configured && (
        <p className="mt-4 rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-[12.5px] text-stone-500">
          These are the built-in defaults. Saving replaces them with your own list.
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] font-medium text-red-700">
          {error}
        </p>
      )}
      {saved && !error && (
        <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[12.5px] font-medium text-emerald-700">
          Saved. The storefront footer is updated.
        </p>
      )}

      <datalist id="footer-shop-paths">
        {categories.map((c) => (
          <option key={c.slug} value={`/category/${c.slug}`}>
            {c.name}
          </option>
        ))}
      </datalist>

      <div className="mt-5 space-y-2">
        {links.length === 0 && (
          <p className="rounded-lg border border-dashed border-stone-300 bg-stone-50/60 px-3 py-4 text-center text-[13px] text-stone-400">
            No links — the Shop column is hidden from the footer.
          </p>
        )}

        {links.map((l, idx) => (
          <div
            key={idx}
            className="grid grid-cols-1 items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2 sm:grid-cols-[1fr_1.4fr_auto]"
          >
            <input
              value={l.label}
              onChange={(e) => update(idx, { label: e.target.value })}
              placeholder="Label — e.g. Electronics"
              maxLength={40}
              aria-label={`Label for link ${idx + 1}`}
              className={inputCls}
            />
            <input
              value={l.href}
              onChange={(e) => update(idx, { href: e.target.value })}
              list="footer-shop-paths"
              placeholder="/category/electronics"
              aria-label={`URL for link ${idx + 1}`}
              className={`${inputCls} font-mono text-[12.5px]`}
            />
            <div className="flex shrink-0 items-center justify-end">
              <button
                type="button"
                onClick={() => move(idx, -1)}
                disabled={idx === 0}
                aria-label={`Move link ${idx + 1} up`}
                className="flex h-7 w-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-25"
              >
                <Icon name="chevronDown" size={14} className="rotate-180" />
              </button>
              <button
                type="button"
                onClick={() => move(idx, 1)}
                disabled={idx === links.length - 1}
                aria-label={`Move link ${idx + 1} down`}
                className="flex h-7 w-6 items-center justify-center rounded-md text-stone-400 transition hover:bg-white hover:text-stone-700 disabled:opacity-25"
              >
                <Icon name="chevronDown" size={14} />
              </button>
              <button
                type="button"
                onClick={() => remove(idx)}
                aria-label={`Remove link ${idx + 1}`}
                className="flex h-7 w-7 items-center justify-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
              >
                <Icon name="trash" size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        disabled={atCap}
        title={atCap ? `Limit is ${max} links` : undefined}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 py-2.5 text-[13.5px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-stone-300 disabled:hover:bg-stone-50/60 disabled:hover:text-stone-500"
      >
        <Icon name="plus" size={15} />
        {atCap ? `Maximum ${max} links reached` : "Add link"}
      </button>
    </section>
  );
}
