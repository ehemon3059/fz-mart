import Link from "next/link";
import { listProducts, type ProductSort } from "@/server/products";
import ProductCard from "@/components/storefront/ProductCard";

const TABS: { key: ProductSort; label: string }[] = [
  { key: "new", label: "New arrivals" },
  { key: "bestsellers", label: "Best sellers" },
  { key: "featured", label: "Featured" },
];

const TITLES: Record<ProductSort, string> = {
  new: "New arrivals",
  bestsellers: "Best sellers",
  featured: "Featured products",
};

function isProductSort(value: string | undefined): value is ProductSort {
  return value === "new" || value === "bestsellers" || value === "featured";
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string }>;
}) {
  const { sort: rawSort } = await searchParams;
  const sort: ProductSort = isProductSort(rawSort) ? rawSort : "new";
  const products = await listProducts(sort);

  return (
    <div className="prod-page">
      <div className="prod-hd">
        <div>
          <span className="eyebrow">Browse the shop</span>
          <h1>{TITLES[sort]}</h1>
          {products.length > 0 && (
            <span className="prod-count">
              {products.length} {products.length === 1 ? "product" : "products"}
            </span>
          )}
        </div>
        <Link href="/search" className="clear-link">
          Search &amp; filter
        </Link>
      </div>

      <div className="prod-tabs">
        {TABS.map((tab) => (
          <Link
            key={tab.key}
            href={tab.key === "new" ? "/products" : `/products?sort=${tab.key}`}
            className={`prod-tab${sort === tab.key ? " on" : ""}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {products.length === 0 ? (
        <p style={{ color: "var(--ink-mute)" }}>No products to show yet.</p>
      ) : (
        <div className="pgrid">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
