import Image from "next/image";
import Link from "next/link";
import Price from "./Price";
import CardAddButton from "./CardAddButton";
import { HeartIcon, ArrowRight } from "./icons";
import { priceColorStyle } from "@/lib/money";
import { resolvePrimaryImage } from "@/lib/product-images";

type Badge = "sale" | "new";

// Structural subset every card needs — satisfied by both the full catalog
// product (ProductWithImages) and the leaner search result (ProductSearchCard).
export interface ProductCardData {
  id: number;
  slug: string;
  name: string;
  price: number;
  discountPrice: number | null;
  stock: number;
  promoBadge: string | null;
  images: { url: string; isPrimary: boolean }[];
  /**
   * Admin-chosen colour for the price text (#rrggbb). Optional so leaner data
   * sources that don't select it simply fall back to the default styling.
   */
  priceColor?: string | null;
  /**
   * Variant pricing, when the source loads it. A variant product's card shows
   * the lowest variant price as a "from" price, in that variant's colour.
   * Omitted by leaner sources (search, wishlist), which fall back to the
   * product's own price and colour.
   */
  variants?: {
    price: number;
    discountPrice: number | null;
    priceColor?: string | null;
    /** Per-option photo; used as the thumbnail when there is no gallery. */
    imageUrl?: string | null;
  }[];
  /** Colour swatch photos — another thumbnail fallback for a gallery-less product. */
  colors?: { imageUrl?: string | null }[];
  /**
   * When the shopper must pick a size/color/variant first, the card links to
   * the detail page instead of quick-adding. Omitted for leaner data sources
   * (e.g. search) — treated as no required choice.
   */
  _count?: { variants: number; colors: number };
}

export default function ProductCard({
  product,
  badge,
}: {
  product: ProductCardData;
  /** Optional corner ribbon. Falls back to the product's own promoBadge. */
  badge?: Badge;
}) {
  const primaryImage = resolvePrimaryImage(product);

  const hasDiscount =
    product.discountPrice != null && product.discountPrice < product.price;

  // Variant products are priced by their rows, so the card shows the cheapest
  // one as a "from" price — matching the product page. A product-level discount
  // (e.g. a flash-sale override) still wins, since that's the campaign price
  // the shopper is being promised.
  const cheapestVariant =
    !hasDiscount && product.variants?.length
      ? product.variants.reduce((lo, v) =>
          (v.discountPrice ?? v.price) < (lo.discountPrice ?? lo.price) ? v : lo,
        )
      : null;
  const isFromPrice = cheapestVariant != null;

  const price = hasDiscount
    ? product.discountPrice!
    : cheapestVariant
      ? (cheapestVariant.discountPrice ?? cheapestVariant.price)
      : product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.discountPrice! / product.price) * 100)
    : 0;
  // The cheapest variant's colour wins for a "from" price; else the product's.
  const priceStyle = priceColorStyle(cheapestVariant?.priceColor, product.priceColor);
  const outOfStock = product.stock <= 0;
  // A required size/color/variant choice can't be made from a card, so those
  // products link to the detail page instead of quick-adding.
  const needsChoice =
    (product._count?.variants ?? 0) > 0 || (product._count?.colors ?? 0) > 0;
  const href = `/products/${product.slug}`;

  return (
    <div className="card">
      <Link className="c-link" href={href}>
        <div className="c-img">
          {badge === "sale" && <span className="badge sale">SALE</span>}
          {badge === "new" && <span className="badge new">NEW</span>}
          {!badge && product.promoBadge && (
            <span className="badge promo">{product.promoBadge}</span>
          )}
          {hasDiscount && <span className="disc-pill">-{discountPct}%</span>}

          {primaryImage ? (
            <Image
              src={primaryImage}
              alt={product.name}
              fill
              sizes="(max-width: 760px) 50vw, 20vw"
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className="ph">
              <span className="ph-lbl">product</span>
            </div>
          )}

          {outOfStock && <div className="c-oos-overlay">Out of stock</div>}
          <span className="wish" aria-hidden>
            <HeartIcon size={16} />
          </span>
        </div>

        <div className="c-body">
          <div className="c-name">{product.name}</div>
          {outOfStock ? (
            <div className="c-oos">Out of stock</div>
          ) : (
            <div className="c-price">
              {isFromPrice && <span className="from">From</span>}
              <Price paisa={price} className="now" style={priceStyle} />
              {hasDiscount && <Price paisa={product.price} className="was" />}
            </div>
          )}
        </div>
      </Link>

      <div className="c-foot">
        {outOfStock ? (
          <button type="button" className="c-add" disabled>
            Out of stock
          </button>
        ) : needsChoice ? (
          <Link href={href} className="c-add c-view">
            View Details
            <ArrowRight size={16} />
          </Link>
        ) : (
          <CardAddButton
            productId={product.id}
            slug={product.slug}
            name={product.name}
            unitPrice={price}
            imageUrl={primaryImage}
          />
        )}
      </div>
    </div>
  );
}
