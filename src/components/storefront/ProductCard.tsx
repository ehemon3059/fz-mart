import Image from "next/image";
import Link from "next/link";
import Price from "./Price";
import CardAddButton from "./CardAddButton";
import { HeartIcon, ArrowRight } from "./icons";

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
  const primaryImage =
    product.images.find((img) => img.isPrimary)?.url ??
    product.images[0]?.url ??
    null;

  const hasDiscount =
    product.discountPrice != null && product.discountPrice < product.price;
  const price = hasDiscount ? product.discountPrice! : product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.discountPrice! / product.price) * 100)
    : 0;
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
              <Price paisa={price} className="now" />
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
