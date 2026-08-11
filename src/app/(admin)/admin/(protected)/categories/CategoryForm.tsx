"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import CategoryImagePicker from "@/components/admin/CategoryImagePicker";
import { saveCategory } from "./actions";
import { buildTree, collectDescendantIds, type TreeNode } from "@/server/categories/tree";
import { inheritedGuideId } from "@/lib/size-guide-inheritance";
import { nearestInherited } from "@/lib/category-inheritance";

/** Prisma's `SellingType` enum, as it crosses the form boundary. */
type SellingTypeValue = "SINGLE" | "COLORS" | "SIZES";

interface CatLite {
  id: number;
  name: string;
  parentId: number | null;
  /** Set here = this branch's default size guide; null = inherit from above. */
  sizeGuideId?: number | null;
  /** Set here = how this branch's products are sold; null = inherit from above. */
  defaultSellingType?: SellingTypeValue | null;
}

/** The three ways a product can be sold, in the order the product form shows
 *  them. Copy is kept in step with form/SellingTypePicker so the choice reads
 *  the same in both places. */
const SELLING_TYPE_CARDS: {
  value: SellingTypeValue;
  title: string;
  blurb: string;
  examples: string;
}[] = [
  {
    value: "SINGLE",
    title: "Single item",
    blurb: "One price, one stock, gallery photos.",
    examples: "charger · toy · grocery",
  },
  {
    value: "COLORS",
    title: "Colours",
    blurb: "Same item in several colours, one photo each.",
    examples: "bag · watch · eyewear",
  },
  {
    value: "SIZES",
    title: "Sizes (+ colours)",
    blurb: "Sizes, crossed with colours when it has both.",
    examples: "dress · panjabi · shoes",
  },
];

const SELLING_TYPE_LABEL: Record<SellingTypeValue, string> = {
  SINGLE: "Single item",
  COLORS: "Colours",
  SIZES: "Sizes (+ colours)",
};

export interface SizeGuideOption {
  id: number;
  name: string;
  sizeLabel: string | null;
  /** First few values, for the "32, 33, 34 …" hint under the picker. */
  values: string[];
}

interface Props {
  category?: {
    id: number;
    name: string;
    parentId: number | null;
    imageUrl: string | null;
    description: string | null;
    sortOrder: number;
    isActive: boolean;
    metaTitle: string | null;
    metaDescription: string | null;
    sizeGuideId?: number | null;
    defaultSellingType?: SellingTypeValue | null;
  };
  /** All categories (flat) for the parent picker. */
  allCategories: CatLite[];
  /** Active size guides, for the size-guide picker. */
  sizeGuides?: SizeGuideOption[];
  /** Pre-selected parent when creating a child from the tree ("Add sub"). */
  defaultParentId?: number | null;
}


/** Flatten the tree into indented <option>s, disabling the node being edited
 *  and its descendants so a category can't be moved inside itself. */
function parentOptions(cats: CatLite[], excludeId?: number): { id: number; label: string }[] {
  const excluded = excludeId != null ? new Set(collectDescendantIds(excludeId, cats)) : new Set<number>();
  const out: { id: number; label: string }[] = [];
  const walk = (nodes: TreeNode<CatLite>[], depth: number) => {
    for (const n of nodes) {
      if (!excluded.has(n.id)) {
        out.push({ id: n.id, label: `${"— ".repeat(depth)}${n.name}` });
        walk(n.children, depth + 1);
      }
    }
  };
  walk(buildTree(cats), 0);
  return out;
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

export default function CategoryForm({ category, allCategories, sizeGuides = [], defaultParentId }: Props) {
  const isEdit = !!category;
  const router = useRouter();
  const [name, setName] = useState(category?.name ?? "");
  const [parentId, setParentId] = useState<string>(
    String(category?.parentId ?? defaultParentId ?? ""),
  );
  const options = useMemo(() => parentOptions(allCategories, category?.id), [allCategories, category?.id]);
  const [imageUrl, setImageUrl] = useState(category?.imageUrl ?? "");
  const [description, setDescription] = useState(category?.description ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(category?.isActive ?? true);
  const [sizeGuideId, setSizeGuideId] = useState<string>(String(category?.sizeGuideId ?? ""));
  const [metaTitle, setMetaTitle] = useState(category?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(category?.metaDescription ?? "");
  // What "inherit" resolves to right now — follows the parent picker live, so
  // re-parenting a category shows the guide it would pick up.
  const inheritedGuide = useMemo(() => {
    const id = inheritedGuideId(allCategories, parentId ? Number(parentId) : null, true);
    return id != null ? (sizeGuides.find((g) => g.id === id) ?? null) : null;
  }, [allCategories, parentId, sizeGuides]);
  const selectedGuide = sizeGuides.find((g) => String(g.id) === sizeGuideId) ?? null;
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  /* ── how products here are sold ── */
  const [sellingType, setSellingType] = useState<string>(category?.defaultSellingType ?? "");
  // A root has nothing above it, so "inherit" is not on offer there — the three
  // cards become a required choice. Follows the parent picker live.
  const isRoot = !parentId;
  const inheritedSelling = useMemo(
    () =>
      parentId
        ? nearestInherited(allCategories, Number(parentId), (c) => c.defaultSellingType, true)
        : null,
    [allCategories, parentId],
  );
  // What products in this category will actually open as: this node's own
  // choice, else whatever it inherits.
  const resolvedSelling = (sellingType || inheritedSelling || null) as SellingTypeValue | null;
  // A branch that sells by size needs a guide to draw its size values from.
  // Without one the product form offers no size list and admins free-type them,
  // which is how a catalog ends up with "M", "SM" and "Mid" side by side.
  const sizesNeedGuide = resolvedSelling === "SIZES" && !selectedGuide && !inheritedGuide;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (isRoot && !sellingType) {
      setError("Choose how products in this top-level category are sold.");
      return;
    }
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await saveCategory(category?.id ?? null, formData);
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
      <input type="hidden" name="parentId" value={parentId} />
      <input type="hidden" name="imageUrl" value={imageUrl} />
      <input type="hidden" name="description" value={description} />
      <input type="hidden" name="sortOrder" value={String(sortOrder)} />
      <input type="hidden" name="sizeGuideId" value={sizeGuideId} />
      <input type="hidden" name="defaultSellingType" value={sellingType} />
      {isActive && <input type="hidden" name="isActive" value="on" />}

      {/* breadcrumb + header */}
      <nav className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-stone-500">
        <Link href="/admin/categories" className="rounded-md px-1 py-0.5 hover:bg-stone-100 hover:text-stone-700">
          Categories
        </Link>
        <Icon name="chevronRight" size={13} className="text-stone-300" />
        <span className="text-stone-800">{isEdit ? "Edit" : "New"}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">
            {isEdit ? "Edit Category" : "New Category"}
          </h1>
          <p className="mt-1 text-[14px] text-stone-500">
            {isEdit ? "Update this category's name and visibility." : "Add a new top-level category to the catalog."}
          </p>
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
            {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
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
                <span>Category name</span>
                <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Electronics"
                  className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Parent category</span>
                <span className="ml-auto text-[12px] font-normal text-stone-400">blank = top level</span>
              </label>
              <select
                value={parentId}
                onChange={(e) => setParentId(e.target.value)}
                className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
              >
                <option value="">— None (top-level category) —</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Image</label>
              <CategoryImagePicker value={imageUrl} onChange={setImageUrl} label="Category image" />
            </div>

            <div>
              <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
                <span>Description</span>
                <span className="ml-auto text-[12px] font-normal text-stone-400">optional · shown on the category page</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={500}
                rows={3}
                placeholder="Short blurb describing this category for shoppers."
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

        {/* How products in this branch are sold. Inherits downward like the size
            guide below, so setting it on a root covers every child that leaves
            it blank. The product form opens locked in whatever this resolves
            to — see form/SellingTypePicker. */}
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
          <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <Icon name="tag" size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="flex items-baseline gap-1.5 text-[14.5px] font-bold tracking-tight text-stone-800">
                <span>How products here are sold</span>
                {isRoot && <span className="text-red-500">*</span>}
              </h2>
              <p className="text-[12.5px] text-stone-400">
                Products in this category open in this shape. The admin can still change it per product.
              </p>
            </div>
          </header>
          <div className="space-y-2.5 p-5">
            <div className="grid gap-2.5 sm:grid-cols-3">
              {SELLING_TYPE_CARDS.map((c) => {
                const active = sellingType === c.value;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setSellingType(active && !isRoot ? "" : c.value)}
                    aria-pressed={active}
                    className={[
                      "flex flex-col items-start gap-1 rounded-xl border p-3.5 text-left transition",
                      active
                        ? "border-brand-500 bg-brand-50/40 shadow-sm ring-1 ring-brand-500"
                        : "border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50/60",
                    ].join(" ")}
                  >
                    <span className="text-[13.5px] font-bold text-stone-800">{c.title}</span>
                    <span className="text-[12px] leading-snug text-stone-500">{c.blurb}</span>
                    <span className="text-[11.5px] text-stone-400">{c.examples}</span>
                  </button>
                );
              })}
            </div>

            {/* Children get a fourth option: leave it blank and follow the
                parent. Roots have nothing to follow, so the cards above are a
                required choice there. */}
            {!isRoot && (
              <button
                type="button"
                onClick={() => setSellingType("")}
                aria-pressed={sellingType === ""}
                className={[
                  "flex w-full items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left text-[13px] transition",
                  sellingType === ""
                    ? "border-brand-500 bg-brand-50/40 font-semibold text-stone-800 ring-1 ring-brand-500"
                    : "border-stone-200 bg-white text-stone-600 hover:border-stone-300 hover:bg-stone-50/60",
                ].join(" ")}
              >
                <Icon name="chevronRight" size={13} className="shrink-0 rotate-90 text-stone-400" />
                {inheritedSelling ? (
                  <span>
                    Inherit from parent — <strong className="font-semibold">{SELLING_TYPE_LABEL[inheritedSelling]}</strong>
                  </span>
                ) : (
                  <span>Inherit from parent — nothing set above yet</span>
                )}
              </button>
            )}

            {isRoot && !sellingType && (
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-600">
                <Icon name="warn" size={13} />
                Required — a top-level category has nothing above it to inherit from.
              </p>
            )}
            {!isRoot && !sellingType && !inheritedSelling && (
              <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-600">
                <Icon name="warn" size={13} />
                No parent has set one, so products here will open with no shape chosen. Pick one above.
              </p>
            )}
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

        {/* Sizing default for this whole branch. A product with no guide of its
            own uses the nearest ancestor that has one, so setting it high in
            the tree covers everything below without touching each leaf. */}
        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
          <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <Icon name="specGrid" size={15} />
            </span>
            <div className="min-w-0">
              <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">Sizes</h2>
              <p className="text-[12.5px] text-stone-400">Applies to every product in this category and below it.</p>
            </div>
          </header>
          <div className="p-5">
            <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
              <span>Size guide</span>
              <span className="ml-auto text-[12px] font-normal text-stone-400">optional</span>
            </label>
            <select
              value={sizeGuideId}
              onChange={(e) => setSizeGuideId(e.target.value)}
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
            >
              <option value="">
                {inheritedGuide
                  ? `— Inherit: ${inheritedGuide.name} —`
                  : "— None —"}
              </option>
              {sizeGuides.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                  {g.sizeLabel ? ` · ${g.sizeLabel}` : ""}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[12px] text-stone-400">
              {selectedGuide ? (
                <>
                  Products here start with{" "}
                  <span className="font-semibold text-stone-500">
                    {selectedGuide.values.slice(0, 8).join(", ")}
                    {selectedGuide.values.length > 8 ? " …" : ""}
                  </span>{" "}
                  and show “Select {selectedGuide.sizeLabel || "Size"}:”.
                </>
              ) : inheritedGuide ? (
                <>
                  Inherited from a parent category:{" "}
                  <span className="font-semibold text-stone-500">{inheritedGuide.name}</span>. Pick one above to
                  override it here.
                </>
              ) : sizeGuides.length === 0 ? (
                <>
                  No size guides yet —{" "}
                  <Link href="/admin/size-guides/new" className="font-semibold text-brand-600 hover:underline">
                    create one
                  </Link>
                  .
                </>
              ) : (
                "Nothing inherited — products here get plain sizes with no chart until you pick a guide."
              )}
            </p>
            {/* Selling by size with no guide is a half-configured branch: the
                Options builder has no size values to offer, so admins type
                their own and the catalog drifts ("M" / "SM" / "Mid"). */}
            {sizesNeedGuide && (
              <p className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12.5px] font-medium text-amber-700">
                <Icon name="warn" size={14} className="mt-px shrink-0" />
                <span>
                  Products here are sold by size but no guide resolves, so the product form will offer no size list
                  and sizes get typed by hand. Pick a guide above.
                </span>
              </p>
            )}
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft">
          <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
              <Icon name="info" size={15} />
            </span>
            <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">SEO (optional)</h2>
          </header>
          <div className="space-y-4 p-5">
            <input type="hidden" name="metaTitle" value={metaTitle} />
            <input type="hidden" name="metaDescription" value={metaDescription} />
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Meta title</label>
              <div className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-50">
                <input
                  type="text"
                  value={metaTitle}
                  onChange={(e) => setMetaTitle(e.target.value)}
                  maxLength={70}
                  placeholder="Defaults to the category name"
                  className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-semibold text-stone-700">Meta description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Short summary for search results. Leave blank to auto-generate."
                className="w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-50 placeholder:text-stone-400"
              />
            </div>
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
          {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Category"}
        </button>
      </div>
    </form>
  );
}
