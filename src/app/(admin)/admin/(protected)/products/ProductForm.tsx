"use client";

/**
 * The product create/edit form.
 *
 * In the order a product is actually built: what it is → how it's sold →
 * (sizing OR photos OR neither) → options & pricing → content, with visibility
 * and the live preview in the right rail. The old "Single price / Variants"
 * toggle is gone; selling type is the second step and everything downstream
 * follows it — including what step three is, and whether there is one:
 *
 *   sizes   → Sizing. Photos are per-colour, set on each row in options.
 *   colors  → neither. Each colour carries its own photo, same as above, and
 *             there are no sizes to declare — so this type has four steps.
 *   single  → Photos. One product, one gallery, nothing to cross.
 *
 * A shared gallery only makes sense when there are no options to own the
 * pictures. The steps after the third close the gap when it is absent, so the
 * numbering an admin reads never skips (see `stepNo`).
 *
 * This file owns the form STATE and the submit payload; the pieces it renders
 * live in ./form (see form/types.ts for the exact payload contract, which must
 * not drift — the server action and every saved product depend on it).
 */

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { formatTaka, priceFromMargin } from "@/lib/money";
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
import { draftKey, useDraftAutosave } from "./form/useDraftAutosave";
import { rowKey, summarise } from "./form/variant-utils";
import {
  MAX_IMAGES,
  type Category,
  type ColorRow,
  type FormState,
  type LandedCostInfo,
  type Product,
  type SellingType,
  type VariantRow,
} from "./form/types";

/** "4 minutes ago" for the draft-rescue banner. */
function relativeTime(ts: number) {
  const mins = Math.round((Date.now() - ts) / 60000);
  if (mins < 1) return "a moment ago";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

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
  /**
   * Landed cost per variant id, from the product's purchase orders. Keyed by id
   * rather than by combination because that is what the server knows; the form
   * re-keys it below. Absent on the create form, which has no history yet.
   */
  landedCosts?: Record<number, LandedCostInfo>;
  /**
   * TRUE when the admin arrived from a purchase order's "Finish it". The row
   * already exists — stock was received against it — but to the admin this is
   * the first time the product is being written, so the page calls itself a
   * creation rather than an edit. Only the wording changes; every field, guard
   * and submit path is the ordinary edit flow underneath.
   */
  fromSupplier?: boolean;
}

export default function ProductForm({
  categories,
  sizeGuides = [],
  product,
  landedCosts,
  fromSupplier = false,
}: Props) {
  const isEdit = !!product;
  // The state this form opened with. Autosave compares against it so an
  // untouched form never leaves a draft behind.
  const baseline = useMemo(() => initialFromProduct(product, landedCosts), [product, landedCosts]);
  const [form, setForm] = useState<FormState>(baseline);
  const [errors, setErrors] = useState<Record<string, string>>({});
  // Target gross margin, as typed. Held outside `form` because it is an INPUT
  // METHOD for the price rather than a field of its own — nothing persists it,
  // and clearing it must not clear the price it produced.
  const [marginTarget, setMarginTarget] = useState("");
  const [pending, startSave] = useTransition();

  // Crash protection: mirrors the form into localStorage as it's typed and
  // offers it back after a reload, a closed tab or a browser crash.
  const draft = useDraftAutosave<FormState>({
    key: draftKey(product?.id ?? null),
    state: form,
    baseline,
    onRestore: setForm,
  });
  // Rows and colours discarded by a selling-type switch, kept until save so a
  // mis-click costs nothing.
  const [stash, setStash] = useState<{ variants: VariantRow[]; colors: ColorRow[] } | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((f) => ({ ...f, [key]: val }));

  const hasOptions = form.sellingType !== "single";

  /**
   * Step 3 is whichever of Sizing and Photos this selling type calls for —
   * sizes gets the size guide, a single item gets the shared gallery, and
   * selling by colour gets neither, because each colour carries its own photo
   * on its own row in the options step.
   *
   * So the form is five steps for two of the three types and four for the
   * third. The numbers after step 3 have to close that gap, or an admin
   * selling by colour reads a form that counts 1, 2, 4, 5 and hunts for the
   * step they think they skipped.
   */
  const hasStepThree = form.sellingType !== "colors";
  /** Position of a step that falls AFTER the conditional third one. */
  const stepNo = (n: number) => (hasStepThree ? n : n - 1);

  /**
   * Options whose stock is already in the ledger — everything this product had
   * when the page loaded. Their level is changed by receiving a purchase order
   * or by an audited adjustment, never by re-saving this form, so the form
   * shows those numbers instead of offering them for editing. Anything the
   * admin adds now is absent from the set and still takes an opening figure.
   *
   * Keyed off the product prop, not form state, so adding a row can't
   * accidentally unlock a row that already exists.
   */
  const lockedStockKeys = useMemo(
    () => new Set((product?.variants ?? []).map((v) => rowKey(v.colorName ?? "", v.size ?? ""))),
    [product],
  );

  /**
   * Landed cost per option row, re-keyed from variant id to the colour/size
   * combination the editor works in. Same reasoning as lockedStockKeys: derived
   * from the product prop, so it describes what is SAVED rather than what is
   * currently typed — a row renamed in the form has no landed cost until the
   * rename is saved and its purchase history follows.
   */
  const landedCostKeys = useMemo(() => {
    const byKey = new Map<string, LandedCostInfo>();
    for (const v of product?.variants ?? []) {
      const info = landedCosts?.[v.id];
      if (info) byKey.set(rowKey(v.colorName ?? "", v.size ?? ""), info);
    }
    return byKey;
  }, [product, landedCosts]);

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

  // Is anything actually discounted? The offer strip is gated on this, and an
  // option product carries its discounts per row rather than on the product, so
  // both shapes have to be checked to know whether the strip would ever show.
  const hasAnyDiscount = hasOptions
    ? form.variants.some(
        (v) => v.discountPrice !== "" && Number(v.discountPrice) > 0 && Number(v.discountPrice) < Number(v.price),
      )
    : discountPct > 0;

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

  // Cost basis in PAISA. On edit the figure is owned by purchase-order receipts
  // (rendered read-only above) rather than by this form, so read it from the
  // product; on create it is whatever the admin has typed so far.
  const costPaisa = isEdit
    ? (product?.purchaseCost ?? 0)
    : form.purchaseCost === ""
      ? 0
      : Number(form.purchaseCost);

  /**
   * Sell price for the margin the admin is aiming at — the whole point of the
   * pricing bar under a single product's price. Null while there is nothing to
   * work out (no cost, an empty box, or a margin of 100%+, where the formula
   * has no answer), which is also what disables the button.
   */
  const marginPrice = marginTarget.trim() === "" ? null : priceFromMargin(costPaisa, Number(marginTarget));

  // Margin for a product sold by option.
  //
  // Previously this was simply not shown: margin was computed against the
  // single product price, which an option product doesn't meaningfully have, so
  // the whole readout was hidden behind `!hasOptions`. For a catalogue that is
  // entirely option products that meant the calculator never appeared at all.
  //
  // Each option carries its own price, so the honest answer is a RANGE across
  // them rather than one number. NOTE the unit change: option prices are taka
  // strings (see form/variant-utils.ts) while `costPaisa` is paisa, so the two
  // are reconciled here rather than compared directly.
  const optionMargins =
    hasOptions && costPaisa > 0
      ? form.variants
          .map((v) => {
            const price = Number(v.price) || 0;
            const disc = Number(v.discountPrice) || 0;
            const effTaka = disc > 0 && disc < price ? disc : price;
            const effPaisa = Math.round(effTaka * 100);
            return effPaisa > 0 ? Math.round(((effPaisa - costPaisa) / effPaisa) * 100) : null;
          })
          .filter((m): m is number => m != null)
      : [];
  const optionMarginLo = optionMargins.length ? Math.min(...optionMargins) : null;
  const optionMarginHi = optionMargins.length ? Math.max(...optionMargins) : null;
  // Options priced at or below what the goods cost — every sale loses money,
  // which is worth catching while pricing rather than in a monthly report.
  const optionsBelowCost = optionMargins.filter((m) => m <= 0).length;

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
        // Name the way out. A product ordered from a purchase order arrives
        // with every option unpriced, so this is the ordinary state of a draft
        // being finished — not a typo — and one profit percentage prices the
        // whole matrix off what each option cost.
        clientErrors.variants =
          `${optionSummary.missingPrice} option${optionSummary.missingPrice === 1 ? "" : "s"} still need a price. ` +
          `Set a gross profit % above and press “Price from cost” to price them all at once.`;
      } else if (optionSummary.duplicateSkus.length > 0) {
        clientErrors.variants = `Duplicate SKU: ${optionSummary.duplicateSkus.join(", ")}.`;
      }
    } else {
      if (!form.price || Number(form.price) <= 0) clientErrors.price = "Price must be greater than zero.";
      if (form.stock === "" || Number(form.stock) < 0) clientErrors.stock = "Stock cannot be negative.";
    }
    setErrors(clientErrors);
    if (Object.keys(clientErrors).length) return;

    // Stop mirroring and drop the draft: a successful save redirects away, and
    // a stale draft would then be offered back over the saved product.
    draft.suspend();
    startSave(async () => {
      const result = await saveProduct(product?.id ?? null, fd);
      // Success redirects server-side, so reaching here at all means the save
      // was rejected. Resume ONLY on an explicit error: resuming unconditionally
      // would re-write the draft if a success ever returned normally, and that
      // stale draft would then be offered on the next new-product form.
      if (result?.fieldErrors) {
        draft.resume();
        setErrors(result.fieldErrors);
      } else if (result?.error) {
        draft.resume();
        setErrors({ _form: result.error });
      }
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
      <input type="hidden" name="offerText" value={form.offerText} />
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
        <span className="text-stone-800">
          {fromSupplier ? "From supplier" : isEdit ? "Edit" : "New"}
        </span>
        {isEdit && !fromSupplier && form.name && (
          <>
            <Icon name="chevronRight" size={13} className="text-stone-300" />
            <span className="truncate max-w-[260px] text-stone-400">{form.name}</span>
          </>
        )}
      </nav>

      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">
            {fromSupplier
              ? "Create New Product from Supplier"
              : isEdit
                ? "Edit Product"
                : "New Product"}
          </h1>
          <p className="mt-1 text-[14px] text-stone-500">
            {fromSupplier
              ? "Set the details and price for the units you just received, then put them on sale."
              : isEdit
                ? "Update product details, pricing, and inventory."
                : "Add a new product to your storefront catalog."}
          </p>
        </div>
        <div className="hidden items-center gap-2 lg:flex">
          {/* Reassurance that the safety net is on — the admin can see the work
              is held locally, so a crash is no longer a lost afternoon. */}
          {draft.savedAt != null && !draft.offer && (
            <span className="mr-1 flex items-center gap-1.5 text-[12.5px] text-stone-400">
              <Icon name="check" size={13} className="text-brand-600" />
              Draft saved on this computer
            </span>
          )}
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

      {/* Crash rescue. Offered, never applied on its own — on an edit form a
          silent restore would hide what the product actually holds. */}
      {draft.offer && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <Icon name="info" size={16} className="shrink-0 text-amber-600" />
          <p className="min-w-0 flex-1 text-[13px] text-amber-900">
            <span className="font-semibold">Unsaved work found</span> — this form was left with unsaved changes{" "}
            {relativeTime(draft.offer.savedAt)}. Restore them?
          </p>
          <span className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={draft.discard}
              className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12.5px] font-semibold text-amber-800 transition hover:bg-amber-100"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={draft.restore}
              className="rounded-lg bg-amber-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-amber-700"
            >
              Restore
            </button>
          </span>
        </div>
      )}

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
          {/* ── 3. Sizing — selling by size only ─────────────── */}
          {form.sellingType === "sizes" && (
            <Card
              icon="specGrid"
              title="3 · Sizing"
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

          {/* ── 3. Photos — single items only ────────────────── */}
          {/* Single-item products only. As soon as a product has options, every
              photo belongs to one of them and is set on that option's own row in
              step 4 — a shared gallery here would be a second, competing place to
              put pictures, answering to no particular option. The images already
              on such a product stay in `form.images` and are still submitted:
              this hides the editor, it does not clear the field. */}
          {!hasOptions && (
          <Card
            icon="image"
            title="3 · Photos"
            hint="Shown on the product page and in listings."
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
          )}
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
              {/* Three states, not a switch: "not finished yet" and "finished
                  but withdrawn" need different answers, and a draft created
                  from a purchase order may already have stock against it. */}
              <div>
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
                  {(
                    [
                      ["DRAFT", "Draft"],
                      ["ACTIVE", "Active"],
                      ["INACTIVE", "Hidden"],
                    ] as const
                  ).map(([value, text]) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => set("status", value)}
                      className={[
                        "rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition",
                        form.status === value
                          ? "bg-white text-stone-900 shadow-sm"
                          : "text-stone-500 hover:text-stone-700",
                      ].join(" ")}
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-[12px] text-stone-500">
                  {form.status === "ACTIVE"
                    ? "Visible on the storefront."
                    : form.status === "DRAFT"
                      ? "Not finished — needs a photo and a price before it can go live."
                      : "Finished, but hidden from the catalog."}
                </p>
                <ErrorText>{errors.status}</ErrorText>
              </div>
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
        {/* ── Options & pricing (step 4, or 3 selling by colour) ── */}
        {/* Spans both grid columns: the size×colour matrix is a wide
            table, and boxing it into the left column forced a horizontal
            scroll on the one step where every row has to be compared.
            Still gated on `ready` like the steps it used to sit among —
            pricing options before a category is chosen prices nothing. */}
        {ready && (
        <div className="lg:col-span-2 min-w-0">
          {/* ── Options & pricing ───────────────────────────── */}
          <Card
            icon="grid"
            title={`${stepNo(4)} · Options & pricing`}
            hint={
              form.sellingType === "single"
                ? "One price and one stock for the whole product."
                : form.sellingType === "colors"
                  ? "One option per colour, each with its own photo, price and stock."
                  : "Sizes crossed with colours. Price them off what they cost, then override the odd one."
            }
          >
            {form.sellingType !== "single" ? (
              <OptionsBuilder
                sellingType={form.sellingType}
                colors={form.colors}
                rows={form.variants}
                baseSku={form.baseSku}
                lockedStockKeys={lockedStockKeys}
                landedCosts={landedCostKeys}
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
              <>
              {/* ── price from landed cost ── */}
              {/* First in the card because it is the first move: you read what the
                  goods cost, pick a margin, and the price below is filled in.
                  The option matrix has the same bar (see OptionsBuilder), but the
                  sum here is the OTHER one: a margin is a share of the selling
                  price, so the cost is divided rather than multiplied. Both are
                  spelled out beneath the field so neither can be read as the
                  other. Only shown once a cost exists — without one there is
                  nothing to price against. */}
              {costPaisa > 0 && (
                <div className="mb-4 rounded-xl border border-stone-200 bg-stone-50/60 p-3">
                  <div className="flex flex-wrap items-end gap-2.5">
                    <label className="min-w-0">
                      <span className="mb-1 block text-[11.5px] font-semibold uppercase tracking-wide text-stone-400">
                        Profit margin
                      </span>
                      <span className="flex items-center overflow-hidden rounded-lg border border-stone-200 bg-white">
                        <input
                          type="number"
                          min="0"
                          max="99"
                          step="0.5"
                          value={marginTarget}
                          onChange={(e) => setMarginTarget(e.target.value)}
                          placeholder="25"
                          aria-label="Target profit margin percent"
                          className="w-20 bg-transparent px-2 py-1.5 text-[13px] text-stone-800 outline-none"
                        />
                        <span className="border-l border-stone-200 bg-stone-50 px-2 py-1.5 text-[12.5px] font-semibold text-stone-500">
                          %
                        </span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => marginPrice != null && set("price", marginPrice)}
                      disabled={marginPrice == null}
                      title="Selling price = landed cost ÷ (1 − margin)"
                      className="rounded-lg bg-brand-600 px-3 py-1.5 text-[12.5px] font-semibold text-white transition hover:bg-brand-700 disabled:opacity-40"
                    >
                      Set selling price
                    </button>
                  </div>

                  {/* The three figures, stated plainly: what it cost, what is
                      being taken, what that prices it at. The sum is spelled out
                      underneath because the same 25% means something different
                      on the option matrix, which marks up the cost instead. */}
                  <dl className="mt-3 max-w-sm space-y-1.5 border-t border-stone-200 pt-2.5 text-[12.5px]">
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-stone-500">{isEdit ? "Landed cost" : "Cost"}</dt>
                      <dd className="font-semibold tabular-nums text-stone-800">{formatTaka(costPaisa)}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-stone-500">Profit margin</dt>
                      <dd className="font-semibold tabular-nums text-stone-800">
                        {marginPrice != null ? `${marginTarget}%` : "—"}
                      </dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3 border-t border-stone-200 pt-1.5">
                      <dt className="font-semibold text-stone-700">Selling price</dt>
                      <dd className="text-[14.5px] font-bold tabular-nums text-brand-700">
                        {marginPrice != null ? formatTaka(marginPrice) : "—"}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-2 text-[11.5px] text-stone-400">
                    {marginPrice != null ? (
                      <>
                        <span className="font-semibold text-stone-500">
                          {formatTaka(costPaisa)} ÷ (1 − {marginTarget}%) = {formatTaka(marginPrice)}
                        </span>{" "}
                        — {formatTaka(marginPrice - costPaisa)} of every sale is profit, which is {marginTarget}% of
                        the price rather than of the cost.
                      </>
                    ) : (
                      <>
                        Selling price = cost ÷ (1 − margin). The profit is that share of the SELLING price, so 25%
                        on {formatTaka(costPaisa)} prices it at{" "}
                        {formatTaka(priceFromMargin(costPaisa, 25) ?? 0)}. Margins of 100% or more have no answer.
                      </>
                    )}
                    {marginPct != null && (
                      <>
                        {" "}
                        Priced at{" "}
                        <span className={marginPct > 0 ? "font-semibold text-emerald-600" : "font-semibold text-red-600"}>
                          {marginPct}% margin
                        </span>{" "}
                        today.
                      </>
                    )}
                  </p>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <Label required>Price</Label>
                  <FieldShell prefix="৳" error={errors.price}>
                    <input
                      type="number"
                      min="0"
                      /* A margin-derived price lands on paisa (৳346 ÷ 0.75 =
                         ৳461.33); a whole-taka step would fail the browser's
                         validation and block the save. */
                      step="0.01"
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
                  {/* Stock is typed ONCE, as an opening balance. After that the
                      ledger owns it: a purchase-order receipt or an audited
                      adjustment moves it, and this becomes a reading. */}
                  <Label required={!isEdit}>{isEdit ? "Stock on hand" : "Opening stock"}</Label>
                  {isEdit ? (
                    <>
                      <div className="flex items-baseline gap-2 rounded-lg border border-dashed border-stone-200 bg-stone-50 px-3 py-2.5">
                        <span className="text-[15px] font-semibold tabular-nums text-stone-800">
                          {product?.stock ?? 0}
                        </span>
                        <span className="text-[12.5px] text-stone-500">on hand</span>
                        {(product?.reserved ?? 0) > 0 && (
                          <span className="text-[12.5px] text-stone-400">· {product?.reserved} reserved</span>
                        )}
                      </div>
                      <p className="mt-1.5 text-[12px] text-stone-400">
                        Changed by receiving a purchase order, or from the Stock panel below.
                      </p>
                    </>
                  ) : (
                    <>
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
                          Starts out of stock — it won&apos;t be purchasable until stock arrives.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              </>
            )}

            {/* Product-level settings — these apply however it's sold. */}
            <div className="mt-5 border-t border-stone-100 pt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Sourcing cost is a CREATE-only field now.
                    A hand-made product has no purchase order to price against,
                    and a zero cost makes the profit reports read the whole sale
                    as profit — so it still has to be typed once here. On edit it
                    is hidden: receipts own the figure (the hidden input below
                    still resubmits it untouched), and each option's real cost is
                    on its own row as the landed cost, which is the number you
                    actually price against. */}
                {!isEdit && (
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

                    {/* Simple product: one cost, one price, one margin. */}
                    {marginPct != null && !hasOptions && !errors.purchaseCost && (
                      <p
                        className={`mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold ${
                          marginPct > 0 ? "text-emerald-600" : "text-red-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            marginPct > 0 ? "bg-emerald-500" : "bg-red-500"
                          }`}
                        />
                        {marginPct > 0 ? `${marginPct}% margin per unit` : `Selling at or below cost (${marginPct}%)`}
                      </p>
                    )}

                    {/* Option product: each row is priced on its own, so margin is
                        a range across them. */}
                    {hasOptions && optionMarginLo != null && optionMarginHi != null && (
                      <p
                        className={`mt-1.5 flex items-center gap-1.5 text-[12.5px] font-semibold ${
                          optionsBelowCost > 0 ? "text-red-600" : "text-emerald-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-1.5 w-1.5 rounded-full ${
                            optionsBelowCost > 0 ? "bg-red-500" : "bg-emerald-500"
                          }`}
                        />
                        {optionMarginLo === optionMarginHi
                          ? `${optionMarginLo}% margin per unit`
                          : `${optionMarginLo}–${optionMarginHi}% margin across options`}
                      </p>
                    )}
                    {hasOptions && optionsBelowCost > 0 && (
                      <p className="mt-1 text-[12px] text-red-600">
                        {optionsBelowCost} option{optionsBelowCost === 1 ? " sells" : "s sell"} at or below the{" "}
                        {fmtTaka(costPaisa)} it cost to buy.
                      </p>
                    )}
                  </div>
                )}
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

              {/* Offer strip shown under the price on the product page. Tied to
                  the discount on purpose: it only renders while something IS
                  discounted, so an offer left here after a sale ends stops
                  showing instead of promising a price the shopper won't get. */}
              <div className="mt-4 border-t border-stone-100 pt-4">
                <Label hint="optional · max 120 chars">Offer banner</Label>
                <FieldShell>
                  <input
                    type="text"
                    value={form.offerText}
                    onChange={(e) => set("offerText", e.target.value)}
                    maxLength={120}
                    placeholder='e.g. "Buy 1 Get 1 Free" or "Eid Special — extra ৳100 off"'
                    className="w-full bg-transparent px-3 py-2.5 text-[14px] text-stone-800 outline-none placeholder:text-stone-400"
                  />
                </FieldShell>

                {form.offerText.trim() ? (
                  <>
                    <p className="mt-2 text-[12px] font-medium text-stone-500">
                      {hasAnyDiscount ? "Shows on the product page as:" : "Preview:"}
                    </p>
                    {/* Same gradient the storefront renders, so what the admin
                        approves here is what a shopper sees. */}
                    <div className="mt-1.5 flex max-w-sm items-center gap-2 rounded-lg bg-gradient-to-r from-fuchsia-600 to-pink-500 px-3.5 py-2.5 text-[13.5px] font-bold leading-snug text-white shadow-sm">
                      <Icon name="tag" size={15} />
                      <span className="min-w-0 break-words">{form.offerText.trim()}</span>
                    </div>
                    {!hasAnyDiscount && (
                      <p className="mt-1.5 flex items-start gap-1.5 text-[12px] text-amber-600">
                        <Icon name="warn" size={13} className="mt-0.5 shrink-0" />
                        {hasOptions
                          ? "Hidden until at least one option has a discount price."
                          : "Hidden until you set a discount price above."}
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-1.5 text-[12px] text-stone-400">
                    Adds a coloured banner under the price. Only shown while the
                    product is discounted.
                  </p>
                )}
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
        </div>
        )}
        {/* ── Content — full width, under options & pricing ── */}
        {/* Also spans both columns so it sits directly beneath options &
            pricing; left in the column it would jump back up beside the
            right rail and break the 1→6 reading order. */}
        {ready && (
        <div className="lg:col-span-2 min-w-0">
          {/* ── Content ─────────────────────────────────────── */}
          <Card
            icon="file"
            title={`${stepNo(5)} · Content`}
            hint="The collapsible panels under “Features & Specs” on the product page."
          >
            <AccordionBuilder
              value={form.accordionSections}
              onChange={(rows) => set("accordionSections", rows)}
            />
          </Card>
        </div>
        )}
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
