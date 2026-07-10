import { listActiveCategories } from "@/server/categories";
import { listActiveBanners } from "@/server/banners";
import { listFeaturedProducts, listNewArrivals, listBestSellers } from "@/server/products";
import { getActiveFlashSale } from "@/server/flash-sales";
import { getNewsletterCopy } from "@/server/settings/newsletter";

import Hero from "@/components/storefront/Hero";
import TrustStrip from "@/components/storefront/TrustStrip";
import CategoryTiles from "@/components/storefront/CategoryTiles";
import FlashSale from "@/components/storefront/FlashSale";
import ProductSection from "@/components/storefront/ProductSection";
import Newsletter from "@/components/storefront/Newsletter";

export default async function HomePage() {
  const [categories, banners, newArrivals, bestSellers, featuredGrid, flashSale, newsletter] =
    await Promise.all([
      listActiveCategories(),
      listActiveBanners(),
      listNewArrivals(5),
      listBestSellers(5),
      listFeaturedProducts(10),
      getActiveFlashSale(),
      getNewsletterCopy(),
    ]);

  // A campaign's curated picks override discountPrice with their salePrice
  // (when set) so ProductCard renders the time-boxed price without needing
  // its own prop for it.
  const flashProducts =
    flashSale?.products.map(({ product, salePrice }) => ({
      ...product,
      discountPrice: salePrice ?? product.discountPrice,
    })) ?? [];

  return (
    <>
      <Hero banners={banners} />
      <TrustStrip />
      <CategoryTiles categories={categories} />
      {flashSale && (
        <FlashSale
          title={flashSale.name}
          products={flashProducts}
          endsAt={new Date(flashSale.endsAt).toISOString()}
        />
      )}
      <ProductSection
        title="New arrivals"
        subtitle="Fresh picks added this week"
        href="/products"
        products={newArrivals}
        badge="new"
      />
      <ProductSection
        title="Best sellers"
        subtitle="Most loved by FZ Mart shoppers"
        href="/products?sort=bestsellers"
        products={bestSellers}
      />
      <ProductSection
        title="Featured products"
        subtitle="Hand-picked for you"
        href="/products?sort=featured"
        products={featuredGrid}
        grid
      />
      <Newsletter title={newsletter.title} subtitle={newsletter.subtitle} />
    </>
  );
}
