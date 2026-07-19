"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";
import Link from "next/link";
import { Icon, type IconName } from "@/components/icons";
import ImageCustomizer from "@/components/admin/ImageCustomizer";
import { saveProduct } from "./actions";
import type { listAllSubcategories } from "@/server/categories/admin";
import type { getProductById } from "@/server/products/admin";

/* Product photos are square 1000×1000 thumbnails, kept light so the catalog
   and product pages stay fast. Up to 10 per product; the first is the cover. */
const PRODUCT_IMG = { width: 1000, height: 1000, maxBytes: 200 * 1024 };
const MAX_IMAGES = 10;

type Subcategory = Awaited<ReturnType<typeof listAllSubcategories>>[number];
type Product = NonNullable<Awaited<ReturnType<typeof getProductById>>>;

interface ImageRow {
  url: string;
  /** Label of the variant row this photo shows ("Navy / M"); "" = whole product. */
  variantLabel: string;
}

interface ColorRow {
  name: string;
  hexCode: string;
  imageUrl: string;
}

interface SpecRow {
  label: string;
  value: string;
}

interface VariantRow {
  /** Colour name for this option, or "" for none. */
  color: string;
  /** Swatch hex for the colour (used when there's no swap image). */
  colorHex: string;
  /** Optional swap image URL shown when this colour is picked. */
  colorImage: string;
  /** Size/option label, e.g. "M" or "1 Litre", or "" for none. */
  size: string;
  /** Regular price in Taka, as a string for the input. */
  price: string;
  /** Optional sale price in Taka; "" = no discount. */
  discountPrice: string;
  stock: string;
  /** Show the stock count on the storefront for this variant. */
  showStock: boolean;
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
  subcategoryId: string; // string for select value
  description: string;
  price: number | ""; // paisa
  discountPrice: number | ""; // paisa
  purchaseCost: number | ""; // paisa — sourcing cost (COGS basis)
  stock: number | "";
  lowStockThreshold: number | ""; // 0/"" = disabled
  showStock: boolean; // show the "In stock (N available)" count on the storefront
  status: "ACTIVE" | "INACTIVE";
  promoBadge: string;
  metaTitle: string;
  metaDescription: string;
  isFeatured: boolean;
  images: ImageRow[]; // photo URLs + optional variant link; first is the cover
  colors: ColorRow[];
  specifications: SpecRow[];
  features: string[];
  variants: VariantRow[];
}

interface Props {
  subcategories: Subcategory[];
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

function initialFromProduct(p?: Product): FormState {
  if (!p) {
    return {
      pricingMode: "simple",
      name: "",
      subcategoryId: "",
      description: "",
      price: "",
      discountPrice: "",
      purchaseCost: "",
      stock: "",
      lowStockThreshold: "",
      showStock: true,
      status: "ACTIVE",
      promoBadge: "",
      metaTitle: "",
      metaDescription: "",
      isFeatured: false,
      images: [],
      colors: [],
      specifications: [],
      features: [],
      variants: [],
    };
  }
  const imageRows: ImageRow[] = p.images
    .slice()
    .sort((a, b) => (b.isPrimary ? 1 : 0) - (a.isPrimary ? 1 : 0))
    .map((i) => ({ url: i.url, variantLabel: i.variantLabel ?? "" }));
  return {
    pricingMode: (p.variants?.length ?? 0) > 0 ? "variant" : "simple",
    name: p.name,
    subcategoryId: String(p.subcategoryId),
    description: p.description ?? "",
    price: p.price,
    discountPrice: p.discountPrice ?? "",
    purchaseCost: p.purchaseCost ?? "",
    stock: p.stock,
    lowStockThreshold: p.lowStockThreshold || "",
    showStock: p.showStock ?? true,
    status: p.status,
    promoBadge: p.promoBadge ?? "",
    metaTitle: p.metaTitle ?? "",
    metaDescription: p.metaDescription ?? "",
    isFeatured: p.isFeatured,
    images: imageRows,
    colors: p.colors?.map((c) => ({ name: c.name, hexCode: c.hexCode, imageUrl: c.imageUrl ?? "" })) ?? [],
    specifications: p.specifications?.map((s) => ({ label: s.label, value: s.value })) ?? [],
    features: p.features?.map((f) => f.text) ?? [],
    // A variant's colour swatch/image used to live in the shared ProductColor
    // list, matched by name. Colours are now entered per row, so backfill hex &
    // image from that list for existing products.
    variants:
      p.variants?.map((v) => {
        const swatch = v.colorName ? p.colors?.find((c) => c.name === v.colorName) : undefined;
        return {
          color: v.colorName ?? "",
          colorHex: swatch?.hexCode ?? "#000000",
          colorImage: swatch?.imageUrl ?? "",
          size: v.size ?? "",
          price: String(v.price / 100),
          discountPrice: v.discountPrice != null ? String(v.discountPrice / 100) : "",
          stock: String(v.stock),
          showStock: v.showStock ?? true,
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

/* ─────────── grouped subcategory select ─────────── */
function SubcategorySelect({
  value,
  onChange,
  error,
  subcategories,
}: {
  value: string;
  onChange: (v: string) => void;
  error?: string;
  subcategories: Subcategory[];
}) {
  const groups = useMemo(() => {
    const map = new Map<string, Subcategory[]>();
    subcategories.forEach((s) => {
      const g = s.category.name;
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(s);
    });
    return [...map.entries()];
  }, [subcategories]);

  return (
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
        {groups.map(([cat, subs]) => (
          <optgroup key={cat} label={cat}>
            {subs.map((s) => (
              <option key={s.id} value={s.id}>
                {cat} / {s.name}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 text-stone-400">
        <Icon name="chevronDown" size={16} />
      </span>
    </div>
  );
}

/* ─────────── live preview ─────────── */
function LivePreview({ form, basePricePaisa, fromPrice }: { form: FormState; basePricePaisa: number | ""; fromPrice: boolean }) {
  const firstImg = form.images.find((i) => i.url.trim())?.url;
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
export default function ProductForm({ subcategories, product }: Props) {
  const isEdit = !!product;
  const [form, setForm] = useState<FormState>(() => initialFromProduct(product));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startSave] = useTransition();
  const [customizing, setCustomizing] = useState(false);
  const [uploading, setUploading] = useState(false);
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
  const setImageVariant = (idx: number, variantLabel: string) =>
    setForm((f) => ({
      ...f,
      images: f.images.map((img, i) => (i === idx ? { ...img, variantLabel } : img)),
    }));

  // The customizer hands back a JPEG already cropped to 1000×1000 and compressed
  // under 200 KB, so it just needs uploading and appending to the list.
  async function handleCustomized(file: File) {
    setCustomizing(false);
    setImageError(null);
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "products");
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setForm((f) => ({ ...f, images: [...f.images, { url: data.url, variantLabel: "" }].slice(0, MAX_IMAGES) }));
    } catch (err) {
      setImageError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  const setColor = (idx: number, val: Partial<ColorRow>) =>
    set("colors", form.colors.map((c, i) => (i === idx ? { ...c, ...val } : c)));
  const addColor = () => set("colors", [...form.colors, { name: "", hexCode: "#000000", imageUrl: "" }]);
  const removeColor = (idx: number) => set("colors", form.colors.filter((_, i) => i !== idx));

  const setSpec = (idx: number, val: Partial<SpecRow>) =>
    set("specifications", form.specifications.map((s, i) => (i === idx ? { ...s, ...val } : s)));
  const addSpec = () => set("specifications", [...form.specifications, { label: "", value: "" }]);
  const removeSpec = (idx: number) => set("specifications", form.specifications.filter((_, i) => i !== idx));

  const setFeature = (idx: number, val: string) =>
    set("features", form.features.map((f, i) => (i === idx ? val : f)));
  const addFeature = () => set("features", [...form.features, ""]);
  const removeFeature = (idx: number) => set("features", form.features.filter((_, i) => i !== idx));

  const setVariant = (idx: number, val: Partial<VariantRow>) =>
    set("variants", form.variants.map((v, i) => (i === idx ? { ...v, ...val } : v)));
  const addVariant = () =>
    set("variants", [
      ...form.variants,
      { color: "", colorHex: "#000000", colorImage: "", size: "", price: "", discountPrice: "", stock: "0", showStock: true },
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
            };
          })
      : [];

  // Display label for a variant row — must mirror how the server derives it
  // from colorName/size ("Navy / M") since ProductImage.variantLabel is matched
  // against these labels on save.
  const variantRowLabel = (v: VariantRow) =>
    [v.color.trim(), v.size.trim()].filter(Boolean).join(" / ");
  // Labels of the rows that will actually be saved — these feed the per-image
  // "which variant is this photo?" dropdowns in the Images card.
  const validVariantLabels = isVariantMode
    ? [...new Set(
        form.variants
          .filter((v) => (v.color.trim() || v.size.trim()) && Number(v.price) > 0)
          .map(variantRowLabel),
      )]
    : [];

  // Images serialized for submit: drop blank URLs, and drop a variant link whose
  // row was deleted/renamed after the photo was tagged.
  const cleanImages = () =>
    form.images
      .filter((img) => img.url.trim())
      .map((img) => ({
        url: img.url.trim(),
        variantLabel: validVariantLabels.includes(img.variantLabel) ? img.variantLabel : null,
      }));

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

  // The ProductColor swatch list (name → hex/image). It's the source of the
  // storefront swatches, matched to variants by name. In simple mode it's the
  // colour rows on the Pricing & stock card; in variant mode it's derived by
  // deduping the colours entered on the variant rows (first occurrence wins).
  const cleanColors = () => {
    if (!isVariantMode) {
      return form.colors
        .filter((c) => c.name.trim() && c.hexCode.trim())
        .map((c) => ({ name: c.name.trim(), hexCode: c.hexCode.trim(), imageUrl: c.imageUrl.trim() || "" }));
    }
    const seen = new Map<string, { name: string; hexCode: string; imageUrl: string }>();
    for (const v of form.variants) {
      const name = v.color.trim();
      // Only colours on rows that will actually be saved (named + priced).
      if (!name || Number(v.price) <= 0) continue;
      if (!seen.has(name)) {
        seen.set(name, { name, hexCode: (v.colorHex || "#000000").trim(), imageUrl: v.colorImage.trim() });
      }
    }
    return [...seen.values()];
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const base = { price: submitPriceTaka(), stock: submitStock() };
    fd.set("price", base.price === "" ? "" : String(base.price));
    fd.set("stock", base.stock === "" ? "" : String(base.stock));
    fd.set("images", JSON.stringify(cleanImages()));
    fd.set("colors", JSON.stringify(cleanColors()));
    fd.set(
      "specifications",
      JSON.stringify(form.specifications.filter((s) => s.label.trim() && s.value.trim())),
    );
    fd.set("features", form.features.filter((f) => f.trim()).join("\n"));
    fd.set("variants", JSON.stringify(cleanVariants()));

    const clientErrors: Record<string, string> = { ...liveErrors };
    if (!form.name.trim()) clientErrors.name = "Name is required.";
    if (!form.subcategoryId) clientErrors.subcategoryId = "Please select a category.";
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
    <form onSubmit={handleSubmit} className="font-manrope mx-auto w-full max-w-[1200px] px-5 py-6 pb-32 lg:px-8 lg:pb-10">
      {/* hidden inputs for the server action — saveProduct expects taka, not paisa */}
      <input type="hidden" name="name" value={form.name} />
      <input type="hidden" name="subcategoryId" value={form.subcategoryId} />
      <input type="hidden" name="description" value={form.description} />
      <input type="hidden" name="price" value={(() => { const p = submitPriceTaka(); return p === "" ? "" : String(p); })()} />
      <input type="hidden" name="discountPrice" value={isVariantMode ? "" : paisaToTakaStr(form.discountPrice)} />
      <input type="hidden" name="purchaseCost" value={paisaToTakaStr(form.purchaseCost)} />
      <input type="hidden" name="stock" value={(() => { const s = submitStock(); return s === "" ? "" : String(s); })()} />
      <input type="hidden" name="lowStockThreshold" value={form.lowStockThreshold === "" ? "" : String(form.lowStockThreshold)} />
      <input type="hidden" name="showStock" value={form.showStock ? "true" : "false"} />
      <input type="hidden" name="status" value={form.status} />
      <input type="hidden" name="promoBadge" value={form.promoBadge} />
      <input type="hidden" name="metaTitle" value={form.metaTitle} />
      <input type="hidden" name="metaDescription" value={form.metaDescription} />
      {form.isFeatured && <input type="hidden" name="isFeatured" value="on" />}
      <input type="hidden" name="images" value={JSON.stringify(cleanImages())} />
      <input type="hidden" name="colors" value={JSON.stringify(cleanColors())} />
      <input
        type="hidden"
        name="specifications"
        value={JSON.stringify(form.specifications.filter((s) => s.label.trim() && s.value.trim()))}
      />
      <input type="hidden" name="features" value={form.features.filter((f) => f.trim()).join("\n")} />
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

      <div className="mt-7 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
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
                <Label hint={`${form.description.length}/500`}>Description</Label>
                <textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  rows={4}
                  maxLength={500}
                  placeholder="Describe your product — materials, features, what makes it special…"
                  className="w-full resize-y rounded-lg border border-stone-200 bg-white px-3 py-2.5 text-[14px] text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-brand-500 focus:ring-4 focus:ring-brand-50"
                />
              </div>
            </div>
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

          <Card icon="tag" title="Pricing & stock" hint={isVariantMode ? "Disabled — priced by variants below." : "All amounts in Bangladeshi Taka."} className={isVariantMode ? "opacity-60" : ""}>
            <fieldset disabled={isVariantMode} className="contents">
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
            <div className="mt-5 border-t border-stone-100 pt-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                  {marginPct != null && !errors.purchaseCost && (
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
            </div>

            {/* Colours for a single-price product (optional). Shown as swatches on
                the product page; each may carry an optional swap image. */}
            <div className="mt-5 border-t border-stone-100 pt-5">
              <Label hint="optional">Colours</Label>
              <p className="-mt-1 mb-2 text-[12px] text-stone-400">
                Add one or more colour swatches shoppers can pick. Leave empty for a single-colour product.
              </p>
              <div className="space-y-2">
                {form.colors.map((c, idx) => (
                  <div key={idx} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2">
                    <input
                      type="color"
                      value={c.hexCode || "#000000"}
                      onChange={(e) => setColor(idx, { hexCode: e.target.value })}
                      className="h-9 w-9 shrink-0 cursor-pointer rounded-md border border-stone-200"
                    />
                    <input
                      value={c.name}
                      onChange={(e) => setColor(idx, { name: e.target.value })}
                      placeholder="Colour name (e.g. Navy Blue)"
                      className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[13.5px] text-stone-800 outline-none placeholder:text-stone-400"
                    />
                    <input
                      value={c.imageUrl}
                      onChange={(e) => setColor(idx, { imageUrl: e.target.value })}
                      placeholder="Swap image URL (optional)"
                      className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[13px] text-stone-600 outline-none placeholder:text-stone-400 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => removeColor(idx)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                    >
                      <Icon name="trash" size={15} />
                    </button>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addColor}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 py-2 text-[13px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600"
              >
                <Icon name="plus" size={15} /> Add colour
              </button>
            </div>
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
            {errors.variants && isVariantMode && (
              <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
                {errors.variants}
              </p>
            )}
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
                    className="col-span-2 min-w-0 rounded-md border border-stone-200 bg-white px-2.5 py-2 text-[13.5px] text-stone-800 outline-none focus:border-brand-500 sm:col-span-1"
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

                  {/* Optional swap image for this colour — only meaningful once a
                      colour is named. */}
                  {v.color.trim() && (
                    <div className="mt-1.5 flex items-center gap-2 px-0.5">
                      <Icon name="image" size={13} className="shrink-0 text-stone-400" />
                      <input
                        value={v.colorImage}
                        onChange={(e) => setVariant(idx, { colorImage: e.target.value })}
                        placeholder="Swap image URL for this colour (optional)"
                        className="w-full min-w-0 rounded-md border border-stone-200 bg-white px-2 py-1.5 text-[12.5px] text-stone-600 outline-none placeholder:text-stone-400 focus:border-brand-500 font-mono"
                      />
                    </div>
                  )}

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
                  </div>
                </div>
                );
              })}
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

          <Card
            icon="image"
            title="Images"
            hint={`Square 1000×1000px · up to ${MAX_IMAGES} · ≤200 KB each. The first photo is the cover.`}
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {form.images.map((img, idx) => (
                <div key={img.url + idx}>
                  <div className="group relative aspect-square overflow-hidden rounded-lg border border-stone-200 bg-stone-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="" className="h-full w-full object-cover" />
                    {idx === 0 && (
                      <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white shadow">
                        Cover
                      </span>
                    )}
                    <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/55 to-transparent p-1.5 opacity-0 transition group-hover:opacity-100">
                      {idx !== 0 ? (
                        <button
                          type="button"
                          onClick={() => makePrimary(idx)}
                          title="Make cover"
                          className="rounded-md bg-white/90 px-1.5 py-1 text-[10.5px] font-semibold text-stone-700 hover:bg-white"
                        >
                          Make cover
                        </button>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        title="Remove photo"
                        className="flex h-7 w-7 items-center justify-center rounded-md bg-white/90 text-stone-500 hover:bg-white hover:text-red-500"
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Which variant does this photo show? Only offered once at
                      least one valid variant row exists; the value is a label
                      snapshot ("Navy / M") matched against the rows on save. */}
                  {isVariantMode && validVariantLabels.length > 0 && (
                    <select
                      value={validVariantLabels.includes(img.variantLabel) ? img.variantLabel : ""}
                      onChange={(e) => setImageVariant(idx, e.target.value)}
                      aria-label="Variant shown in this photo"
                      className="mt-1.5 w-full rounded-md border border-stone-200 bg-white px-1.5 py-1 text-[11.5px] text-stone-700 outline-none focus:border-brand-400"
                    >
                      <option value="">Whole product</option>
                      {validVariantLabels.map((label) => (
                        <option key={label} value={label}>
                          {label}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              {form.images.length < MAX_IMAGES && !(isVariantMode && validVariantLabels.length === 0) && (
                <button
                  type="button"
                  onClick={() => setCustomizing(true)}
                  disabled={uploading}
                  className="flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600 disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="text-[12px] font-semibold">Uploading…</span>
                  ) : (
                    <>
                      <Icon name="plus" size={20} />
                      <span className="text-[12px] font-semibold">Add photo</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isVariantMode && validVariantLabels.length === 0 && (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50/60 px-3 py-2 text-[12.5px] text-amber-700">
                Add at least one variant row (a colour or size plus a price) in Sizes / Variants
                before uploading photos — each photo can then be linked to the variant it shows.
              </p>
            )}

            <p className="mt-3 text-[12.5px] text-stone-400">
              {form.images.length}/{MAX_IMAGES} photos · upload any picture, then crop it to a square and shrink it to fit.
            </p>
            <ErrorText>{imageError ?? undefined}</ErrorText>
          </Card>

          <Card icon="info" title="Specifications" hint="Label/value pairs shown in the Specification tab.">
            <div className="space-y-2">
              {form.specifications.map((s, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2">
                  <input
                    value={s.label}
                    onChange={(e) => setSpec(idx, { label: e.target.value })}
                    placeholder="Label (e.g. Material)"
                    className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[13.5px] text-stone-800 outline-none placeholder:text-stone-400"
                  />
                  <input
                    value={s.value}
                    onChange={(e) => setSpec(idx, { value: e.target.value })}
                    placeholder="Value (e.g. Water-resistant polyester)"
                    className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[13.5px] text-stone-800 outline-none placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => removeSpec(idx)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addSpec}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 py-2.5 text-[13.5px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600"
            >
              <Icon name="plus" size={15} /> Add specification
            </button>
          </Card>

          <Card icon="info" title="Features" hint="Bullet points shown in the Feature tab.">
            <div className="space-y-2">
              {form.features.map((f, idx) => (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-stone-200 bg-stone-50/60 p-2">
                  <input
                    value={f}
                    onChange={(e) => setFeature(idx, e.target.value)}
                    placeholder="e.g. Padded laptop compartment"
                    className="flex-1 min-w-0 bg-transparent px-1 py-2 text-[13.5px] text-stone-800 outline-none placeholder:text-stone-400"
                  />
                  <button
                    type="button"
                    onClick={() => removeFeature(idx)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500"
                  >
                    <Icon name="trash" size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addFeature}
              className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/60 py-2.5 text-[13.5px] font-semibold text-stone-500 transition hover:border-brand-300 hover:bg-brand-50/30 hover:text-brand-600"
            >
              <Icon name="plus" size={15} /> Add feature
            </button>
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
            <SubcategorySelect
              value={form.subcategoryId}
              onChange={(v) => set("subcategoryId", v)}
              error={errors.subcategoryId}
              subcategories={subcategories}
            />
            <ErrorText>{errors.subcategoryId}</ErrorText>
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

    {customizing && (
      <ImageCustomizer
        label="Product photo"
        targetWidth={PRODUCT_IMG.width}
        targetHeight={PRODUCT_IMG.height}
        maxBytes={PRODUCT_IMG.maxBytes}
        onClose={() => setCustomizing(false)}
        onDone={handleCustomized}
      />
    )}
    </>
  );
}
