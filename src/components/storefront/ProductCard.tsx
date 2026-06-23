import Image from "next/image";
import Link from "next/link";
import { formatTaka } from "@/lib/money";
import type { ProductWithImages } from "@/server/products";
import { HeartIcon } from "./icons";

type Badge = "sale" | "new";

export default function ProductCard({
  product,
  badge,
}: {
  product: ProductWithImages;
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

  return (
    <Link className="card" href={`/products/${product.slug}`}>
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
            <span className="now">{formatTaka(price)}</span>
            {hasDiscount && <span className="was">{formatTaka(product.price)}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
