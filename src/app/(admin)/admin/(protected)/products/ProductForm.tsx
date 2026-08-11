"use client";

/**
 * The product create/edit form.
 *
 * Seven steps, in the order a product is actually built: what it is → how it's
 * sold → photos → options & pricing → sizing → content → visibility. The old
 * "Single price / Variants" toggle is gone; selling type is the second step and
 * everything downstream follows it.
 *
 * This file owns the form STATE and the submit payload; the pieces it renders
 * live in ./form (see form/types.ts for the exact payload contract, which must
 * not drift — the server action and every saved product depend on it).
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { inheritedGuideId } from "@/lib/size-guide-inheritance";
import { inheritedSellingType } from "@/lib/category-inheritance";
import AccordionBuilder from "./AccordionBuilder";
import { saveProduct } from "./actions";
import { Card, ErrorText, FieldShell, Label, Toggle } from "./form/atoms";
import CategoryPicker from "./form/CategoryPicker";
import LivePreview from "./form/LivePreview";
import OptionsBuilder from "./form/OptionsBuilder";
import SellingTypePicker from "./form/SellingTypePicker";
import SizeGuidePanel, { type GuideOption } from "./form/SizeGuidePanel";
import { GalleryGrid, useImageUpload } from "./form/ImageUploader";
import { fmtTaka, fmtTakaInput, paisaToTakaStr, parseTaka } from "./form/helpers";
import { initialFromProduct } from "./form/initialState";
import { summarise } from "./form/variant-utils";
import {
  MAX_IMAGES,
  type Category,
  type ColorRow,
  type FormState,
  type Product,
  type SellingType,
  type VariantRow,
} from "./form/types";

/** Prose names for the three selling types, for confirms and inline notes. */
const SELLING_TYPE_NAMES: Record<SellingType, string> = {
  single: "as a single item",
  colors: "by colour",
  sizes: "by size",
};

interface Props {
  categories: Category[];
  /** Active size guides for the sizing step; omitted = none configured yet. */
  sizeGuides?: GuideOption[];
  product?: Product;
}

export default function ProductForm({ categories, sizeGuides = [], product }: Props) {
  const isEdit = !!product;
  const [form, setForm] = useState<FormState>(() => initialFromProduct(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startSave] = useTransition();
  // Rows and colours discarded by a selling-type switch, kept until save so a
  // mis-click costs nothing.
  const [stash, setStash] = useState<{ variants: VariantRow[]; colors: ColorRow[] } | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((f) => ({ ...f, [key]: val }));

  const hasOptions = form.sellingType !== "single";

  // Uploads land wherever they were started from: the gallery appends (capped
  // at MAX_IMAGES); a colour or a variant row replaces, since each holds one
  // photo. A colour's photo also flows onto every row of that colour — that is
  // the whole point of authoring colours once.
  const upload = useImageUpload((target, url) =>
    setForm((f) => {
      if (target.kind === "product") {
        return { ...f, images: [...f.images, { url }].slice(0, MAX_IMAGES) };
      }
      if (target.kind === "color") {
        const name = f.colors[target.idx]?.name ?? "";
        return {
          ...f,
          colors: f.colors.map((c, i) => (i === target.idx ? { ...c, imageUrl: url } : c)),
          variants: f.variants.map((v) => (name && v.color === name ? { ...v, imageUrl: url } : v)),
        };
      }
      return {
        ...f,
        variants: f.variants.map((v, i) => (i === target.idx ? { ...v, imageUrl: url } : v)),
      };
    }),
  );

  /* ── sizing: what this product's category resolves to ── */
  const inheritedGuide = useMemo(() => {
    const id = inheritedGuideId(categories, form.categoryId ? Number(form.categoryId) : null, true);
    return id != null ? (sizeGuides.find((g) => g.id === id) ?? null) : null;
  }, [categories, form.categoryId, sizeGuides]);
  const resolvedGuide = form.sizeGuideId
    ? (sizeGuides.find((g) => String(g.id) === form.sizeGuideId) ?? null)
    : inheritedGuide;

  /* ── selling type: the category decides, the admin may overrule ── */
  // How the chosen category says its products are sold (its own setting, or the
  // nearest ancestor's). Null only while no category is picked, or if the tree
  // is half-configured.
  const categoryType = useMemo(
    () => inheritedSellingType(categories, form.categoryId ? Number(form.categoryId) : null, true),
    [categories, form.categoryId],
  );
  /** The category that actually supplied the type, for the "Set by …" line. */
  const typeSource = useMemo(() => {
    if (!form.categoryId) return null;
    const byId = new Map(categories.map((c) => [c.id, c]));
    let cursor: number | null = Number(form.categoryId);
    const seen = new Set<number>();
    while (cursor != null && !seen.has(cursor)) {
      seen.add(cursor);
      const node = byId.get(cursor);
      if (!node) return null;
      if (node.defaultSellingType) return node.name;
      cursor = node.parentId;
    }
    return null;
  }, [categories, form.categoryId]);

  // Deliberate deviation from the category's type. Editing starts overridden:
  // a saved product's own shape always wins, so re-typing a category can never
  // rewrite products that already exist.
  const [typeOverridden, setTypeOverridden] = useState(isEdit);
  // Step 1's radio. On edit it starts on the saved shape so the category lists
  // contain the product's own category.
  const [sellingKind, setSellingKind] = useState<SellingType | "">(isEdit ? form.sellingType : "");
  // Locked only while the form genuinely matches what the category asked for.
  // If auto-apply was skipped (rows already authored), the deviation note shows
  // instead of a lock that contradicts what's on screen.
  const typeLocked = !typeOverridden && categoryType != null && form.sellingType === categoryType;
  const deviationNote =
    categoryType && form.sellingType !== categoryType
      ? `Unusual for this category — ${typeSource ?? "it"} normally sells ${SELLING_TYPE_NAMES[categoryType]}.`
      : null;

  // Everything downstream is shaped by the category, so a new product asks for
  // it first and reveals the rest once it's answered. This also removes the old
  // ordering hazard where a late category change could contradict — or discard
  // — option rows already built. Editing is never gated; it has a category.
  const ready = isEdit || !!form.categoryId;

  /**
   * Picking a category on a new product adopts its selling type. Skipped once
   * the admin has overridden the type by hand, and skipped when option rows
   * already exist — switching then would discard real work behind their back.
   */
  /**
   * The radios in step 1: which kind of category to browse. Picking one also
   * sets the selling type, since the category lists are filtered to match — so
   * whatever is chosen next agrees with it by construction. Changing the radio
   * clears the category, because the old one is no longer in the list.
   */
  const changeSellingKind = (next: SellingType) => {
    if (next === sellingKind) return;
    if (
      (form.variants.length > 0 || form.colors.length > 0) &&
      !window.confirm("Changing this clears the category and the options already built. Continue?")
    ) {
      return;
    }
    setSellingKind(next);
    setTypeOverridden(false);
    setForm((f) => ({ ...f, categoryId: "", sellingType: next, variants: [], colors: [] }));
  };

  const changeCategory = (next: string) => {
    setForm((f) => {
      const resolved = inheritedSellingType(categories, next ? Number(next) : null, true);
      const adopt =
        !isEdit && !typeOverridden && resolved != null && f.variants.length === 0 && f.colors.length === 0;
      return adopt ? { ...f, categoryId: next, sellingType: resolved } : { ...f, categoryId: next };
    });
  };

  /** Reaching for another card while locked. Confirms once, then unlocks. */
  const requestTypeChange = (next: SellingType) => {
    const label = typeSource ?? "This category";
    if (next !== form.sellingType && !window.confirm(`${label} sells ${SELLING_TYPE_NAMES[categoryType ?? next]}. Sell this product as ${SELLING_TYPE_NAMES[next]} instead?`)) {
      return;
    }
    setTypeOverridden(true);
    if (next !== form.sellingType) changeSellingType(next);
  };

  const liveErrors = useMemo(() => {
    const e: Record<string, string> = {};
    if (form.price !== "" && form.discountPrice !== "" && Number(form.discountPrice) >= Number(form.price)) {
      e.discountPrice = "Discount price must be lower than the regular price.";
    }
    return e;
  }, [form.price, form.discountPrice]);

  const stockLow = form.stock !== "" && Number(form.stock) === 0;
  const discountPct =
    form.price !== "" && form.discountPrice !== "" && !liveErrors.discountPrice
      ? Math.round((1 - Number(form.discountPrice) / Number(form.price)) * 100)
      : 0;

  // Gross margin per unit: (selling − cost) / selling. Selling price is the
  // discount price when one is set, otherwise the regular price.
  const sellingPrice =
    form.discountPrice !== "" && !liveErrors.discountPrice
      ? Number(form.discountPrice)
      : form.price !== ""
        ? Number(form.price)
        : 0;
  const marginPct =
    sellingPrice > 0 && form.purchaseCost !== "" && Number(form.purchaseCost) >= 0
      ? Math.round(((sellingPrice - Number(form.purchaseCost)) / sellingPrice) * 100)
      : null;

  const removeImage = (idx: number) => setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  // Promote a photo to the front of the list — the first image is the cover/thumbnail.
  const makePrimary = (idx: number) =>
    setForm((f) => {
      if (idx === 0) return f;
      const next = [...f.images];
      const [img] = next.splice(idx, 1);
      next.unshift(img);
      return { ...f, images: next };
    });

  /**
   * Switching selling type. Moving to "single" puts the rows aside rather than
   * deleting them, and switching back restores them — the confirm only fires
   * when real work would disappear from the save.
   */
  const changeSellingType = (next: SellingType) => {
    if (next === form.sellingType) return;

    // Coming back to a type the stashed rows actually fit → restore them, so a
    // mis-click costs nothing. Sized rows can't come back under "Colours", and
    // rows authored since the stash was taken are NOT thrown away for it: the
    // stash is an undo, not a snapshot that outranks current work.
    const stashFits =
      stash &&
      form.variants.length === 0 &&
      (next === "sizes" || !stash.variants.some((v) => v.size.trim()));
    if (next !== "single" && stashFits && stash) {
      const restored = stash;
      setStash(null);
      setForm((f) => ({ ...f, sellingType: next, variants: restored.variants, colors: restored.colors }));
      return;
    }

    if (next === "single" && form.variants.length > 0) {
      if (!window.confirm(`This product has ${form.variants.length} options. Set them aside and sell it as one item?`)) {
        return;
      }
      setStash({ variants: form.variants, colors: form.colors });
      setForm((f) => ({ ...f, sellingType: next, variants: [], colors: [] }));
      return;
    }

    // Sizes → colours collapses the matrix to one row per colour. The full set
    // is stashed, so switching back to Sizes brings it straight back.
    if (next === "colors" && form.variants.some((v) => v.size.trim())) {
      if (!window.confirm("Drop the sizes and keep one option per colour?")) return;
      const perColor = new Map<string, VariantRow>();
      for (const v of form.variants) {
        const name = v.color.trim();
        if (!name || perColor.has(name)) continue;
        perColor.set(name, { ...v, size: "" });
      }
      setStash({ variants: form.variants, colors: form.colors });
      setForm((f) => ({ ...f, sellingType: next, variants: [...perColor.values()] }));
      return;
    }

    set("sellingType", next);
  };

  // Serialize variants for the hidden input / submit: a row needs a colour or a
  // size plus a price. Price stays in Taka (the server action converts to paisa).
  // A single item submits no variants at all.
  const cleanVariants = () =>
    hasOptions
      ? form.variants
          .filter((v) => (v.color.trim() || v.size.trim()) && Number(v.price) > 0)
          .map((v) => {
            const price = Number(v.price);
            const disc = Number(v.discountPrice);
            return {
              colorName: v.color.trim() || null,
              size: v.size.trim() || null,
              price,
              // Only a positive discount strictly below the price counts.
              discountPrice: v.discountPrice.trim() && disc > 0 && disc < price ? disc : null,
              stock: Math.max(0, Number(v.stock) || 0),
              showStock: v.showStock,
              // "" = inherit the product's colour; the server re-validates the hex.
              priceColor: v.priceColor || null,
              // Uploaded photo for this row; the server re-validates the URL.
              imageUrl: v.imageUrl || null,
              sku: v.sku.trim() || null,
            };
          })
      : [];

  // The product gallery, serialized for submit. These are whole-product photos;
  // a variant's own photo travels on its variant row instead, so nothing here
  // carries a variant link. Still submitted for option products (where the
  // uploader is hidden) so switching selling type never deletes a product's
  // photos.
  const cleanImages = () =>
    form.images.filter((img) => img.url.trim()).map((img) => ({ url: img.url.trim(), variantLabel: null }));

  /**
   * The ProductColor list — the storefront's colour swatches and, for colours
   * whose rows carry no photo of their own, the photo the gallery swaps to.
   * Authored directly now (the Options step's colour list) rather than derived
   * from the variant rows. Named colours only; a single item has none.
   */
  const cleanColors = () =>
    hasOptions
      ? form.colors
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name.trim(),
            hexCode: (c.hexCode || "#000000").trim(),
            imageUrl: c.imageUrl || "",
          }))
      : [];

  // Accordion panels for the storefront's "Features & Specs" tab, serialized
  // for submit. A panel needs both a title and a body — half-filled rows the
  // admin abandoned are dropped rather than saved as empty headers. Array order
  // is display order; the server assigns sortOrder positionally.
  const cleanAccordionSections = () =>
    form.accordionSections
      .map((s) => ({
        title: s.title.trim(),
        icon: s.icon.trim(),
        content: s.content.trim(),
        isOpen: s.isOpen,
      }))
      .filter((s) => s.title && s.content);

  // The product row always needs a base price & stock. With options they're
  // derived from the rows — lowest price becomes the storefront "from" price,
  // stock is the sum — so listings and cards stay in sync.
  const derivedBase = () => {
    const rows = cleanVariants();
    if (rows.length === 0) return { priceTaka: "" as number | "", stock: 0 };
    // "From" price reflects the lowest amount a shopper actually pays, so use the
    // discounted price where one is set.
    const priceTaka = Math.min(...rows.map((r) => r.discountPrice ?? r.price));
    const stock = rows.reduce((sum, r) => sum + r.stock, 0);
    return { priceTaka, stock };
  };

  // Base price (taka) and stock actually submitted, per selling type.
  const submitPriceTaka = (): number | "" => (hasOptions ? derivedBase().priceTaka : paisaToTakaStr(form.price) === "" ? "" : Number(form.price) / 100);
  const submitStock = (): number | "" => (hasOptions ? derivedBase().stock : form.stock);

  const optionSummary = summarise(form.variants);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const base = { price: submitPriceTaka(), stock: submitStock() };
    fd.set("price", base.price === "" ? "" : String(base.price));
    fd.set("stock", base.stock === "" ? "" : String(base.stock));
    fd.set("images", JSON.stringify(cleanImages()));
    fd.set("colors", JSON.stringify(cleanColors()));
    fd.set("accordionSections", JSON.stringify(cleanAccordionSections()));
    fd.set("variants", JSON.stringify(cleanVariants()));

    const clientErrors: Record<string, string> = { ...liveErrors };
    if (!form.name.trim()) clientErrors.name = "Name is required.";
    if (!form.categoryId) clientErrors.categoryId = "Please select a category.";
    if (hasOptions) {
      // The rows carry the price/stock; require at least one saveable row and
      // refuse to save a half-priced matrix.
      if (cleanVariants().length === 0) {
        clientErrors.variants = "Add at least one option with a colour or size and a price.";
      } else if (optionSummary.missingPrice > 0) {
        clientErrors.variants = `${optionSummary.missingPrice} option${optionSummary.missingPrice === 1 ? "" : "s"} still need a price.`;
      } else if (optionSummary.duplicateSkus.length > 0) {
        clientErrors.variants = `Duplicate SKU: ${optionSummary.duplicateSkus.join(", ")}.`;
      }
    } else {
      if (!form.price || Number(form.price) <= 0) clientErrors.price = "Price must be greater than zero.";
      if (form.stock === "" || Number(form.stock) < 0) clientErrors.stock = "Stock cannot be negative.";
    }
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    startSave(async () => {
      const result = await saveProduct(product?.id ?? null, fd);
      if (result?.fieldErrors) setErrors(result.fieldErrors);
      else if (result?.error) setErrors({ _form: result.error });
      // success → redirect happens server-side
    });
  };

  return (
    <>
    {/* Full-bleed: the form spans the whole admin canvas rather than a centred
        column, so wide screens gain editing room instead of empty gutters. */}
    <form onSubmit={handleSubmit} className="font-manrope w-full px-5 py-6 pb-32 lg:px-8 lg:pb-10">
      {/* hidden inputs for the server action — saveProduct expects taka, not paisa */}
      <input type="hidden" name="name" value={form.name} />
      <input type="hidden" name="categoryId" value={form.categoryId} />
      {/* No longer editable — the accordion is the only body copy. Still
          submitted so an existing product's description survives a save; it
          continues to feed search, feeds and the meta-description fallback. */}
      <input type="hidden" name="description" value={form.description} />
      <input type="hidden" name="price" value={(() => { const p = submitPriceTaka(); return p === "" ? "" : String(p); })()} />
      <input type="hidden" name="discountPrice" value={hasOptions ? "" : paisaToTakaStr(form.discountPrice)} />
      <input type="hidden" name="purchaseCost" value={paisaToTakaStr(form.purchaseCost)} />
      <input type="hidden" name="stock" value={(() => { const s = submitStock(); return s === "" ? "" : String(s); })()} />
      <input type="hidden" name="lowStockThreshold" value={form.lowStockThreshold === "" ? "" : String(form.lowStockThreshold)} />
      <input type="hidden" name="showStock" value={form.showStock ? "true" : "false"} />
      <input type="hidden" name="priceColor" value={form.priceColor} />
      <input type="hidden" name="status" value={form.status} />
      <input type="hidden" name="promoBadge" value={form.promoBadge} />
      <input type="hidden" name="metaTitle" value={form.metaTitle} />
      <input type="hidden" name="metaDescription" value={form.metaDescription} />
      {form.isFeatured && <input type="hidden" name="isFeatured" value="on" />}
      {/* Sizing: only meaningful for products that have options at all. */}
      <input type="hidden" name="sizeGuideId" value={hasOptions ? form.sizeGuideId : ""} />
      <input type="hidden" name="sizeLabel" value={hasOptions ? form.sizeLabel : ""} />
      <input type="hidden" name="sizeChart" value={hasOptions ? form.sizeChart : ""} />
      <input type="hidden" name="baseSku" value={form.baseSku} />
      <input type="hidden" name="images" value={JSON.stringify(cleanImages())} />
      <input type="hidden" name="colors" value={JSON.stringify(cleanColors())} />
      <input type="hidden" name="accordionSections" value={JSON.stringify(cleanAccordionSections())} />
      <input type="hidden" name="variants" value={JSON.stringify(cleanVariants())} />

      <nav className="flex flex-wrap items-center gap-1.5 text-[13px] font-medium text-stone-500">
        <Link href="/admin/products" className="rounded-md px-1 py-0.5 hover:bg-stone-100 hover:text-stone-700">
          Products
        </Link>
        <Icon name="chevronRight" size={13} className="text-stone-300" />
        <span className="text-stone-800">{isEdit ? "Edit" : "New"}</span>
        {isEdit && form.name && (
          <>
            <Icon name="chevronRight" size={13} className="text-stone-300" />
            <span className="truncate max-w-[260px] text-stone-400">{form.name}</span>
          </>
        )}
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">{isEdit ? "Edit Product" : "New Product"}</h1>
          <p className="mt-1 text-[14px] text-stone-500">
            {isEdit ? "Update product details, pricing, and inventory." : "Add a new product to your storefront catalog."}
          </p>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          <Link
            href="/admin/products"
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-[13.5px] font-semibold text-stone-600 transition hover:bg-stone-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
          >
            {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </div>

      {errors._form && (
        <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{errors._form}</p>
      )}

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] 2xl:gap-8 2xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="space-y-6 min-w-0">
          {/* ── 1. What it is ───────────────────────────────── */}
          <Card icon="info" title="1 · What it is" hint="The name customers see, and where it sits in the catalog.">
            <div className="space-y-4">
              <div>
                <Label required>Product name</Label>
                <FieldShell error={errors.name}>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    placeholder="e.g. Wireless Noise-Cancelling Headphones"
                    className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                  />
                </FieldShell>
                <ErrorText>{errors.name}</ErrorText>
              </div>
              {/* Shape first, then a category list filtered to it, then the
                  sub-category. Category leads everything downstream: it decides
                  which size guide this product inherits. */}
              <div className="border-t border-stone-100 pt-4">
                <CategoryPicker
                  kind={sellingKind}
                  onKindChange={changeSellingKind}
                  value={form.categoryId}
                  onChange={changeCategory}
                  error={errors.categoryId}
                  categories={categories}
                />
                <ErrorText>{errors.categoryId}</ErrorText>
              </div>
            </div>
          </Card>

          {!ready && (
            <div className="rounded-xl border border-dashed border-stone-300 bg-stone-50/60 px-5 py-10 text-center">
              <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-white text-stone-400 shadow-sm">
                <Icon name="tag" size={18} />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-stone-700">Pick a category to continue</p>
              <p className="mx-auto mt-1 max-w-sm text-[12.5px] text-stone-400">
                The category decides how this product is sold — one price, colours, or sizes — and the rest of the
                form follows from that.
              </p>
            </div>
          )}

          {/* ── 2. How it's sold ────────────────────────────── */}
          {ready && (
          <Card
            icon="tag"
            title="2 · How is it sold?"
            hint={
              typeLocked
                ? "Confirmed from the category above — change it if this product is the exception."
                : "This decides what the pricing step below asks for."
            }
          >
            <SellingTypePicker
              value={form.sellingType}
              onChange={changeSellingType}
              locked={typeLocked}
              lockedBy={typeSource}
              onRequestChange={requestTypeChange}
              deviationNote={deviationNote}
            />
            {stash && form.sellingType === "single" && (
              <p className="mt-2.5 text-[12px] text-stone-400">
                {stash.variants.length} option{stash.variants.length === 1 ? "" : "s"} set aside — switch back before
                saving to restore them.
              </p>
            )}
          </Card>
          )}

          {ready && (
          <>
          {/* ── 3. Photos ───────────────────────────────────── */}
          <Card
            icon="image"
            title="3 · Photos"
            hint={
              hasOptions
                ? "The shared gallery. Each colour also carries its own photo in the next step."
                : "Shown on the product page and in listings."
            }
          >
            <GalleryGrid
              images={form.images}
              busy={upload.isBusy({ kind: "product" })}
              error={upload.error}
              onPick={() => upload.openFor({ kind: "product" })}
              onRemove={removeImage}
              onMakePrimary={makePrimary}
            />
          </Card>

          {/* ── 4. Options & pricing ────────────────────────── */}
          <Card
            icon="grid"
            title="4 · Options & pricing"
            hint={
              form.sellingType === "single"
                ? "One price and one stock for the whole product."
                : form.sellingType === "colors"
                  ? "One option per colour, each with its own photo, price and stock."
                  : "Sizes crossed with colours. Set a price for all, then override the odd one."
            }
          >
            {form.sellingType !== "single" ? (
              <OptionsBuilder
                sellingType={form.sellingType}
                colors={form.colors}
                rows={form.variants}
                baseSku={form.baseSku}
                guideValues={resolvedGuide?.values ?? []}
                guideName={resolvedGuide?.name ?? null}
                error={errors.variants}
                imageError={upload.error}
                isColorBusy={(idx) => upload.isBusy({ kind: "color", idx })}
                isRowBusy={(idx) => upload.isBusy({ kind: "variant", idx })}
                onPickColorPhoto={(idx) => upload.openFor({ kind: "color", idx })}
                onPickRowPhoto={(idx) => upload.openFor({ kind: "variant", idx })}
                onColorsChange={(next) => set("colors", next)}
                onRowsChange={(next) => set("variants", next)}
                onBaseSkuChange={(next) => set("baseSku", next)}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label required>Price</Label>
                  <FieldShell prefix="৳" error={errors.price}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={fmtTakaInput(form.price)}
                      onChange={(e) => set("price", parseTaka(e.target.value))}
                      placeholder="0"
                      className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                    />
                  </FieldShell>
                  <ErrorText>{errors.price}</ErrorText>
                </div>
                <div>
                  <Label hint="optional">Discount price</Label>
                  <FieldShell prefix="৳" error={liveErrors.discountPrice}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={fmtTakaInput(form.discountPrice)}
                      onChange={(e) => set("discountPrice", parseTaka(e.target.value))}
                      placeholder="0"
                      className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                    />
                  </FieldShell>
                  {liveErrors.discountPrice ? (
                    <ErrorText>{liveErrors.discountPrice}</ErrorText>
                  ) : discountPct > 0 ? (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-600">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                      -{discountPct}% off
                    </p>
                  ) : null}
                </div>
                <div>
                  <Label required>Stock on hand</Label>
                  <FieldShell error={errors.stock}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.stock === "" ? "" : String(form.stock)}
                      onChange={(e) => set("stock", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="0"
                      className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                    />
                  </FieldShell>
                  <ErrorText>{errors.stock}</ErrorText>
                  {stockLow && !errors.stock && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-amber-600">
                      <Icon name="warn" size={13} />
                      Out of stock — product won&apos;t be purchasable.
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Product-level settings — these apply however it's sold. */}
            <div className="mt-5 border-t border-stone-100 pt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label hint="for profit reports">Sourcing cost</Label>
                  <FieldShell prefix="৳" error={errors.purchaseCost}>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={fmtTakaInput(form.purchaseCost)}
                      onChange={(e) => set("purchaseCost", parseTaka(e.target.value))}
                      placeholder="0"
                      className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                    />
                  </FieldShell>
                  <ErrorText>{errors.purchaseCost}</ErrorText>
                  {/* Margin is against the single price, which an option product
                      doesn't have — each row is priced on its own. */}
                  {marginPct != null && !hasOptions && !errors.purchaseCost && (
                    <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-emerald-600">
                      <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {marginPct}% margin per unit
                    </p>
                  )}
                </div>
                <div>
                  <Label hint="0 = off">Low-stock alert at</Label>
                  <FieldShell>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.lowStockThreshold === "" ? "" : String(form.lowStockThreshold)}
                      onChange={(e) => set("lowStockThreshold", e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 5"
                      className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                    />
                  </FieldShell>
                  <p className="mt-1.5 text-[12px] text-stone-400">
                    Warn on the dashboard when stock drops to this level.
                  </p>
                </div>
              </div>

              {/* Storefront stock visibility — hides the "In stock (N available)"
                  count without changing availability. Mirrors the per-variant
                  "Show stock count on site" toggle. */}
              <div className="mt-4 border-t border-stone-100 pt-4">
                <label className="flex cursor-pointer items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={form.showStock}
                    onChange={(e) => set("showStock", e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>
                    <span className="block text-[13px] font-medium text-stone-700">
                      Show stock count on site
                    </span>
                    <span className="block text-[12px] text-stone-400">
                      Displays “In stock (N available)” on the product page. Turning
                      it off hides the number — the product stays purchasable.
                    </span>
                  </span>
                </label>
              </div>

              {/* Storefront price colour. Empty = the theme default (near-black),
                  so leaving it alone keeps every existing product unchanged.
                  Presentational only — it never affects the amount charged. */}
              <div className="mt-4 border-t border-stone-100 pt-4">
                <Label hint="optional">Price text colour</Label>
                <div className="flex items-center gap-2.5">
                  <input
                    type="color"
                    value={form.priceColor || "#111827"}
                    onChange={(e) => set("priceColor", e.target.value)}
                    aria-label="Price text colour"
                    className="h-9 w-12 cursor-pointer rounded-md border border-stone-200 bg-white p-1"
                  />
                  <span
                    className="text-[18px] font-extrabold"
                    style={form.priceColor ? { color: form.priceColor } : undefined}
                  >
                    {/* An option product has no single price to preview — each row
                        carries its own — so show a neutral sample instead. */}
                    {hasOptions ? "৳ Price" : fmtTaka(form.price === "" ? 0 : Number(form.price))}
                  </span>
                  {form.priceColor && (
                    <button
                      type="button"
                      onClick={() => set("priceColor", "")}
                      className="ml-auto rounded-md px-2 py-1 text-[12px] font-medium text-stone-500 hover:bg-stone-100 hover:text-stone-700"
                    >
                      Reset to default
                    </button>
                  )}
                </div>
                <p className="mt-1.5 text-[12px] text-stone-400">
                  {form.priceColor
                    ? hasOptions
                      ? "Used for prices on the storefront, unless an option sets its own."
                      : "Used for this product’s price on the storefront."
                    : "Not set — the price shows in the default colour (black)."}
                </p>
              </div>
            </div>
          </Card>

          {/* ── 5. Sizing ───────────────────────────────────── */}
          {form.sellingType === "sizes" && (
            <Card
              icon="specGrid"
              title="5 · Sizing"
              hint="Which sizes this product offers, what to call them, and the chart behind the link."
            >
              <SizeGuidePanel
                guides={sizeGuides}
                value={form.sizeGuideId}
                onChange={(v) => set("sizeGuideId", v)}
                inherited={inheritedGuide}
                resolved={resolvedGuide}
                labelOverride={form.sizeLabel}
                chartOverride={form.sizeChart}
                onLabelChange={(v) => set("sizeLabel", v)}
                onChartChange={(v) => set("sizeChart", v)}
              />
            </Card>
          )}

          {/* ── 6. Content ──────────────────────────────────── */}
          <Card
            icon="file"
            title={`${form.sellingType === "sizes" ? "6" : "5"} · Content`}
            hint="The collapsible panels under “Features & Specs” on the product page."
          >
            <AccordionBuilder
              value={form.accordionSections}
              onChange={(rows) => set("accordionSections", rows)}
            />
          </Card>
          </>
          )}
        </div>

        {/* ── right rail ── */}
        {/* Gated with the steps on the left: these are product fields too, and
            a live preview of a product with no category yet previews nothing. */}
        <div className="space-y-6 lg:sticky lg:top-6 self-start">
          {ready && (
          <>
          <Card icon="eye" title="Live preview" hint="How customers will see it.">
            <LivePreview
              form={form}
              basePricePaisa={(() => {
                const p = submitPriceTaka();
                return p === "" ? "" : Math.round(Number(p) * 100);
              })()}
              fromPrice={hasOptions}
            />
            {hasOptions && form.variants.length > 0 && (
              <p className="mt-2.5 text-[12px] text-stone-400">
                {optionSummary.count} option{optionSummary.count === 1 ? "" : "s"} ·{" "}
                {optionSummary.totalStock} in stock
                {optionSummary.missingPrice > 0 && (
                  <span className="font-semibold text-red-600"> · {optionSummary.missingPrice} unpriced</span>
                )}
              </p>
            )}
          </Card>

          <Card icon="eye" title="Visibility">
            <div className="space-y-4">
              <Toggle
                checked={form.status === "ACTIVE"}
                onChange={(v) => set("status", v ? "ACTIVE" : "INACTIVE")}
                icon="eye"
                label="Active"
                sublabel={form.status === "ACTIVE" ? "Visible on the storefront" : "Hidden — won't show in catalog"}
              />
              <div className="border-t border-stone-100" />
              <Toggle
                checked={form.isFeatured}
                onChange={(v) => set("isFeatured", v)}
                icon="star"
                label="Featured on homepage"
                sublabel="Highlight in homepage carousels"
              />
            </div>
          </Card>

          <Card icon="tag" title="Promo badge">
            <Label hint="optional · max 20 chars">Badge label</Label>
            <FieldShell>
              <input
                type="text"
                value={form.promoBadge}
                onChange={(e) => set("promoBadge", e.target.value)}
                maxLength={20}
                placeholder='e.g. "Best Seller", "New"'
                className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
              />
            </FieldShell>
            <p className="mt-2 text-[12px] text-stone-400">Appears as a colored ribbon on the product card.</p>
          </Card>

          <Card icon="tag" title="SEO (optional)">
            <Label hint="optional · defaults to product name">Meta title</Label>
            <FieldShell>
              <input
                type="text"
                value={form.metaTitle}
                onChange={(e) => set("metaTitle", e.target.value)}
                maxLength={70}
                placeholder="Custom search-engine title"
                className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
              />
            </FieldShell>
            <Label hint="optional · ~160 chars · worth writing">Meta description</Label>
            <FieldShell>
              <textarea
                value={form.metaDescription}
                onChange={(e) => set("metaDescription", e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Short summary shown in Google & social previews"
                className="w-full resize-y bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
              />
            </FieldShell>
            <p className="mt-2 text-[12px] text-stone-400">
              Leave blank and Google falls back to a generic line built from the product name.
            </p>
          </Card>
          </>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex items-center gap-2 border-t border-stone-200 bg-white p-3 shadow-[0_-4px_20px_-8px_rgba(0,0,0,0.08)] lg:hidden">
        <Link href="/admin/products" className="rounded-xl border border-stone-200 px-4 py-3 text-[14px] font-semibold text-stone-600">
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-3 text-[14.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:opacity-60"
        >
          {pending ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
        </button>
      </div>
    </form>

    {upload.customizer}
    </>
  );
}
