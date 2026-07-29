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
      colors={colors}
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
      {/* Buy Now is the primary path and gets the full width — COD is named on
          it because "pay when it arrives" is the single biggest objection
          remover in this market. btn-brand-* are themed via --brand in
          storefront.css so both buttons track the admin brand palette. */}
      <div className="flex flex-col gap-2.5">
        <button
          onClick={onBuy}
          disabled={disabled}
          className="btn-brand-solid flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Banknote size={18} />
          Buy Now — Cash on Delivery
        </button>
        <button
          onClick={onAdd}
          disabled={disabled}
          className="btn-brand-outline flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-[14.5px] font-semibold disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ShoppingCart size={17} />
          Add to Cart
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
  const sizes = useMemo(
    () => [...new Set(variants.map((v) => v.size).filter((s): s is string => !!s))],
    [variants],
  );
  const needColor = colorNames.length > 0;
  const needSize = sizes.length > 0;

  // Color swatches in their defined order, enriched with hex/image where known.
  // A photo uploaded on the variant row itself wins over the shared ProductColor
  // image (which older products still rely on).
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

  return (
    <div className="space-y-4">
      {/* Color family */}
      {needColor && (
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
                    "relative h-12 w-12 overflow-hidden rounded-lg border transition",
                    soldOut ? "cursor-not-allowed opacity-40" : "",
                    selected ? "border-brand-600 ring-2 ring-brand-600 ring-offset-1" : "border-gray-300 hover:border-gray-400",
                  ].join(" ")}
                  style={c.imageUrl ? undefined : { backgroundColor: c.hexCode }}
                >
                  {c.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.imageUrl} alt={c.name} className="h-full w-full object-cover" />
                  )}
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
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            Size:
            {size && <span className="ml-1.5 font-semibold text-gray-900">{size}</span>}
          </p>
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
                    "min-w-[3rem] rounded-lg border px-4 py-2 text-sm font-semibold transition",
                    disabled
                      ? "cursor-not-allowed border-gray-200 bg-gray-50 text-gray-300" + (soldOut ? " line-through" : "")
                      : selected
                        ? "border-brand-600 bg-brand-50 text-brand-700 ring-1 ring-brand-600"
                        : "border-gray-300 text-gray-700 hover:border-gray-400",
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

/* ─────────── legacy: product with no variants (optional plain colours) ─────────── */
function LegacyPurchase({
  productId,
  slug,
  name,
  unitPrice,
  imageUrl,
  stock,
  colors,
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
  colors: ColorOption[];
  quantity: number;
  setQuantity: (n: number | ((q: number) => number)) => void;
  addItem: AddItem;
  router: Router;
}) {
  const [colorId, setColorId] = useState<number | null>(null);
  const [colorError, setColorError] = useState(false);
  const outOfStock = stock <= 0;
  const needsColor = colors.length > 0;
  const selectedColor = colors.find((c) => c.id === colorId) ?? null;

  // Show the picked colour's photo in the gallery on the left.
  const { setUrl: setGalleryImage } = useVariantImage();
  useEffect(() => {
    setGalleryImage(selectedColor?.imageUrl ?? null);
  }, [selectedColor, setGalleryImage]);

  function ensureReady(): boolean {
    if (needsColor && !selectedColor) {
      setColorError(true);
      return false;
    }
    return true;
  }
  function addToCart() {
    const displayName = selectedColor ? `${name} — ${selectedColor.name}` : name;
    addItem({ productId, slug, name: displayName, unitPrice, imageUrl }, quantity);
    trackAddToCart({ value: (unitPrice * quantity) / 100 });
  }
  function handleAdd() {
    if (!ensureReady()) return;
    addToCart();
    router.push("/cart");
  }
  function handleBuy() {
    if (!ensureReady()) return;
    addToCart();
    router.push(`/checkout?buyNow=${productId}`);
  }

  return (
    <div className="space-y-4">
      {needsColor && (
        <div>
          <p className="mb-1.5 text-sm font-medium text-gray-700">
            Available Color:
            {selectedColor && <span className="ml-1.5 font-semibold text-gray-900">{selectedColor.name}</span>}
          </p>
          <div className="flex flex-wrap gap-2.5">
            {colors.map((color) => {
              const selected = color.id === colorId;
              return (
                <button
                  key={color.id}
                  type="button"
                  title={color.name}
                  aria-label={color.name}
                  aria-pressed={selected}
                  onClick={() => {
                    setColorId(color.id);
                    setColorError(false);
                  }}
                  className={[
                    "relative flex items-center justify-center overflow-hidden transition",
                    // A photo needs room to read; a plain hex chip stays compact.
                    color.imageUrl ? "h-12 w-12 rounded-lg" : "h-8 w-8 rounded-full",
                    selected ? "ring-2 ring-brand-600 ring-offset-2" : "ring-1 ring-gray-300 hover:ring-gray-400",
                  ].join(" ")}
                  style={color.imageUrl ? undefined : { backgroundColor: color.hexCode }}
                >
                  {color.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={color.imageUrl} alt={color.name} className="h-full w-full object-cover" />
                  )}
                  {selected && (
                    <Icon
                      name="check"
                      size={15}
                      strokeWidth={3}
                      className="absolute text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                    />
                  )}
                </button>
              );
            })}
          </div>
          {colorError && <p className="mt-1.5 text-xs font-medium text-red-600">Please select a color first.</p>}
        </div>
      )}

      <QtyStepper quantity={quantity} setQuantity={setQuantity} max={Math.max(stock, 1)} disabled={outOfStock} />
      <ActionButtons onAdd={handleAdd} onBuy={handleBuy} disabled={outOfStock} soldOut={outOfStock} />
    </div>
  );
}
