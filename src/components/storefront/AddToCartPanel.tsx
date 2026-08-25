"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useCartStore } from "@/lib/cart-store";
import { trackAddToCart } from "@/lib/pixel";
import { recordAddToCart } from "@/app/(storefront)/funnel-actions";
import { formatTaka, priceColorStyle } from "@/lib/money";
import { Icon } from "@/components/icons";
import { Banknote, ShoppingCart, Minus, Plus } from "lucide-react";
import { useVariantImage } from "@/components/storefront/product/VariantImageContext";
import { usePurchaseIntent } from "@/components/storefront/product/PurchaseIntentContext";
import ColorStrip from "@/components/storefront/product/ColorStrip";
import SizeChartModal from "@/components/storefront/product/SizeChartModal";

interface ColorOption {
  id: number;
  name: string;
  hexCode: string;
  imageUrl?: string | null;
}

interface VariantOption {
  id: number;
  size: string | null;
  colorName: string | null;
  /** Paisa — regular price. */
  price: number;
  /** Paisa — sale price when set (< price); null = no discount. */
  discountPrice: number | null;
  stock: number;
  /** Whether to show the "X in stock" count for this variant. */
  showStock: boolean;
  /** Price colour (#rrggbb) for this variant; null = inherit the product's. */
  priceColor?: string | null;
  /** Photo uploaded for this specific option; null = none. */
  imageUrl?: string | null;
}

interface Props {
  productId: number;
  slug: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
  stock: number;
  colors?: ColorOption[];
  variants?: VariantOption[];
  /** Product-level price colour (#rrggbb); null = theme default. */
  priceColor?: string | null;
  /** From the resolved size guide: "Bust Size" → "Select Bust Size:". */
  sizeLabel?: string | null;
  /** The guide's size order; sizes not in it keep their row order, after these. */
  sizeOrder?: string[];
  /** Size chart, pre-rendered to HTML on the server. Null = no chart link. */
  sizeChartHtml?: string | null;
}

export default function AddToCartPanel({
  productId,
  slug,
  name,
  unitPrice,
  imageUrl,
  stock,
  colors = [],
  variants = [],
  priceColor,
  sizeLabel,
  sizeOrder = [],
  sizeChartHtml,
}: Props) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);

  const hasVariants = variants.length > 0;

  if (hasVariants) {
    return (
      <VariantPurchase
        productId={productId}
        slug={slug}
        name={name}
        imageUrl={imageUrl}
        colors={colors}
        variants={variants}
        priceColor={priceColor}
        sizeLabel={sizeLabel}
        sizeOrder={sizeOrder}
        sizeChartHtml={sizeChartHtml}
        quantity={quantity}
        setQuantity={setQuantity}
        addItem={addItem}
        router={router}
      />
    );
  }

  return (
    <LegacyPurchase
      productId={productId}
      slug={slug}
      name={name}
      unitPrice={unitPrice}
      imageUrl={imageUrl}
      stock={stock}
      quantity={quantity}
      setQuantity={setQuantity}
      addItem={addItem}
      router={router}
    />
  );
}

type AddItem = ReturnType<typeof useCartStore.getState>["addItem"];
type Router = ReturnType<typeof useRouter>;

/* ─────────── shared quantity stepper ─────────── */
function QtyStepper({
  quantity,
  setQuantity,
  max,
  disabled,
}: {
  quantity: number;
  setQuantity: (n: number | ((q: number) => number)) => void;
  max: number;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-[13.5px] font-semibold text-slate-700">Quantity</span>
      <div className="inline-flex items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.max(1, q - 1))}
          disabled={disabled || quantity <= 1}
          aria-label="Decrease quantity"
          className="flex h-10 w-10 items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Minus size={16} />
        </button>
        <span className="w-11 select-none text-center text-[15px] font-bold text-slate-900 tabular-nums">
          {quantity}
        </span>
        <button
          type="button"
          onClick={() => setQuantity((q) => Math.min(max, q + 1))}
          disabled={disabled || quantity >= max}
          aria-label="Increase quantity"
          className="flex h-10 w-10 items-center justify-center text-slate-600 transition hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-transparent"
        >
          <Plus size={16} />
        </button>
      </div>
    </div>
  );
}

function ActionButtons({
  onAdd,
  onBuy,
  disabled,
  soldOut,
}: {
  onAdd: () => void;
  onBuy: () => void;
  disabled: boolean;
  soldOut: boolean;
}) {
  return (
    <>
      {/* The two buttons sit side by side, sharing the row evenly (flex-1 with
          a zero basis, so a longer label can't win more width than the other),
          with square corners (rounded-none) and compact padding.
          The row is capped at 75% so the pair is a quarter narrower than the
          column it sits in — verified down to 320px, where the labels still fit
          on one line.
          btn-brand-* are themed via --brand in storefront.css so the pair tracks
          the admin brand palette. */}
      <div className="flex w-3/4 items-stretch gap-2.5">
        {/* btn-sweep gives this the diagonal fill the home page category tiles
            use on "Shop Now". The label has to live in its own <span> — the
            sweeping panel sits behind the button at z-index:-1 and would cover
            bare text nodes. btn-shake wiggles it every 4s to draw the eye back;
            both are defined in storefront.css. */}
        <button
          onClick={onAdd}
          disabled={disabled}
          className="btn-brand-outline btn-sweep btn-shake flex min-w-0 flex-1 basis-0 items-center justify-center whitespace-nowrap rounded-none px-3 py-2 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <ShoppingCart size={15} />
            Add to Cart
          </span>
        </button>
        <button
          onClick={onBuy}
          disabled={disabled}
          className="btn-brand-solid btn-glow flex min-w-0 flex-1 basis-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-none px-3 py-2 text-[13.5px] font-bold disabled:cursor-not-allowed disabled:opacity-40 sm:px-4"
        >
          {/* btn-glow paints two panels at z-index:-1; a bare text node would
              be painted over, so the label is wrapped like btn-sweep's. */}
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Banknote size={16} />
            Buy Now
          </span>
        </button>
      </div>
      {soldOut && <p className="text-sm font-medium text-red-600">Currently out of stock.</p>}
    </>
  );
}

/* ─────────── color × size matrix purchase ─────────── */
function VariantPurchase({
  productId,
  slug,
  name,
  imageUrl,
  colors,
  variants,
  priceColor,
  sizeLabel,
  sizeOrder,
  sizeChartHtml,
  quantity,
  setQuantity,
  addItem,
  router,
}: {
  productId: number;
  slug: string;
  name: string;
  imageUrl: string | null;
  colors: ColorOption[];
  variants: VariantOption[];
  priceColor?: string | null;
  sizeLabel?: string | null;
  sizeOrder: string[];
  sizeChartHtml?: string | null;
  quantity: number;
  setQuantity: (n: number | ((q: number) => number)) => void;
  addItem: AddItem;
  router: Router;
}) {
  // Which dimensions does this product actually use?
  const colorNames = useMemo(
    () => [...new Set(variants.map((v) => v.colorName).filter((c): c is string => !!c))],
    [variants],
  );
  // Chip order comes from the size guide, not from the order the admin happened
  // to enter rows in — that's what stops a product reading "XL, S, M, L".
  // Sizes the guide doesn't know about keep their row order, after the rest.
  const sizes = useMemo(() => {
    const present = [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))];
    const ranked = sizeOrder.filter((s) => present.includes(s));
    return [...ranked, ...present.filter((s) => !sizeOrder.includes(s))];
  }, [variants, sizeOrder]);
  const needColor = colorNames.length > 0;
  const needSize = sizes.length > 0;

  // Color swatches in their defined order, enriched with hex/image where known.
  // `imageUrl` is the photo the *gallery* swaps to when this colour is picked —
  // a photo uploaded on the variant row itself wins over the shared ProductColor
  // image (which older products still rely on). The swatch button itself renders
  // `hexCode`, never this photo: it is a product shot, not a colour chip, and
  // shrunk to swatch size it read as an unrecognisable thumbnail.
  const colorOptions = useMemo(
    () =>
      colorNames.map((cn) => {
        const def = colors.find((c) => c.name === cn);
        const rowImage = variants.find((v) => v.colorName === cn && v.imageUrl)?.imageUrl ?? null;
        return {
          name: cn,
          hexCode: def?.hexCode ?? "#e5e7eb",
          imageUrl: rowImage ?? def?.imageUrl ?? null,
        };
      }),
    [colorNames, colors, variants],
  );

  // The photo strip only replaces the chips when EVERY colour has a photo — a
  // strip with one placeholder tile in it reads as broken.
  const everyColorHasPhoto = colorOptions.length > 0 && colorOptions.every((c) => !!c.imageUrl);

  const [colorName, setColorName] = useState<string | null>(null);
  const [size, setSize] = useState<string | null>(null);
  const [error, setError] = useState(false);

  const variantFor = (cn: string | null, sz: string | null) =>
    variants.find((v) => (v.colorName ?? null) === cn && (v.size ?? null) === sz) ?? null;

  const colorHasStock = (cn: string) => variants.some((v) => v.colorName === cn && v.stock > 0);
  const sizeHasStock = (sz: string) => {
    // Once a colour is chosen, availability narrows to that colour's row.
    if (needColor) return colorName ? (variantFor(colorName, sz)?.stock ?? 0) > 0 : false;
    return (variantFor(null, sz)?.stock ?? 0) > 0;
  };

  // The amount actually charged for a variant — its sale price when discounted.
  const priceOf = (v: VariantOption) => v.discountPrice ?? v.price;

  const selectedVariant = variantFor(needColor ? colorName : null, needSize ? size : null);

  // Hand the chosen option's photo to the gallery so it shows in the main image
  // on the left. Falls back to the colour's swatch photo when the specific
  // row has none of its own.
  const { setUrl: setGalleryImage } = useVariantImage();
  const activeOptionImage =
    selectedVariant?.imageUrl ??
    (colorName ? (colorOptions.find((c) => c.name === colorName)?.imageUrl ?? null) : null);
  useEffect(() => {
    setGalleryImage(activeOptionImage ?? null);
  }, [activeOptionImage, setGalleryImage]);
  // Cheapest row backs the "from" price shown before a choice is made — kept as
  // the variant (not just its amount) so the price can take that row's colour.
  const cheapestVariant = variants.reduce(
    (lo: VariantOption | null, v) => (lo === null || priceOf(v) < priceOf(lo) ? v : lo),
    null,
  );
  const effectivePrice = selectedVariant
    ? priceOf(selectedVariant)
    : cheapestVariant
      ? priceOf(cheapestVariant)
      : 0;
  const selectedHasDiscount = !!selectedVariant && selectedVariant.discountPrice != null;
  const effectiveStock = selectedVariant?.stock ?? 0;
  const maxQty = Math.max(effectiveStock, 1);
  const allSoldOut = variants.every((v) => v.stock <= 0);

  function pickColor(cn: string) {
    setColorName(cn);
    setError(false);
    // A size chosen for the previous colour may not exist / be in stock here.
    if (size && (variantFor(cn, size)?.stock ?? 0) <= 0) setSize(null);
  }
  function pickSize(sz: string) {
    setSize(sz);
    setError(false);
    const v = variantFor(needColor ? colorName : null, sz);
    if (v) setQuantity((q) => Math.min(Math.max(q, 1), Math.max(v.stock, 1)));
  }

  function ready(): boolean {
    if (needColor && !colorName) return false;
    if (needSize && !size) return false;
    return !!selectedVariant && selectedVariant.stock > 0;
  }

  function addToCart() {
    if (!ready()) {
      setError(true);
      return false;
    }
    const label = [colorName, size].filter(Boolean).join(" / ");
    const unit = priceOf(selectedVariant!);
    addItem(
      {
        productId,
        variantId: selectedVariant!.id,
        variantLabel: label || null,
        slug,
        name: label ? `${name} — ${label}` : name,
        unitPrice: unit,
        imageUrl,
      },
      quantity,
    );
    trackAddToCart({ value: (unit * quantity) / 100 });
    void recordAddToCart(productId); // server-side funnel (fire-and-forget)
    return true;
  }

  function handleAdd() {
    if (addToCart()) router.push("/cart");
  }
  function handleBuy() {
    if (addToCart()) router.push(`/checkout?buyNow=${productId}&variant=${selectedVariant!.id}`);
  }

  // Hand the sticky mobile bar a working Buy Now once colour/size are settled,
  // and take it back when they aren't — the bar scrolls here instead then.
  // `ready()` reads state that changes on every pick, so this re-runs with it.
  const canBuy = ready();
  const { publish } = usePurchaseIntent();
  useEffect(() => {
    publish(canBuy ? handleBuy : null);
    return () => publish(null);
    // handleBuy closes over the current selection and quantity; canBuy flips
    // whenever those make a purchase possible, so it is the honest trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canBuy, publish, selectedVariant?.id, quantity]);

  return (
    <div className="space-y-4">
      {/* Colour: a strip of product shots when every colour has one (the photo
          IS the choice), otherwise the hex chips older products rely on. */}
      {needColor && everyColorHasPhoto && (
        <ColorStrip
          options={colorOptions.map((c) => ({
            name: c.name,
            imageUrl: c.imageUrl!,
            soldOut: !colorHasStock(c.name),
          }))}
          selected={colorName}
          onSelect={pickColor}
        />
      )}
      {needColor && !everyColorHasPhoto && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            Color Family:
            {colorName && <span className="ml-1.5 font-semibold text-gray-900">{colorName}</span>}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {colorOptions.map((c) => {
              const selected = c.name === colorName;
              const soldOut = !colorHasStock(c.name);
              return (
                <button
                  key={c.name}
                  type="button"
                  disabled={soldOut}
                  title={c.name + (soldOut ? " — sold out" : "")}
                  aria-label={c.name}
                  aria-pressed={selected}
                  onClick={() => pickColor(c.name)}
                  className={[
                    // A colour chip, matching the single-price "Available Color"
                    // picker. The variant's photo belongs in the gallery.
                    "relative h-9 w-9 overflow-hidden rounded-full border transition",
                    soldOut ? "cursor-not-allowed opacity-40" : "",
                    selected ? "border-brand-600 ring-2 ring-brand-600 ring-offset-1" : "border-gray-300 hover:border-gray-400",
                  ].join(" ")}
                  style={{ backgroundColor: c.hexCode }}
                >
                  {soldOut && <span className="absolute inset-0 grid place-items-center text-[10px] font-bold text-gray-700">✕</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Size */}
      {needSize && (
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-medium text-gray-700">
              Select {sizeLabel?.trim() || "Size"}:
              {size && <span className="ml-1.5 font-semibold text-gray-900">{size}</span>}
            </p>
            {sizeChartHtml && <SizeChartModal html={sizeChartHtml} label={sizeLabel?.trim() || "Size"} />}
          </div>
          <div className="flex flex-wrap gap-2">
            {sizes.map((sz) => {
              const selected = sz === size;
              const blockedByColor = needColor && !colorName;
              const soldOut = !blockedByColor && !sizeHasStock(sz);
              const disabled = blockedByColor || soldOut;
              return (
                <button
                  key={sz}
                  type="button"
                  disabled={disabled}
                  onClick={() => pickSize(sz)}
                  className={[
                    // Rectangular, wrapping chips — a bust run of 14 sizes has
                    // to read as a grid, not a sentence.
                    "min-w-[3.25rem] rounded-md border px-3.5 py-2 text-center text-sm font-semibold transition",
                    disabled
                      ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300" + (soldOut ? " line-through" : "")
                      : selected
                        ? "border-brand-600 bg-white text-brand-700 ring-1 ring-brand-600"
                        : "border-gray-200 bg-gray-50/70 text-gray-700 hover:border-gray-400 hover:bg-white",
                  ].join(" ")}
                >
                  {sz}
                </button>
              );
            })}
          </div>
          {needColor && !colorName && (
            <p className="mt-1.5 text-xs text-gray-400">Select a color to see available sizes.</p>
          )}
        </div>
      )}

      {/* Price + stock for the chosen combo */}
      <p className="text-sm">
        {selectedVariant ? (
          <>
            <span
              className="text-[30px] font-extrabold leading-none text-slate-900"
              style={priceColorStyle(selectedVariant.priceColor, priceColor)}
            >
              {formatTaka(effectivePrice)}
            </span>
            {selectedHasDiscount && (
              <span className="ml-2 text-gray-400 line-through">{formatTaka(selectedVariant.price)}</span>
            )}
            {selectedVariant.showStock && (
              <span className="ml-2 text-gray-500">· {effectiveStock} in stock</span>
            )}
          </>
        ) : (
          <span className="text-gray-500">
            From{" "}
            <span
              className="font-bold text-gray-900"
              style={priceColorStyle(cheapestVariant?.priceColor, priceColor)}
            >
              {formatTaka(effectivePrice)}
            </span>{" "}
            · choose options above
          </span>
        )}
      </p>

      {error && <p className="text-xs font-medium text-red-600">Please choose all options above first.</p>}

      <QtyStepper quantity={quantity} setQuantity={setQuantity} max={maxQty} disabled={allSoldOut} />
      <ActionButtons onAdd={handleAdd} onBuy={handleBuy} disabled={allSoldOut} soldOut={allSoldOut} />
    </div>
  );
}

/* ─────────── legacy: product with no variants ─────────── */
function LegacyPurchase({
  productId,
  slug,
  name,
  unitPrice,
  imageUrl,
  stock,
  quantity,
  setQuantity,
  addItem,
  router,
}: {
  productId: number;
  slug: string;
  name: string;
  unitPrice: number;
  imageUrl: string | null;
  stock: number;
  quantity: number;
  setQuantity: (n: number | ((q: number) => number)) => void;
  addItem: AddItem;
  router: Router;
}) {
  const outOfStock = stock <= 0;

  function addToCart() {
    addItem({ productId, slug, name, unitPrice, imageUrl }, quantity);
    trackAddToCart({ value: (unitPrice * quantity) / 100 });
  }
  function handleAdd() {
    addToCart();
    router.push("/cart");
  }
  function handleBuy() {
    addToCart();
    router.push(`/checkout?buyNow=${productId}`);
  }

  // Nothing to choose on a no-variant product, so the mobile bar can buy
  // straight away whenever there is stock.
  const { publish } = usePurchaseIntent();
  useEffect(() => {
    publish(outOfStock ? null : handleBuy);
    return () => publish(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outOfStock, publish, quantity]);

  return (
    <div className="space-y-4">
      <QtyStepper quantity={quantity} setQuantity={setQuantity} max={Math.max(stock, 1)} disabled={outOfStock} />
      <ActionButtons onAdd={handleAdd} onBuy={handleBuy} disabled={outOfStock} soldOut={outOfStock} />
    </div>
  );
}
