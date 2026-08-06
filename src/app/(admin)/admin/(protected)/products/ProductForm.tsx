"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import ImageCustomizer from "@/components/admin/ImageCustomizer";
import DescriptionEditor from "./DescriptionEditor";
import AccordionBuilder, { type AccordionSectionRow } from "./AccordionBuilder";
import { saveProduct } from "./actions";
import type { listAllCategories } from "@/server/categories/admin";
import type { getProductById } from "@/server/products/admin";
import { buildTree, ancestorsOf, type TreeNode } from "@/server/categories/tree";
import { resolvePrimaryImage } from "@/lib/product-images";

/* Product photos are square 1000×1000 thumbnails, kept light so the catalog
   and product pages stay fast. Up to 10 per product; the first is the cover. */
const PRODUCT_IMG = { width: 1000, height: 1000, maxBytes: 200 * 1024 };
const MAX_IMAGES = 10;
/* The description is now the whole product story (specs, features, shipping,
   warranty) written in Markdown, so it needs far more room than a blurb.
   Well under the TEXT column limit. */
const DESCRIPTION_MAX = 8000;

type Category = Awaited<ReturnType<typeof listAllCategories>>[number];
type Product = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

interface ImageRow {
  url: string;
}

/** A colour swatch, derived from variant rows in variant mode. Simple
 *  (single-price) products no longer carry colours. */
interface ColorRow {
  name: string;
  hexCode: string;
  /** Uploaded photo for this colour ("" = none) — swatch shows the hex instead. */
  imageUrl: string;
}

/** Where an uploaded photo should land. */
type UploadTarget =
  | { kind: "product" }
  | { kind: "variant"; idx: number };

/** Same target twice? Used to drive per-tile spinners. */
const sameTarget = (a: UploadTarget | null, b: UploadTarget) =>
  a !== null && a.kind === b.kind && (a.kind === "product" || a.idx === (b as { idx: number }).idx);

interface VariantRow {
  /** Colour name for this option, or "" for none. */
  color: string;
  /** Swatch hex for the colour (used when there's no swap image). */
  colorHex: string;
  /** Optional swap image URL shown when this colour is picked. */
  /** Uploaded photo for this row ("" = none). Saved to ProductVariant.imageUrl. */
  imageUrl: string;
  /** Size/option label, e.g. "M" or "1 Litre", or "" for none. */
  size: string;
  /** Regular price in Taka, as a string for the input. */
  price: string;
  /** Optional sale price in Taka; "" = no discount. */
  discountPrice: string;
  stock: string;
  /** Show the stock count on the storefront for this variant. */
  showStock: boolean;
  /** Storefront price colour (#rrggbb); "" = inherit the product's colour. */
  priceColor: string;
}

/**
 * A product is priced one of two ways, never both:
 *  - "simple": a single top-level price & stock (Pricing & stock card).
 *  - "variant": per-option rows (Sizes / Variants card); the base price/stock
 *    are derived from the variants (lowest price = "from", summed stock).
 */
type PricingMode = "simple" | "variant";

interface FormState {
  pricingMode: PricingMode;
  name: string;
  categoryId: string; // string for select value — any node in the category tree
  description: string;
  price: number | ""; // paisa
  discountPrice: number | ""; // paisa
  purchaseCost: number | ""; // paisa — sourcing cost (COGS basis)
  stock: number | "";
  lowStockThreshold: number | ""; // 0/"" = disabled
  showStock: boolean; // show the "In stock (N available)" count on the storefront
  /** Storefront price colour (#rrggbb); "" = theme default (near-black). */
  priceColor: string;
  status: "ACTIVE" | "INACTIVE";
  promoBadge: string;
  metaTitle: string;
  metaDescription: string;
  isFeatured: boolean;
  images: ImageRow[]; // photo URLs + optional variant link; first is the cover
  colors: ColorRow[]; // read-only: existing ProductColor rows, kept only to seed variant swatches
  variants: VariantRow[];
  /** Collapsible "Features & Specs" panels; empty = show the description instead. */
  accordionSections: AccordionSectionRow[];
}

interface Props {
  categories: Category[];
  product?: Product;
}

/* ─────────── helpers ─────────── */
const fmtTaka = (paisa: number) => "৳" + (paisa / 100).toLocaleString("en-US", { maximumFractionDigits: 0 });
const fmtTakaInput = (paisa: number | "") => (paisa === "" || paisa == null ? "" : (Number(paisa) / 100).toString());
const parseTaka = (s: string): number | "" => {
  const n = Number(s.replace(/[^\d.]/g, ""));
  return isNaN(n) ? "" : Math.round(n * 100);
};
/** Hidden inputs feed the real saveProduct action, which expects taka (it calls takaToPaisa itself). */
const paisaToTakaStr = (paisa: number | "") => (paisa === "" ? "" : String(Number(paisa) / 100));

/** Variant display label ("Navy / M"), the shape legacy tags were written in. */
const variantLabelOf = (colorName?: string | null, size?: string | null) =>
  [colorName?.trim(), size?.trim()].filter(Boolean).join(" / ");

/** Loose compare for legacy labels — casing/spacing drifted across saves. */
const sameLabel = (a: string, b: string) =>
  a.replace(/\s+/g, " ").trim().toLowerCase() === b.replace(/\s+/g, " ").trim().toLowerCase();

function initialFromProduct(p?: Product): FormState {
  if (!p) {
    return {
      pricingMode: "simple",
      name: "",
      categoryId: "",
      description: "",
      price: "",
      discountPrice: "",
      purchaseCost: "",
      stock: "",
      lowStockThreshold: "",
      showStock: true,
      priceColor: "",
      status: "ACTIVE",
      promoBadge: "",
      metaTitle: "",
      metaDescription: "",
      isFeatured: false,
      images: [],
      colors: [],
      variants: [],
      accordionSections: [],
    };
  }
  const imageRows: ImageRow[] = p.images
    .slice()
    .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    .map((i) => ({ url: i.url }));
  return {
    pricingMode: (p.variants?.length ?? 0) > 0 ? "variant" : "simple",
    name: p.name,
    categoryId: String(p.categoryId),
    description: p.description ?? "",
    price: p.price,
    discountPrice: p.discountPrice ?? "",
    purchaseCost: p.purchaseCost ?? "",
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold || "",
    showStock: p.showStock ?? true,
    priceColor: p.priceColor ?? "",
    status: p.status,
    promoBadge: p.promoBadge ?? "",
    metaTitle: p.metaTitle ?? "",
    metaDescription: p.metaDescription ?? "",
    isFeatured: p.isFeatured,
    images: imageRows,
    colors: p.colors?.map((c) => ({ name: c.name, hexCode: c.hexCode, imageUrl: c.imageUrl ?? "" })) ?? [],
    accordionSections:
      p.accordionSections?.map((s) => ({
        title: s.title,
        icon: s.icon ?? "",
        content: s.content,
        isOpen: s.isOpen,
      })) ?? [],
    // A variant's colour swatch/image used to live in the shared ProductColor
    // list, matched by name. Colours are now entered per row, so backfill hex &
    // image from that list for existing products — the row's own imageUrl wins
    // once it has been set.
    variants:
      p.variants?.map((v) => {
        const swatch = v.colorName ? p.colors?.find((c) => c.name === v.colorName) : undefined;
        // Products saved before ProductVariant.imageUrl existed kept the row's
        // photo in the gallery, tagged with the variant's display label. Nothing
        // reads that tag any more, so pull it onto the row here: the photo shows
        // up in Sizes/Variants, and saving persists it to the new column.
        const label = variantLabelOf(v.colorName, v.size);
        const legacyTagged = label
          ? p.images?.find((i) => i.variantLabel && sameLabel(i.variantLabel, label))?.url
          : undefined;
        return {
          color: v.colorName ?? "",
          colorHex: swatch?.hexCode ?? "#000000",
          imageUrl: v.imageUrl ?? legacyTagged ?? swatch?.imageUrl ?? "",
          size: v.size ?? "",
          price: String(v.price / 100),
          discountPrice: v.discountPrice != null ? String(v.discountPrice / 100) : "",
          stock: String(v.stock),
          showStock: v.showStock ?? true,
          priceColor: v.priceColor ?? "",
        };
      }) ?? [],
  };
}

/* ─────────── small UI primitives ─────────── */
function Card({
  icon,
  title,
  hint,
  children,
  className = "",
}: {
  icon?: IconName;
  title: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={"overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft " + className}>
      <header className="flex items-center gap-2.5 border-b border-stone-100 px-5 py-3.5">
        {icon && (
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-stone-100 text-stone-500">
            <Icon name={icon} size={15} />
          </span>
        )}
        <div className="min-w-0">
          <h2 className="text-[14.5px] font-bold tracking-tight text-stone-800">{title}</h2>
          {hint && <p className="text-[12.5px] text-stone-400">{hint}</p>}
        </div>
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Label({ children, required, hint }: { children: ReactNode; required?: boolean; hint?: string }) {
  return (
    <label className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-stone-700">
      <span>{children}</span>
      {required && <span className="text-red-500">*</span>}
      {hint && <span className="ml-auto text-[12px] font-normal text-stone-400">{hint}</span>}
    </label>
  );
}

function FieldShell({ error, prefix, children }: { error?: string; prefix?: ReactNode; children: ReactNode }) {
  return (
    <div
      className={[
        "flex items-center overflow-hidden rounded-lg border bg-white transition focus-within:ring-4",
        error
          ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-50"
          : "border-stone-200 focus-within:border-brand-500 focus-within:ring-brand-50",
      ].join(" ")}
    >
      {prefix && (
        <span className="border-r border-stone-200 bg-stone-50 px-3 py-2.5 text-[14px] font-semibold text-stone-500">
          {prefix}
        </span>
      )}
      {children}
    </div>
  );
}

function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return (
    <p className="mt-1.5 flex items-start gap-1.5 text-[12.5px] text-red-600">
      <Icon name="warn" size={13} className="mt-0.5 shrink-0" />
      {children}
    </p>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  sublabel,
  icon,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  sublabel?: string;
  icon?: IconName;
}) {
  return (
    <div className="flex items-center gap-3">
      {icon && (
        <span
          className={[
            "flex h-9 w-9 items-center justify-center rounded-lg",
            checked ? "bg-brand-50 text-brand-600" : "bg-stone-100 text-stone-400",
          ].join(" ")}
        >
          <Icon name={icon} size={16} />
        </span>
      )}
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
          className={["absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-[22px]" : "left-0.5"].join(
            " ",
          )}
        />
      </button>
    </div>
  );
}

/* ─────────── category tree select ───────────
   Products can live on ANY node — a root, a mid-level, or a leaf — so the
   picker lists every category indented by depth and shows the chosen node's
   full breadcrumb underneath for confirmation. */
function CategorySelect({
  value,
  onChange,
  error,
  categories,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  categories: Category[];
}) {
  const options = useMemo(() => {
    const out: { id: number; label: string }[] = [];
    const walk = (nodes: TreeNode<Category>[], depth: number) => {
      for (const n of nodes) {
        out.push({ id: n.id, label: `${"  ".repeat(depth)}${depth ? "└ " : ""}${n.name}` });
        walk(n.children, depth + 1);
      }
    };
    walk(buildTree(categories), 0);
    return out;
  }, [categories]);

  const breadcrumb = useMemo(() => {
    const id = Number(value);
    if (!value || Number.isNaN(id)) return "";
    const self = categories.find((c) => c.id === id);
    if (!self) return "";
    return [...ancestorsOf(id, categories).map((c) => c.name), self.name].join(" › ");
  }, [value, categories]);

  return (
    <div>
      <div
        className={[
          "relative flex items-center overflow-hidden rounded-lg border bg-white transition focus-within:ring-4",
          error
            ? "border-red-300 focus-within:border-red-500 focus-within:ring-red-50"
            : "border-stone-200 focus-within:border-brand-500 focus-within:ring-brand-50",
        ].join(" ")}
      >
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required
          className="w-full appearance-none bg-transparent px-3 py-2.5 pr-9 text-[14px] text-stone-800 outline-none"
        >
          <option value="">Select category…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 text-stone-400">
          <Icon name="chevronDown" size={16} />
        </span>
      </div>
      {breadcrumb && <p className="mt-1.5 text-[12.5px] text-stone-500">In: {breadcrumb}</p>}
    </div>
  );
}

/* ─────────── live preview ─────────── */
function LivePreview({ form, basePricePaisa, fromPrice }: { form: FormState; basePricePaisa: number | ""; fromPrice: boolean }) {
  // Same fallback the storefront uses: a variant product is often saved with an
  // empty gallery because every photo lives on a variant row, and the preview
  // showed the placeholder for it. resolvePrimaryImage prefers the curated
  // gallery and drops to the option photos only when there is none.
  const firstImg =
    resolvePrimaryImage({
      images: form.images.filter((i) => i.url.trim()),
      variants: form.variants,
      colors: form.colors,
    }) ?? undefined;
  // In variant mode there's no product-level discount; price is the "from" price.
  const hasDiscount = !fromPrice && form.discountPrice !== "" && basePricePaisa !== "" && Number(form.discountPrice) < Number(basePricePaisa);

  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
      <div className="relative aspect-[4/3] bg-stone-100">
        {firstImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={firstImg} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <Icon name="image" size={36} strokeWidth={1.4} />
          </div>
        )}
        {form.promoBadge && (
          <span className="absolute left-2 top-2 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 shadow-sm">
            {form.promoBadge}
          </span>
        )}
        {form.isFeatured && (
          <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-amber-500 shadow-sm">
            <Icon name="star" size={14} strokeWidth={1.5} fill="currentColor" />
          </span>
        )}
        {form.status === "INACTIVE" && (
          <span className="absolute bottom-2 left-2 rounded-md bg-stone-900/80 px-2 py-0.5 text-[11px] font-bold text-white">
            Inactive
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="line-clamp-2 min-h-[2.5em] text-[13.5px] font-semibold leading-snug text-stone-800">
          {form.name || <span className="italic text-stone-400">Product name…</span>}
        </p>
        <div className="mt-2 flex items-baseline gap-1.5">
          {hasDiscount ? (
            <>
              <span className="text-[15px] font-bold text-stone-900">{fmtTaka(Number(form.discountPrice))}</span>
              <span className="text-[12px] text-stone-400 line-through">{fmtTaka(Number(basePricePaisa))}</span>
            </>
          ) : basePricePaisa !== "" ? (
            <span className="text-[15px] font-bold text-stone-900">
              {fromPrice && <span className="text-[12px] font-semibold text-stone-400">from </span>}
              {fmtTaka(Number(basePricePaisa))}
            </span>
          ) : (
            <span className="text-[13px] italic text-stone-400">No price set</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────── main form ─────────── */
export default function ProductForm({ categories, product }: Props) {
  const isEdit = !!product;
  const [form, setForm] = useState<FormState>(() => initialFromProduct(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startSave] = useTransition();
  // What the image customizer is uploading for: the product gallery or one
  // variant row. Null = closed.
  const [customizing, setCustomizing] = useState<UploadTarget | null>(null);
  // Which target is mid-upload, so only that tile shows a spinner.
  const [uploading, setUploading] = useState<UploadTarget | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);

  const set = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((f) => ({ ...f, [key]: val }));

  const isVariantMode = form.pricingMode === "variant";

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

  const removeImage = (idx: number) =>
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  // Promote a photo to the front of the list — the first image is the cover/thumbnail.
  const makePrimary = (idx: number) =>
    setForm((f) => {
      if (idx === 0) return f;
      const next = [...f.images];
      const [img] = next.splice(idx, 1);
      next.unshift(img);
      return { ...f, images: next };
    });
  // The customizer hands back a JPEG already cropped to 1000×1000 and compressed
  // under 200 KB, so it just needs uploading and storing against its target.
  // The gallery appends (capped at MAX_IMAGES); a colour or variant row replaces,
  // since each holds exactly one photo.
  async function handleCustomized(file: File) {
    const target = customizing;
    if (target === null) return;
    setCustomizing(null);
    setImageError(null);
    setUploading(target);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "products");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setForm((f) => {
        if (target.kind === "product") {
          return { ...f, images: [...f.images, { url: data.url }].slice(0, MAX_IMAGES) };
        }
        return {
          ...f,
          variants: f.variants.map((v, i) => (i === target.idx ? { ...v, imageUrl: data.url } : v)),
        };
      });
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  }


  const setVariant = (idx: number, val: Partial<VariantRow>) =>
    set("variants", form.variants.map((v, i) => (i === idx ? { ...v, ...val } : v)));
  const addVariant = () =>
    set("variants", [
      ...form.variants,
      { color: "", colorHex: "#000000", imageUrl: "", size: "", price: "", discountPrice: "", stock: "0", showStock: true, priceColor: "" },
    ]);
  const removeVariant = (idx: number) => set("variants", form.variants.filter((_, i) => i !== idx));

  // Serialize variants for the hidden input / submit: a row needs a colour or a
  // size plus a price. Price stays in Taka (the server action converts to paisa).
  // In simple mode we submit no variants at all.
  const cleanVariants = () =>
    isVariantMode
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
            };
          })
      : [];

  // Display label for a variant row — mirrors how the server derives it from
  // colorName/size ("Navy / M").
  const variantRowLabel = (v: VariantRow) => variantLabelOf(v.color, v.size);

  // The product gallery, serialized for submit. These are whole-product photos,
  // uploaded in the single-price card; a variant's own photo travels on its
  // variant row instead, so nothing here carries a variant link. Still submitted
  // in variant mode (where the uploader is hidden) so switching pricing mode
  // never silently deletes a product's photos.
  const cleanImages = () =>
    form.images
      .filter((img) => img.url.trim())
      .map((img) => ({ url: img.url.trim(), variantLabel: null }));

  // The product row always needs a base price & stock. In variant mode they're
  // derived from the variants — lowest price becomes the storefront "from" price,
  // stock is the sum across variants — so the disabled Pricing card stays in sync.
  const derivedBase = () => {
    const rows = cleanVariants();
    if (rows.length === 0) return { priceTaka: "" as number | "", stock: 0 };
    // "From" price reflects the lowest amount a shopper actually pays, so use the
    // discounted price where one is set.
    const priceTaka = Math.min(...rows.map((r) => r.discountPrice ?? r.price));
    const stock = rows.reduce((sum, r) => sum + r.stock, 0);
    return { priceTaka, stock };
  };

  // Base price (taka) and stock actually submitted, per mode.
  const submitPriceTaka = (): number | "" => (isVariantMode ? derivedBase().priceTaka : paisaToTakaStr(form.price) === "" ? "" : Number(form.price) / 100);
  const submitStock = (): number | "" => (isVariantMode ? derivedBase().stock : form.stock);

  // The ProductColor swatch list (name → hex/photo) — the source of the
  // storefront swatches. Simple (single-price) products no longer carry
  // colours at all. In variant mode it's derived by deduping the colours on
  // the variant rows (first occurrence wins); the row's uploaded photo is NOT
  // copied here, since it belongs to the variant so rows sharing a colour keep
  // their own images.
  const cleanColors = () => {
    if (!isVariantMode) return [];
    const seen = new Map<string, { name: string; hexCode: string; imageUrl: string }>();
    for (const v of form.variants) {
      const name = v.color.trim();
      // Only colours on rows that will actually be saved (named + priced).
      if (!name || Number(v.price) <= 0) continue;
      if (!seen.has(name)) {
        seen.set(name, { name, hexCode: (v.colorHex || "#000000").trim(), imageUrl: "" });
      }
    }
    return [...seen.values()];
  };

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
    if (isVariantMode) {
      // Variants carry the price/stock; require at least one valid row.
      if (cleanVariants().length === 0) {
        clientErrors.variants = "Add at least one variant with a colour or size and a price.";
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
      <input type="hidden" name="description" value={form.description} />
      <input type="hidden" name="price" value={(() => { const p = submitPriceTaka(); return p === "" ? "" : String(p); })()} />
      <input type="hidden" name="discountPrice" value={isVariantMode ? "" : paisaToTakaStr(form.discountPrice)} />
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
          <Card icon="info" title="Basic info" hint="The essentials your customers will see.">
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
              <div>
                <Label
                  hint={
                    form.accordionSections.length > 0
                      ? "still used for SEO & search — the accordion below replaces it on the product page"
                      : "specs, features, shipping & warranty — all in one"
                  }
                >
                  Description
                </Label>
                <DescriptionEditor
                  value={form.description}
                  onChange={(md) => set("description", md)}
                  maxLength={DESCRIPTION_MAX}
                />
              </div>
            </div>
          </Card>

          {/* Collapsible panels for the storefront's "Features & Specs" tab.
              Optional: with no sections the tab keeps rendering the flat
              description above, so existing products are unaffected. */}
          <Card
            icon="grid"
            title="Features & Specs accordion"
            hint={
              form.accordionSections.length > 0
                ? "These panels replace the description under “Features & Specs” on the product page."
                : "Optional — break the details into collapsible panels instead of one long description."
            }
          >
            <AccordionBuilder
              value={form.accordionSections}
              onChange={(rows) => set("accordionSections", rows)}
            />
          </Card>

          {/* Pricing mode selector — a product is priced by a single price/stock
              OR by per-option variants, never both. Switching greys out the
              other card and skips its validation. */}
          <div className="flex flex-col gap-2 rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[13.5px] font-bold text-stone-800">How is this product priced?</p>
              <p className="text-[12.5px] text-stone-400">
                {isVariantMode
                  ? "Per-option variants — price & stock come from the variant rows below."
                  : "A single price and stock for the whole product."}
              </p>
            </div>
            <div className="inline-flex shrink-0 rounded-lg border border-stone-200 bg-stone-50 p-0.5" role="tablist" aria-label="Pricing mode">
              {([
                { key: "simple" as const, label: "Single price" },
                { key: "variant" as const, label: "Variants" },
              ]).map((opt) => {
                const active = form.pricingMode === opt.key;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => set("pricingMode", opt.key)}
                    className={[
                      "rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition",
                      active ? "bg-white text-brand-700 shadow-sm" : "text-stone-500 hover:text-stone-700",
                    ].join(" ")}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* In variant mode the price, discount, stock and colour swatches all
              come from the variant rows below. Showing them here — filled with
              values derived from those rows — read as a second, conflicting copy
              of the variant data, so they're hidden rather than disabled. What
              stays is product-level only (cost, low-stock alert, stock
              visibility, price colour) and remains editable in both modes. */}
          <Card
            icon="tag"
            title="Pricing & stock"
            hint={
              isVariantMode
                ? "Price, stock & colours come from the variant rows below — only these product-level settings apply here."
                : "One price for the whole product, with its photos and colours."
            }
          >
            <fieldset className="contents">
            {!isVariantMode && (
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
              </div>
            )}
            <div className={isVariantMode ? "" : "mt-5 border-t border-stone-100 pt-5"}>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {!isVariantMode && (
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
                )}
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
                  {/* Margin is against the single price, which variant mode
                      doesn't have — each row is priced on its own. */}
                  {marginPct != null && !isVariantMode && !errors.purchaseCost && (
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
                    {/* Variant mode has no single price to preview — each row
                        carries its own — so show a neutral sample instead of a
                        number derived from the variants. */}
                    {isVariantMode ? "৳ Price" : fmtTaka(form.price === "" ? 0 : Number(form.price))}
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
                    ? isVariantMode
                      ? "Used for prices on the storefront, unless a variant row sets its own."
                      : "Used for this product’s price on the storefront."
                    : "Not set — the price shows in the default colour (black)."}
                </p>
              </div>
            </div>

            {/* Product photos — the storefront gallery, and part of single-price
                pricing only. In variant mode every row carries its own photo, so
                a second uploader here would be redundant: the section is hidden
                rather than disabled. Existing photos are NOT discarded when a
                product is switched to variants — they stay in form.images and are
                still submitted, so switching back shows them again. A variant
                product with no gallery is fine on the storefront: the product page
                falls back to the row photos (see lib/product-images.ts). */}
            {!isVariantMode && (
              <div className="mt-5 border-t border-stone-100 pt-5">
                <Label hint={`up to ${MAX_IMAGES}`}>Product photos</Label>
                <p className="-mt-1 mb-2.5 text-[12px] text-stone-400">
                  Shown on the product page and in listings. Square 1000×1000px · ≤200 KB each. The
                  first photo is the cover.
                </p>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 2xl:grid-cols-6">
                  {form.images.map((img, idx) => (
                    <div
                      key={img.url + idx}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      {idx === 0 && (
                        <span className="absolute left-1 top-1 rounded bg-brand-600 px-1.5 py-0.5 text-[9.5px] font-bold text-white shadow">
                          Cover
                        </span>
                      )}
                      {/* Always-visible controls: hover reveals nothing on touch,
                          so these stay on-screen at all sizes. */}
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/60 to-transparent p-1">
                        {idx !== 0 ? (
                          <button
                            type="button"
                            onClick={() => makePrimary(idx)}
                            title="Make cover"
                            className="rounded bg-white/90 px-1.5 py-1 text-[10px] font-semibold leading-none text-stone-700 active:bg-white"
                          >
                            Cover
                          </button>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          title="Remove photo"
                          aria-label="Remove photo"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-white/90 text-stone-500 active:bg-white active:text-red-500"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {form.images.length < MAX_IMAGES && (
                    <button
                      type="button"
                      onClick={() => setCustomizing({ kind: "product" })}
                      disabled={sameTarget(uploading, { kind: "product" })}
                      className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600 disabled:opacity-50"
                    >
                      {sameTarget(uploading, { kind: "product" }) ? (
                        <span className="text-[11px] font-semibold">Uploading…</span>
                      ) : (
                        <>
                          <Icon name="plus" size={18} />
                          <span className="text-[11px] font-semibold">Add photo</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <p className="mt-2 text-[12px] text-stone-400">
                  {form.images.length}/{MAX_IMAGES} photos · upload any picture, then crop it square.
                </p>
                <ErrorText>{imageError ?? undefined}</ErrorText>
              </div>
            )}

            </fieldset>
          </Card>

          <Card
            icon="box"
            title="Sizes / Variants"
            hint={
              isVariantMode
                ? "One row per option or per colour+size combo (e.g. Navy/M). Each has its own price & stock; customers must pick one."
                : "Disabled — switch to “Variants” above to price by option."
            }
            className={isVariantMode ? "" : "opacity-60"}
          >
            <fieldset disabled={!isVariantMode} className="contents">
            {/* Upload failures for the per-row photos surface here: the gallery
                block that used to show them is hidden in variant mode, and a
                silently-failed upload would otherwise look like a no-op. */}
            {isVariantMode && imageError && (
              <div className="mb-3">
                <ErrorText>{imageError}</ErrorText>
              </div>
            )}
            {errors.variants && isVariantMode && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
                {errors.variants}
              </p>
            )}
            {/* Six columns don't fit the admin's left column at mid viewports, and
                the fixed ones win: the flexible Size column used to be squeezed to
                a sliver, hiding a saved size like "2 YRS". Header and rows share
                ONE scroll container so they stay aligned while scrolling, and
                sm:min-w keeps every column at a usable width instead of clipping
                Stock off the edge. */}
            <div className="overflow-x-auto">
            <div className="sm:min-w-[600px]">
            {form.variants.length > 0 && (
              <div className="mb-2 hidden grid-cols-[140px_1fr_110px_110px_90px_36px] gap-2 px-1 text-[11.5px] font-semibold uppercase tracking-wide text-stone-400 sm:grid">
                <span>Colour</span>
                <span>Size / option</span>
                <span>Price</span>
                <span>Discount</span>
                <span>Stock</span>
                <span />
              </div>
            )}
            <div className="space-y-2">
              {form.variants.map((v, idx) => {
                const priceNum = Number(v.price);
                const discNum = Number(v.discountPrice);
                const discValid = v.discountPrice.trim() !== "" && discNum > 0 && discNum < priceNum;
                const discInvalid = v.discountPrice.trim() !== "" && !discValid;
                const discPct = discValid ? Math.round((1 - discNum / priceNum) * 100) : 0;
                return (
                <div
                  key={idx}
                  className="rounded-lg border border-stone-200 bg-stone-50/60 p-2"
                >
                  <div className="grid grid-cols-2 items-center gap-2 sm:grid-cols-[140px_1fr_110px_110px_90px_36px]">
                  {/* Colour is optional per row: a swatch colour + name. Only a
                      named colour is saved and matched to its swatch/image. */}
                  <div className="flex min-w-0 items-center overflow-hidden rounded-md border border-stone-200 bg-white">
                    <input
                      type="color"
                      value={v.colorHex || "#000000"}
                      onChange={(e) => setVariant(idx, { colorHex: e.target.value })}
                      title="Swatch colour"
                      className="h-8 w-8 shrink-0 cursor-pointer border-r border-stone-200 bg-white p-0.5"
                    />
                    <input
                      value={v.color}
                      onChange={(e) => setVariant(idx, { color: e.target.value })}
                      placeholder="Colour"
                      className="w-full min-w-0 bg-transparent px-2 py-2 text-[13.5px] text-stone-800 outline-none placeholder:text-stone-400"
                    />
                  </div>
                  <input
                    value={v.size}
                    onChange={(e) => setVariant(idx, { size: e.target.value })}
                    placeholder="e.g. M / 1 Litre"
                    /* min-w-[5rem] on the 1fr column: the five fixed columns beside
                       it can squeeze this one to zero width at mid viewports, which
                       hid the saved size ("2 YRS") behind a sliver of a box. */
                    className="col-span-2 min-w-0 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-[13.5px] text-stone-800 outline-none focus:border-brand-500 sm:col-span-1 sm:min-w-[5rem]"
                  />
                  <div className="flex items-center overflow-hidden rounded-md border border-stone-200 bg-white">
                    <span className="border-r border-stone-200 bg-stone-50 px-2 py-2 text-[13px] font-semibold text-stone-500">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={v.price}
                      onChange={(e) => setVariant(idx, { price: e.target.value })}
                      placeholder="0"
                      className="w-full min-w-0 bg-transparent px-2 py-2 text-[13.5px] text-stone-800 outline-none"
                    />
                  </div>
                  <div
                    className={[
                      "flex items-center overflow-hidden rounded-md border bg-white",
                      discInvalid ? "border-red-300" : "border-stone-200",
                    ].join(" ")}
                  >
                    <span className="border-r border-stone-200 bg-stone-50 px-2 py-2 text-[13px] font-semibold text-stone-500">৳</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={v.discountPrice}
                      onChange={(e) => setVariant(idx, { discountPrice: e.target.value })}
                      placeholder="—"
                      title="Sale price (optional). Leave blank for no discount."
                      className="w-full min-w-0 bg-transparent px-2 py-2 text-[13.5px] text-stone-800 outline-none"
                    />
                  </div>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={v.stock}
                    onChange={(e) => setVariant(idx, { stock: e.target.value })}
                    placeholder="0"
                    className="min-w-0 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-[13.5px] text-stone-800 outline-none focus:border-brand-500"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="flex h-8 w-8 items-center justify-center justify-self-end rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                  </div>

                  {/* One photo per variant row — shown on the storefront when
                      this option is picked. Thumbnail doubles as the replace
                      button so the control stays thumb-sized on mobile. */}
                  <div className="mt-2 flex items-center gap-2.5 px-0.5">
                    {v.imageUrl ? (
                      <>
                        <button
                          type="button"
                          onClick={() => setCustomizing({ kind: "variant", idx })}
                          disabled={sameTarget(uploading, { kind: "variant", idx })}
                          title="Replace photo"
                          className="relative h-12 w-12 shrink-0 overflow-hidden rounded-md border border-stone-200 bg-stone-100 disabled:opacity-50"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={v.imageUrl} alt="" className="h-full w-full object-cover" />
                        </button>
                        <span className="min-w-0 flex-1 text-[12px] text-stone-500">
                          {sameTarget(uploading, { kind: "variant", idx })
                            ? "Uploading…"
                            : "Photo for this option"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setVariant(idx, { imageUrl: "" })}
                          aria-label="Remove variant photo"
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCustomizing({ kind: "variant", idx })}
                        disabled={sameTarget(uploading, { kind: "variant", idx })}
                        className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-stone-300 bg-white py-2 text-[12.5px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600 disabled:opacity-50"
                      >
                        {sameTarget(uploading, { kind: "variant", idx }) ? (
                          "Uploading…"
                        ) : (
                          <>
                            <Icon name="image" size={14} /> Add photo for this option
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Row footer: discount feedback + storefront stock visibility. */}
                  <div className="mt-1.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-0.5">
                    <span className="text-[12px]">
                      {discInvalid ? (
                        <span className="font-medium text-red-600">Discount must be below the price.</span>
                      ) : discValid ? (
                        <span className="font-semibold text-brand-600">−{discPct}% off · sells at ৳{discNum}</span>
                      ) : (
                        <span className="text-stone-400">No discount</span>
                      )}
                    </span>
                    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-stone-600">
                      <input
                        type="checkbox"
                        checked={v.showStock}
                        onChange={(e) => setVariant(idx, { showStock: e.target.checked })}
                        className="h-3.5 w-3.5 rounded border-stone-300 text-brand-600 focus:ring-brand-500"
                      />
                      Show stock count on site
                    </label>
                    {/* Per-variant price colour. Unset = inherit the product's
                        colour (which itself falls back to the default black). */}
                    <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-stone-600">
                      <input
                        type="color"
                        value={v.priceColor || form.priceColor || "#111827"}
                        onChange={(e) => setVariant(idx, { priceColor: e.target.value })}
                        aria-label={`Price colour for ${variantRowLabel(v) || "this variant"}`}
                        className="h-6 w-8 cursor-pointer rounded border border-stone-200 bg-white p-0.5"
                      />
                      Price colour
                      {v.priceColor && (
                        <button
                          type="button"
                          onClick={() => setVariant(idx, { priceColor: "" })}
                          className="text-[11px] font-medium text-stone-400 underline decoration-dotted hover:text-stone-600"
                        >
                          reset
                        </button>
                      )}
                    </label>
                  </div>
                </div>
                );
              })}
            </div>
            </div>
            </div>
            <button
              type="button"
              onClick={addVariant}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 py-2.5 text-[13.5px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600"
            >
              <Icon name="plus" size={15} /> Add variant
            </button>
            {form.variants.length > 0 && (
              <p className="mt-2.5 text-[12px] text-stone-400">
                Set a colour and/or size per row — both are optional, but each row needs at least one plus a price. The
                lowest price becomes the storefront “from” price; each variant’s own price &amp; stock are charged at
                checkout. Out-of-stock variants can’t
                be added to cart.
              </p>
            )}
            </fieldset>
          </Card>
        </div>

        <div className="space-y-6 lg:sticky lg:top-6 self-start">
          <Card icon="eye" title="Live preview" hint="How customers will see it.">
            <LivePreview
              form={form}
              basePricePaisa={(() => {
                const p = submitPriceTaka();
                return p === "" ? "" : Math.round(Number(p) * 100);
              })()}
              fromPrice={isVariantMode}
            />
          </Card>

          <Card icon="grid" title="Organization">
            <Label required>Category</Label>
            <CategorySelect
              value={form.categoryId}
              onChange={(v) => set("categoryId", v)}
              error={errors.categoryId}
              categories={categories}
            />
            <ErrorText>{errors.categoryId}</ErrorText>
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
            <Label hint="optional · ~160 chars · defaults to the description">Meta description</Label>
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
              Leave blank to auto-generate from the product name and description.
            </p>
          </Card>
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

    {/* Explicit null check — variant row 0 is a valid target but falsy. */}
    {customizing !== null && (
      <ImageCustomizer
        label={
          customizing.kind === "product" ? "Product photo" : "Variant photo"
        }
        targetWidth={PRODUCT_IMG.width}
        targetHeight={PRODUCT_IMG.height}
        maxBytes={PRODUCT_IMG.maxBytes}
        onClose={() => setCustomizing(null)}
        onDone={handleCustomized}
      />
    )}
    </>
  );
}
