import Image from "next/image";
import Link from "next/link";
import { formatTaka } from "@/lib/money";
import type { ProductWithImages } from "@/server/products";

export default function ProductCard({ product }: { product: ProductWithImages }) {
  const primaryImage =
    product.images.find((img) => img.isPrimary)?.url ??
    product.images[0]?.url ??
    "/placeholder.svg";

  const hasDiscount =
    product.discountPrice != null && product.discountPrice < product.price;
  const outOfStock = product.stock <= 0;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group block border rounded-lg bg-white overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="relative aspect-square bg-gray-100">
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        {product.promoBadge && (
          <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
            {product.promoBadge}
          </span>
        )}
        {outOfStock && (
          <span className="absolute inset-0 bg-white/70 flex items-center justify-center text-sm font-semibold text-gray-700">
            Out of Stock
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:underline">
          {product.name}
        </h3>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-base font-semibold text-gray-900">
            {formatTaka(hasDiscount ? product.discountPrice! : product.price)}
          </span>
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatTaka(product.price)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
