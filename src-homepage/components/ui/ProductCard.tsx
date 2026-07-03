import Link from "next/link";
import { StarIcon, ShoppingCartIcon } from "@/components/icons";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  showRank?: boolean;
}

export function ProductCard({ product, showRank }: ProductCardProps) {
  return (
    <div
      style={{
        backgroundColor: "#ffffff",
        borderRadius: "14px",
        border: "1px solid #ecebe8",
        overflow: "hidden",
        transition: "box-shadow 0.2s, transform 0.2s",
      }}
      className="hover:shadow-md"
    >
      {/* Image Container */}
      <div
        style={{
          position: "relative",
          width: "100%",
          paddingBottom: "100%",
          backgroundColor: "#f5f5f4",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "#e5e5e4",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "12px",
            color: "#a8a8a6",
          }}
        >
          {product.name.slice(0, 15)}...
        </div>

        {/* Rank Badge (Best Sellers) */}
        {showRank && product.rank && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              left: "8px",
              backgroundColor: "#c026d3",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "700",
              zIndex: 2,
            }}
          >
            #{product.rank}
          </div>
        )}

        {/* Discount Badge */}
        {product.discount > 0 && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              backgroundColor: "#e11d48",
              color: "#ffffff",
              padding: "4px 10px",
              borderRadius: "12px",
              fontSize: "12px",
              fontWeight: "700",
              zIndex: 2,
            }}
          >
            -{product.discount}%
          </div>
        )}
      </div>

      {/* Content */}
      <div style={{ padding: "12px" }}>
        <h3
          style={{
            fontSize: "13px",
            fontWeight: "600",
            color: "#23211e",
            marginBottom: "8px",
            lineHeight: "1.3",
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {product.name}
        </h3>

        {/* Rating */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "8px" }}>
          <div style={{ display: "flex", gap: "2px" }}>
            <StarIcon size={14} style={{ color: "#c026d3" }} />
          </div>
          <span style={{ fontSize: "11px", color: "#5c5852" }}>
            {product.rating} ({product.reviews})
          </span>
        </div>

        {/* Price */}
        <div style={{ marginBottom: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: "700", color: "#23211e" }}>
            ৳{product.discountPrice.toLocaleString()}
          </div>
          {product.discount > 0 && (
            <div
              style={{
                fontSize: "12px",
                color: "#5c5852",
                textDecoration: "line-through",
              }}
            >
              ৳{product.price.toLocaleString()}
            </div>
          )}
        </div>

        {/* CTA Button */}
        <button
          style={{
            width: "100%",
            padding: "10px",
            backgroundColor: "#c026d3",
            color: "#ffffff",
            border: "none",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            transition: "background-color 0.2s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#a21caf";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#c026d3";
          }}
        >
          <ShoppingCartIcon size={16} />
          Add to Cart
        </button>
      </div>
    </div>
  );
}
