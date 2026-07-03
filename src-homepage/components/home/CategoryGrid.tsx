import type { Category } from "@/types/product";

interface CategoryGridProps {
  categories: Category[];
}

export function CategoryGrid({ categories }: CategoryGridProps) {
  return (
    <div style={{ marginBottom: "40px" }}>
      <h2
        style={{
          fontSize: "20px",
          fontWeight: "700",
          color: "#23211e",
          marginBottom: "20px",
        }}
      >
        Shop by Category
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
        }}
        className="sm:grid-cols-4 lg:grid-cols-8"
      >
        {categories.map((cat) => (
          <a
            key={cat.id}
            href={`#category/${cat.slug}`}
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #ecebe8",
              borderRadius: "14px",
              padding: "16px 12px",
              textAlign: "center",
              textDecoration: "none",
              transition: "box-shadow 0.2s, border-color 0.2s",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#c026d3";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(192, 38, 211, 0.1)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#ecebe8";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            <div style={{ fontSize: "28px" }}>{cat.icon}</div>
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: "#23211e",
                lineHeight: "1.2",
              }}
            >
              {cat.name}
            </span>
          </a>
        ))}
      </div>
    </div>
  );
}
