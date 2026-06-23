import { listActiveCategories } from "@/server/categories";
import { listActiveBanners } from "@/server/banners";
import { listFeaturedProducts } from "@/server/products";
import { getActiveFlashSale } from "@/server/flash-sales";

import Hero from "@/components/storefront/Hero";
import TrustStrip from "@/components/storefront/TrustStrip";
import CategoryTiles from "@/components/storefront/CategoryTiles";
import FlashSale from "@/components/storefront/FlashSale";
import ProductSection from "@/components/storefront/ProductSection";
import Newsletter from "@/components/storefront/Newsletter";

export default async function HomePage() {
  // NOTE: your current server layer only ships `listFeaturedProducts`.
  // For distinct rows, add these alongside it in src/server/products/index.ts
  // (see nextjs/README.md for ready-to-paste queries):
  //   listNewArrivals()      → orderBy createdAt desc
  //   listBestSellers()      → orderBy orderItems _count desc
  // Until then we fan the featured list out so the page renders end-to-end.
  const [categories, banners, featured, flashSale] = await Promise.all([
    listActiveCategories(),
    listActiveBanners(),
    listFeaturedProducts(20),
    getActiveFlashSale(),
  ]);

  const newArrivals = featured.slice(0, 5);
  const bestSellers = featured.slice(5, 10);
  const featuredGrid = featured.slice(0, 10);

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
        products={newArrivals}
        badge="new"
      />
      <ProductSection
        title="Best sellers"
        subtitle="Most loved by FZ Mart shoppers"
        products={bestSellers}
      />
      <ProductSection
        title="Featured products"
        subtitle="Hand-picked for you"
        products={featuredGrid}
        grid
      />
      <Newsletter />
    </>
  );
}
