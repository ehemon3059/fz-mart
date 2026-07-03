import Link from "next/link";
import { listActiveCategories } from "@/server/categories";
import { CategoryIcon, categoryVisual } from "@/components/storefront/icons";

// "All categories" destination — the full department directory. Each category
// lists its subcategories so shoppers can drill down: category → subcategory
// (anchored on the category page) → products.
export default async function AllCategoriesPage() {
  const categories = await listActiveCategories();

  return (
    <div className="cat-dir">
      <div className="cat-dir-hd">
        <span className="eyebrow">Shop by department</span>
        <h1>All categories</h1>
        <p>Browse every department and drill down into its subcategories.</p>
      </div>

      {categories.length === 0 ? (
        <p style={{ textAlign: "center", color: "var(--ink-mute)" }}>
          No categories to show yet.
        </p>
      ) : (
        <div className="cat-grid">
          {categories.map((cat, i) => {
            const v = categoryVisual(cat.name);
            const subCount = cat.subcategories.length;
            return (
              <div
                key={cat.id}
                className="cat-c"
                style={{ animationDelay: `${Math.min(i * 60, 480)}ms` }}
              >
                <Link href={`/category/${cat.slug}`} className="cat-c-top">
                  <span
                    className="cat-c-ic"
                    style={{ "--ct-bg": v.bg, "--ct-fg": v.fg } as React.CSSProperties}
                  >
                    <CategoryIcon name={cat.name} />
                  </span>
                  <span>
                    <b>{cat.name}</b>
                    <span className="cat-c-count">
                      {subCount > 0
                        ? `${subCount} ${subCount === 1 ? "subcategory" : "subcategories"}`
                        : "View products"}
                    </span>
                  </span>
                </Link>

                {subCount > 0 && (
                  <ul className="cat-c-subs">
                    {cat.subcategories.map((sub) => (
                      <li key={sub.id}>
                        <Link href={`/category/${cat.slug}#${sub.slug}`}>{sub.name}</Link>
                      </li>
                    ))}
                  </ul>
                )}

                <Link href={`/category/${cat.slug}`} className="cat-c-more">
                  Browse category
                  <svg
                    className="arw"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
