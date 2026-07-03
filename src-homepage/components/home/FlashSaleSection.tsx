import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { ProductCard } from "@/components/ui/ProductCard";
import type { Product } from "@/types/product";

interface FlashSaleSectionProps {
  products: Product[];
}

const flashSaleDate = new Date();
flashSaleDate.setHours(flashSaleDate.getHours() + 4); // 4 hours from now

export function FlashSaleSection({ products }: FlashSaleSectionProps) {
  return (
    <div style={{ marginBottom: "40px" }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: "#e11d48",
          borderRadius: "14px",
          padding: "20px",
          color: "#ffffff",
          marginBottom: "24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "20px",
              fontWeight: "700",
              marginBottom: "4px",
            }}
          >
            ⚡ Flash Sale
          </h2>
          <p style={{ fontSize: "14px", opacity: 0.9 }}>Limited time offers on selected items</p>
        </div>
        <CountdownTimer targetDate={flashSaleDate} />
      </div>

      {/* Products Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
        }}
        className="sm:grid-cols-3 lg:grid-cols-4"
      >
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
