import Link from "next/link";
import { ArrowRight } from "./icons";
import ProductCard from "./ProductCard";
import type { ProductWithImages } from "@/server/products";

// Titled product row (or grid). Used for New Arrivals, Best Sellers and the
// Featured grid — pass `grid` for the full multi-row layout.
export default function ProductSection({
  title,
  subtitle,
  href = "/products",
  products,
  badge,
  grid = false,
}: {
  title: string;
  subtitle?: string;
  href?: string;
  products: ProductWithImages[];
  badge?: "sale" | "new";
  grid?: boolean;
}) {
  if (products.length === 0) return null;

  return (
    <section className="blk">
      <div className="sec-hd">
        <div className="sh-l">
          <h2>{title}</h2>
          {subtitle && <span className="sh-sub">{subtitle}</span>}
        </div>
        <Link className="viewall" href={href}>
          View all <ArrowRight size={14} />
        </Link>
      </div>

      <div className={grid ? "pgrid" : "prow"}>
        {products.map((p) => (
          <ProductCard key={p.id} product={p} badge={badge} />
        ))}
      </div>
    </section>
  );
}
