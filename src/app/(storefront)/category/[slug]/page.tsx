import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug, listActiveCategories } from "@/server/categories";
import { listProductsByCategorySlug } from "@/server/products";
import { ancestorsOf } from "@/server/categories/tree";
import { SITE_NAME, absoluteUrl, pageTitle, truncate } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import ProductCard from "@/components/storefront/ProductCard";
import JsonLd from "@/components/seo/JsonLd";
import { CategoryVisual } from "@/components/storefront/CategoryVisual";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: pageTitle("Category not found") };

  const title = pageTitle(category.metaTitle || category.name);
  const description =
    category.metaDescription ||
    truncate(`Shop ${category.name} at ${SITE_NAME}. Cash on delivery across Bangladesh.`);
  const url = absoluteUrl(`/category/${category.slug}`);

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, type: "website", siteName: SITE_NAME },
    twitter: { card: "summary", title, description },
  };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [category, allCats] = await Promise.all([getCategoryBySlug(slug), listActiveCategories()]);
  if (!category) notFound();

  const products = await listProductsByCategorySlug(slug);
  // Direct child nodes (drill-down chips) and the ancestor chain (breadcrumb).
  const children = allCats.filter((c) => c.parentId === category.id);
  const ancestors = ancestorsOf(category.id, allCats);

  return (
    <div className="space-y-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          ...ancestors.map((a) => ({ name: a.name, path: `/category/${a.slug}` })),
          { name: category.name },
        ])}
      />
      <div>
        {ancestors.length > 0 && (
          <nav className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
            {ancestors.map((a) => (
              <span key={a.id} className="flex items-center gap-1.5">
                <Link href={`/category/${a.slug}`} className="hover:text-gray-800">
                  {a.name}
                </Link>
                <span className="text-gray-300">›</span>
              </span>
            ))}
            <span className="text-gray-700">{category.name}</span>
          </nav>
        )}
        {/* Hero: the category's picture as a large circle with the name below
            it. Falls back to the shared icon/keyword visual so a category with
            no uploaded picture still gets the same round treatment. */}
        <div className="cat-hero">
          <span className="cat-hero-ring">
            <CategoryVisual
              name={category.name}
              slug={category.slug}
              imageUrl={category.imageUrl}
              iconKey={category.iconKey}
              imgClassName="cat-hero-img"
              iconClassName="cat-hero-ic"
              iconSize={104}
            />
          </span>
          <h1 className="cat-hero-title">{category.name}</h1>
          {category.description && (
            <p className="cat-hero-desc">{category.description}</p>
          )}
        </div>
        {/* Sub-categories reuse the round strip from the directory page, so a
            child reads the same here as it does there. */}
        {children.length > 0 && (
          <nav className="cat-circles mt-6" aria-label={`Sub-categories of ${category.name}`}>
            {children.map((sub) => (
              <Link key={sub.id} href={`/category/${sub.slug}`} className="cat-circle">
                <span className="cat-circle-ring">
                  <CategoryVisual
                    name={sub.name}
                    slug={sub.slug}
                    imageUrl={sub.imageUrl}
                    iconKey={sub.iconKey}
                    imgClassName="cat-circle-img"
                    iconClassName="cat-circle-ic"
                    iconSize={56}
                  />
                </span>
                <span className="cat-circle-label">{sub.name}</span>
              </Link>
            ))}
          </nav>
        )}
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">No products in this category yet.</p>
      ) : (
        <div>
          <div className="cat-products-hd">
            <h2>Products</h2>
            <span>
              {products.length} {products.length === 1 ? "item" : "items"}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
