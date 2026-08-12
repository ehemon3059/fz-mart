import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProductBySlug, listRelatedProducts } from "@/server/products";
import { listActiveCategories } from "@/server/categories";
import { ancestorsOf } from "@/server/categories/tree";
import { getRatingSummary } from "@/server/products/reviews";
import { listActiveShippingZones } from "@/server/settings/shipping";
import { resolveSizeGuide } from "@/server/size-guides";
import { SITE_NAME, absoluteUrl, pageTitle, stripHtml, truncate } from "@/lib/seo";
import { productJsonLd, breadcrumbJsonLd } from "@/lib/jsonld";
import { renderMarkdown, markdownToPlainText } from "@/lib/markdown";
import { resolveProductImages, resolvePrimaryImage } from "@/lib/product-images";
import AddToCartPanel from "@/components/storefront/AddToCartPanel";
import ProductGallery from "@/components/storefront/ProductGallery";
import { VariantImageProvider } from "@/components/storefront/product/VariantImageContext";
import ReviewsSection from "@/components/storefront/ReviewsSection";
import Breadcrumb from "@/components/storefront/product/Breadcrumb";
import GalleryBadges from "@/components/storefront/product/GalleryBadges";
import BuyBoxHeader from "@/components/storefront/product/BuyBoxHeader";
import OfferStrip from "@/components/storefront/product/OfferStrip";
import TrustGrid from "@/components/storefront/product/TrustGrid";
import PaymentBadges from "@/components/storefront/product/PaymentBadges";
import ProductTabs from "@/components/storefront/product/ProductTabs";
import ShippingPanel from "@/components/storefront/product/ShippingPanel";
import MobileBuyBar from "@/components/storefront/product/MobileBuyBar";
import ProductSection from "@/components/storefront/ProductSection";
import RecentlyViewed from "@/components/storefront/RecentlyViewed";
import WishlistButton from "@/components/storefront/WishlistButton";
import NotifyBackInStock from "@/components/storefront/NotifyBackInStock";
import JsonLd from "@/components/seo/JsonLd";
import { getCurrentCustomer } from "@/lib/customer-session";
import { isWishlisted } from "@/server/wishlist";
import { trackFunnelEvent } from "@/server/funnel";

function primaryImageOf(product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>): string {
  return resolvePrimaryImage(product) ?? "/placeholder.svg";
}

/** Description used for meta + JSON-LD, with a sensible fallback. */
function metaDescriptionFor(
  product: NonNullable<Awaited<ReturnType<typeof getProductBySlug>>>,
): string {
  if (product.metaDescription) return product.metaDescription;
  // The description is admin-authored Markdown — flatten it before truncating
  // so meta tags never leak `##`, `**` or table pipes.
  if (product.description) return truncate(markdownToPlainText(stripHtml(product.description)));
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

  const [ratingSummary, relatedProducts, customer, allCats, shippingZones, sizeGuide] = await Promise.all([
    getRatingSummary(product.id),
    listRelatedProducts(product.id, product.categoryId),
    getCurrentCustomer(),
    listActiveCategories(),
    listActiveShippingZones(),
    // Product override → nearest ancestor category's guide → none.
    resolveSizeGuide(product.sizeGuideId, product.categoryId),
  ]);

  // Sizing, resolved once here: the product's own label/chart win over the
  // guide's, and the chart is rendered to HTML server-side so the markdown
  // parser stays out of the client bundle and the table ships in the initial
  // HTML where crawlers can read it.
  const sizeLabel = product.sizeLabel?.trim() || sizeGuide?.sizeLabel || null;
  const sizeChartMd = product.sizeChart?.trim() || sizeGuide?.chart || "";
  const sizeChartHtml = sizeChartMd ? renderMarkdown(sizeChartMd) : null;
  const wishlisted = customer ? await isWishlisted(customer.customerId, product.id) : false;

  const primaryImage = primaryImageOf(product);
  // Falls back to the variant/colour photos when no gallery was uploaded, so the
  // first paint shows a real product photo instead of the placeholder.
  const galleryImages = resolveProductImages(product);

  const hasDiscount =
    product.discountPrice != null && product.discountPrice < product.price;
  const effectivePrice = hasDiscount ? product.discountPrice! : product.price;
  const discountPct = hasDiscount
    ? Math.round((1 - product.discountPrice! / product.price) * 100)
    : 0;

  // With sizes/variants, each option has its own price — the header shows a
  // "from" price and the AddToCartPanel handles per-size price & stock.
  const hasVariants = product.variants.length > 0;
  // "From" price is the lowest amount a shopper actually pays — the discounted
  // price where a variant has one. Keep the winning variant, not just its
  // amount: the "from" price is shown in that variant's own colour, so a
  // bare Math.min() would lose the attribution.
  const cheapestVariant = hasVariants
    ? product.variants.reduce((lo, v) =>
        (v.discountPrice ?? v.price) < (lo.discountPrice ?? lo.price) ? v : lo,
      )
    : null;
  const minVariantPrice = cheapestVariant
    ? (cheapestVariant.discountPrice ?? cheapestVariant.price)
    : effectivePrice;
  // Colour for the headline/"from" price: the cheapest variant's own colour
  // when it sets one, else the product's.
  const headlinePriceColor = cheapestVariant?.priceColor ?? product.priceColor;

  const category = product.category;
  // Full ancestor chain (root → … → parent) for the breadcrumb trail.
  const categoryTrail = [...ancestorsOf(category.id, allCats), category];
  const inStock = hasVariants ? product.variants.some((v) => v.stock > 0) : product.stock > 0;

  const structuredData = [
    productJsonLd({
      name: product.name,
      slug: product.slug,
      description: metaDescriptionFor(product),
      images: galleryImages.map((img) => img.url),
      pricePaisa: hasVariants ? minVariantPrice : effectivePrice,
      inStock,
      rating:
        ratingSummary.total > 0
          ? { average: ratingSummary.average, count: ratingSummary.total }
          : null,
    }),
    breadcrumbJsonLd([
      { name: "Home", path: "/" },
      ...categoryTrail.map((c) => ({ name: c.name, path: `/category/${c.slug}` })),
      { name: product.name },
    ]),
  ];

  return (
    <div className="font-manrope mx-auto w-full max-w-[1200px] px-4 py-6 sm:px-5 sm:py-8">
      <JsonLd data={structuredData} />

      <Breadcrumb
        items={[
          ...categoryTrail.map((c) => ({ name: c.name, href: `/category/${c.slug}` })),
          { name: product.name },
        ]}
      />

      {/* Offer strip — full width between the breadcrumb and the hero, and only
          while something on the page IS discounted, so it can never promise a
          deal the price no longer reflects. With variants the discount may
          apply to only some options, hence the .some() rather than the
          product-level flag. */}
      {product.offerText &&
        (hasVariants
          ? product.variants.some((v) => v.discountPrice != null && v.discountPrice < v.price)
          : hasDiscount) && <OfferStrip text={product.offerText} className="mb-6" />}

      {/* ── hero: gallery + buy box ──
          Wrapped so picking an option in the buy box swaps the gallery photo. */}
      <VariantImageProvider>
      <div className="grid gap-6 lg:grid-cols-2 lg:gap-10">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ProductGallery
            images={galleryImages}
            name={product.name}
            overlay={<GalleryBadges discountPct={discountPct} promoBadge={product.promoBadge} />}
          />
        </div>

        {/* id is the reveal anchor + scroll target for the mobile buy bar */}
        <div id="buy-box" className="flex flex-col gap-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <BuyBoxHeader
            name={product.name}
            brandLabel={category.name}
            rating={{ average: ratingSummary.average, total: ratingSummary.total }}
            price={hasVariants ? minVariantPrice : effectivePrice}
            originalPrice={hasDiscount ? product.price : null}
            inStock={inStock}
            isFromPrice={hasVariants}
            priceColor={headlinePriceColor}
          />

          <div className="border-t border-slate-100 pt-5">
            {/* Owns variant selection, quantity, cart store and pixel tracking. */}
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
                discountPrice: v.discountPrice,
                stock: v.stock,
                showStock: v.showStock,
                priceColor: v.priceColor,
                imageUrl: v.imageUrl,
              }))}
              priceColor={product.priceColor}
              sizeLabel={sizeLabel}
              sizeOrder={sizeGuide?.values ?? []}
              sizeChartHtml={sizeChartHtml}
            />
          </div>

          <div className="flex items-center gap-3">
            <WishlistButton productId={product.id} slug={product.slug} initialWishlisted={wishlisted} />
          </div>

          {!inStock && <NotifyBackInStock productId={product.id} />}
        </div>
      </div>
      </VariantImageProvider>

      {/* ── lower section: tabs ── */}
      <ProductTabs
        detailsHtml={product.description ? renderMarkdown(product.description) : ""}
        // Markdown → HTML on the server: keeps the parser out of the client
        // bundle and puts the full text in the initial HTML for crawlers.
        accordionPanels={product.accordionSections.map((s) => ({
          id: s.id,
          title: s.title,
          icon: s.icon,
          contentHtml: renderMarkdown(s.content),
          isOpen: s.isOpen,
        }))}
        reviewCount={ratingSummary.total}
        shipping={
          <ShippingPanel
            zones={shippingZones.map((z) => ({
              name: z.name,
              charge: z.charge,
              eta: /dhaka/i.test(z.name) && !/outside/i.test(z.name) ? "1–2 business days" : "2–4 business days",
              note: "",
            }))}
          />
        }
        reviews={
          <div id="reviews">
            <ReviewsSection productId={product.id} slug={product.slug} />
          </div>
        }
      />

      {/* ── payment + reassurance band, below the tabs ── */}
      <section className="mt-10 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <TrustGrid />
        <PaymentBadges />
      </section>

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
          priceColor: product.priceColor,
          variants: product.variants.map((v) => ({
            price: v.price,
            discountPrice: v.discountPrice,
            priceColor: v.priceColor,
          })),
          images: galleryImages.map((img) => ({ url: img.url, isPrimary: img.isPrimary })),
        }}
      />

      {/* Sticky mobile CTA — appears once the buy box scrolls out of view.
          Extra bottom padding keeps it clear of the global mobile tab bar. */}
      <div className="h-20 md:hidden" aria-hidden />
      <MobileBuyBar
        price={hasVariants ? minVariantPrice : effectivePrice}
        originalPrice={hasDiscount ? product.price : null}
        inStock={inStock}
        isFromPrice={hasVariants}
        priceColor={headlinePriceColor}
        revealAfterId="buy-box"
      />
    </div>
  );
}
