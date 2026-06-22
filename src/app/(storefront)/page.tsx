import Image from "next/image";
import Link from "next/link";
import { listActiveBanners } from "@/server/banners";
import { listFeaturedProducts } from "@/server/products";
import ProductCard from "@/components/storefront/ProductCard";

export default async function HomePage() {
  const [banners, featured] = await Promise.all([
    listActiveBanners(),
    listFeaturedProducts(),
  ]);

  return (
    <div className="space-y-10">
      {banners.length > 0 && (
        <section className="rounded-lg overflow-hidden">
          {banners.map((banner) => {
            const image = (
              <div key={banner.id} className="relative w-full aspect-[16/6] bg-gray-200">
                <Image
                  src={banner.imageUrl}
                  alt="Promotional banner"
                  fill
                  className="object-cover"
                  priority
                />
              </div>
            );
            return banner.link ? (
              <Link key={banner.id} href={banner.link}>
                {image}
              </Link>
            ) : (
              image
            );
          })}
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Featured Products
        </h2>
        {featured.length === 0 ? (
          <p className="text-gray-500">No featured products yet.</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
