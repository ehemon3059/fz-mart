"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import CategoryImagePicker from "@/components/admin/CategoryImagePicker";
import { saveSubcategory } from "./actions";

interface Props {
  subcategory: {
    id: number;
    name: string;
    categoryId: number;
    imageUrl: string | null;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
  };
  /** Parent category name, shown in the breadcrumb. */
  categoryName: string;
}

function Toggle({
  checked,
  onChange,
  label,
  sublabel,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-semibold text-stone-800">{label}</p>
        {sublabel && <p className="text-[12px] text-stone-400">{sublabel}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={["relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-600" : "bg-stone-300"].join(" ")}
      >
        <span
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
            checked ? "left-[22px]" : "left-0.5",
          ].join(" ")}
        />
      </button>
    </div>
  );
}

export default function SubcategoryForm({ subcategory, categoryName }: Props) {
  const router = useRouter();
  const [name, setName] = useState(subcategory.name);
  const [imageUrl, setImageUrl] = useState(subcategory.imageUrl ?? "");
  const [description, setDescription] = useState(subcategory.description ?? "");
  const [sortOrder, setSortOrder] = useState(subcategory.sortOrder);
  const [isActive, setIsActive] = useState(subcategory.isActive);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveSubcategory(subcategory.id, formData);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/admin/categories");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="font-manrope mx-auto w-full max-w-[640px] px-5 py-6 pb-32 lg:px-8 lg:pb-10">
      <input type="hidden" name="name" value={name} />
      <input type="hidden" name="categoryId" value={String(subcategory.categoryId)} />
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="sortOrder" value={String(sortOrder)} />
      {isActive && <input type="hidden" name="isActive" value="on" />}

      {/* breadcrumb + header */}
      <nav className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-stone-500">
        <Link href="/admin/categories" className="rounded-md px-1 py-0.5 hover:bg-stone-100 hover:text-stone-700">
          Categories
        </Link>
        <Icon name="chevronRight" size={13} className="text-stone-300" />
        <span className="text-stone-500">{categoryName}</span>
        <Icon name="chevronRight" size={13} className="text-stone-300" />
        <span className="text-stone-800">Edit subcategory</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">Edit Subcategory</h1>
          <p className="mt-1 text-[14px] text-stone-500">Update this subcategory&apos;s name, image and visibility.</p>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/admin/categories"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{error}</p>
      )}

      <div className="mt-7 space-y-6">
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
          <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <Icon name="info" size={15} />
            </span>
            <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">Basic info</h2>
          </header>
          <div className="space-y-4 p-5">
            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Subcategory name</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cables & Adapters"
                  className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Image</label>
              <CategoryImagePicker value={imageUrl} onChange={setImageUrl} label="Subcategory image" />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Description</span>
                <span className="ml-auto text-[12px] font-normal text-stone-400">optional · shown on the subcategory listing</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Short blurb describing this subcategory for shoppers."
                className="w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50 placeholder:text-stone-400"
              />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Sort order</span>
                <span className="ml-auto text-[12px] font-normal text-stone-400">lower shows first</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
                <input
                  type="number"
                  step="1"
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value === "" ? 0 : Number(e.target.value))}
                  placeholder="0"
                  className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
          <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <Icon name="eye" size={15} />
            </span>
            <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">Visibility</h2>
          </header>
          <div className="p-5">
            <Toggle
              checked={isActive}
              onChange={setIsActive}
              label="Active"
              sublabel={isActive ? "Visible on the storefront" : "Hidden — won't show in the catalog"}
            />
          </div>
        </section>
      </div>

      {/* mobile sticky save bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-2 border-t border-stone-200 bg-white p-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.08)] lg:hidden">
        <Link
          href="/admin/categories"
          className="rounded-xl border border-stone-200 px-4 py-3 text-[14px] font-semibold text-stone-600"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
