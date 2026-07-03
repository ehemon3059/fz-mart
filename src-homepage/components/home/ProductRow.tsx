import { ProductCard } from "@/components/ui/ProductCard";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import type { Product } from "@/types/product";

interface ProductRowProps {
  title: string;
  products: Product[];
  showRank?: boolean;
  ctaLink?: string;
}

export function ProductRow({ title, products, showRank, ctaLink = "#" }: ProductRowProps) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            fontWeight: "700",
            color: "#23211e",
          }}
        >
          {title}
        </h2>
        <a
          href={ctaLink}
          style={{
            color: "#c026d3",
            textDecoration: "none",
            fontWeight: "600",
            fontSize: "14px",
          }}
        >
          View All →
        </a>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
        }}
        className="sm:grid-cols-3 lg:grid-cols-4"
      >
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product.id} product={product} showRank={showRank} />
        ))}
      </div>
    </div>
  );
}
