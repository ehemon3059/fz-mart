import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, listRelatedProducts } from "@/server/products";
import { getRatingSummary } from "@/server/products/reviews";
import { formatTaka } from "@/lib/money";
import { SITE_NAME, absoluteUrl, pageTitle, stripHtml, truncate } from "@/lib/seo";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import AddToCartPanel from "@/components/storefront/AddToCartPanel";
import ProductGallery from "@/components/storefront/ProductGallery";
import StarRating from "@/components/storefront/StarRating";
import ReviewsSection from "@/components/storefront/ReviewsSection";
import ProductSection from "@/components/storefront/ProductSection";
import RecentlyViewed from "@/components/storefront/RecentlyViewed";
import WishlistButton from "@/components/storefront/WishlistButton";
import NotifyBackInStock from "@/components/storefront/NotifyBackInStock";
import JsonLd from "@/components/seo/JsonLd";
import { getCurrentCustomer } from "@/lib/customer-session";
import { isWishlisted } from "@/server/wishlist";
import { trackFunnelEvent } from "@/server/funnel";

function primaryImageOf(product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>): string {
  return (
    product.images.find((img) => img.isPrimary)?.url ??
    product.images[0]?.url ??
    "/placeholder.svg"
  );
}

/** Description used for meta + JSON-LD, with a sensible fallback. */
function metaDescriptionFor(
  product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>,
): string {
  if (product.metaDescription) return product.metaDescription;
  if (product.description) return truncate(stripHtml(product.description));
  return truncate(`Buy ${product.name} at ${SITE_NAME}. Cash on delivery available across Bangladesh.`);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: pageTitle("Product not found") };

  const title = pageTitle(product.metaTitle || product.name);
  const description = metaDescriptionFor(product);
  const url = absoluteUrl(`/products/${product.slug}`);
  const image = absoluteUrl(primaryImageOf(product));

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: "website",
      siteName: SITE_NAME,
      images: [{ url: image }],
    },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  // Funnel: record a product view (fire-and-forget, debounced to once per
  // session/product/day so refreshes don't inflate it). Bots and blocked IPs
  // are filtered inside trackFunnelEvent.
  trackFunnelEvent("PRODUCT_VIEW", { productId: product.id, dedupeSeconds: 86400 });

  const [ratingSummary, relatedProducts, customer] = await Promise.all([
    getRatingSummary(product.id),
    listRelatedProducts(product.id, product.subcategoryId),
    getCurrentCustomer(),
  ]);
  const wishlisted = customer ? await isWishlisted(customer.customerId, product.id) : false;

  const primaryImage = primaryImageOf(product);

  const hasDiscount =
    product.discountPrice != null && product.discountPrice < product.price;
  const effectivePrice = hasDiscount ? product.discountPrice! : product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.discountPrice! / product.price) * 100)
    : 0;

  // With sizes/variants, each option has its own price — the header shows a
  // "from" price and the AddToCartPanel handles per-size price & stock.
  const hasVariants = product.variants.length > 0;
  const minVariantPrice = hasVariants
    ? Math.min(...product.variants.map((v) => v.price))
    : effectivePrice;

  const category = product.subcategory.category;
  const inStock = hasVariants ? product.variants.some((v) => v.stock > 0) : product.stock > 0;

  const structuredData = [
    productJsonLd({
      name: product.name,
      slug: product.slug,
      description: metaDescriptionFor(product),
      images: product.images.map((img) => img.url),
      pricePaisa: hasVariants ? minVariantPrice : effectivePrice,
      inStock,
      rating:
        ratingSummary.total > 0
          ? { average: ratingSummary.average, count: ratingSummary.total }
          : null,
    }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      { name: category.name, path: `/category/${category.slug}` },
      { name: product.name },
    ]),
  ];

  return (
    <div className="font-manrope mx-auto w-full max-w-[1200px] px-5 py-8">
      <JsonLd data={structuredData} />
      <div className="grid md:grid-cols-2 gap-8">
        <ProductGallery images={product.images} name={product.name} promoBadge={product.promoBadge} />

        <div className="space-y-4">
          <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

          <div className="flex items-baseline gap-3">
            {hasVariants ? (
              <>
                <span className="text-2xl font-semibold text-gray-900">
                  From {formatTaka(minVariantPrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      {formatTaka(product.price)}
                    </span>
                    <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
                      {discountPct}% Disc
                    </span>
                  </>
                )}
              </>
            ) : (
              <>
                <span className="text-2xl font-semibold text-gray-900">
                  {formatTaka(effectivePrice)}
                </span>
                {hasDiscount && (
                  <>
                    <span className="text-lg text-gray-400 line-through">
                      {formatTaka(product.price)}
                    </span>
                    <span className="rounded-full bg-green-700 px-2 py-0.5 text-xs font-semibold text-white">
                      {discountPct}% Disc
                    </span>
                  </>
                )}
              </>
            )}
          </div>

          {ratingSummary.total > 0 && (
            <div className="flex items-center gap-2">
              <StarRating rating={ratingSummary.average} />
              <span className="text-sm text-gray-500">
                ({ratingSummary.average.toFixed(1)}) {ratingSummary.total} Reviews
              </span>
            </div>
          )}

          {!hasVariants && (
            <p className="text-sm">
              {product.stock > 0 ? (
                <span className="text-green-700 font-medium">
                  In stock ({product.stock} available)
                </span>
              ) : (
                <span className="text-red-600 font-medium">Out of stock</span>
              )}
            </p>
          )}

          {product.description && (
            <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
          )}

          {product.specifications.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900">Specification</h3>
              <dl className="mt-2 divide-y divide-gray-100 text-sm">
                {product.specifications.map((spec) => (
                  <div key={spec.id} className="flex justify-between py-1.5">
                    <dt className="text-gray-500">{spec.label}</dt>
                    <dd className="font-medium text-gray-800">{spec.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          )}

          {product.features.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900">Feature</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                {product.features.map((feature) => (
                  <li key={feature.id}>{feature.text}</li>
                ))}
              </ul>
            </div>
          )}

          <AddToCartPanel
            productId={product.id}
            slug={product.slug}
            name={product.name}
            unitPrice={effectivePrice}
            imageUrl={primaryImage}
            stock={product.stock}
            colors={product.colors.map((c) => ({
              id: c.id,
              name: c.name,
              hexCode: c.hexCode,
              imageUrl: c.imageUrl,
            }))}
            variants={product.variants.map((v) => ({
              id: v.id,
              size: v.size,
              colorName: v.colorName,
              price: v.price,
              stock: v.stock,
            }))}
          />

          <div className="pt-2">
            <WishlistButton productId={product.id} slug={product.slug} initialWishlisted={wishlisted} />
          </div>

          {!inStock && <NotifyBackInStock productId={product.id} />}
        </div>
      </div>

      <ReviewsSection productId={product.id} slug={product.slug} />

      <div className="mt-12">
        <ProductSection title="Recommended for you" products={relatedProducts} />
      </div>

      {/* Records this product and renders the shopper's earlier views —
          entirely client-side from localStorage. */}
      <RecentlyViewed
        current={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          price: product.price,
          discountPrice: product.discountPrice,
          stock: hasVariants ? (inStock ? 1 : 0) : product.stock,
          promoBadge: product.promoBadge,
          images: product.images.map((img) => ({ url: img.url, isPrimary: img.isPrimary })),
        }}
      />
    </div>
  );
}
