import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getCategoryBySlug } from "@/server/categories";
import { listProductsByCategorySlug } from "@/server/products";
import { SITE_NAME, absoluteUrl, pageTitle, truncate } from "@/lib/seo";
import { breadcrumbJsonLd } from "@/lib/jsonld";
import ProductCard from "@/components/storefront/ProductCard";
import JsonLd from "@/components/seo/JsonLd";

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
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const products = await listProductsByCategorySlug(slug);

  return (
    <div className="space-y-6">
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: category.name },
        ])}
      />
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
        {category.subcategories.length > 0 && (
          <div className="mt-3 flex gap-3 flex-wrap text-sm">
            {category.subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/category/${category.slug}#${sub.slug}`}
                className="px-3 py-1 rounded-full border text-gray-700 hover:border-black"
              >
                {sub.name}
              </Link>
            ))}
          </div>
        )}
      </div>

      {products.length === 0 ? (
        <p className="text-gray-500">No products in this category yet.</p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
