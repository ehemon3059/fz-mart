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
        <div className="flex items-start gap-4">
          {category.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={category.imageUrl}
              alt={category.name}
              className="h-16 w-16 shrink-0 rounded-xl border border-gray-200 object-cover sm:h-20 sm:w-20"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900">{category.name}</h1>
            {category.description && (
              <p className="mt-1 text-sm text-gray-600 whitespace-pre-line">{category.description}</p>
            )}
          </div>
        </div>
        {category.subcategories.length > 0 && (
          <div className="mt-4 flex gap-3 flex-wrap text-sm">
            {category.subcategories.map((sub) => (
              <Link
                key={sub.id}
                href={`/category/${category.slug}#${sub.slug}`}
                className="flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-gray-700 hover:border-black"
              >
                {sub.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={sub.imageUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span className="h-6 w-6" />
                )}
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
