import { notFound } from "next/navigation";
import Image from "next/image";
import { getProductBySlug } from "@/server/products";
import { formatTaka } from "@/lib/money";
import AddToCartPanel from "@/components/storefront/AddToCartPanel";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const primaryImage =
    product.images.find((img) => img.isPrimary)?.url ??
    product.images[0]?.url ??
    "/placeholder.svg";

  const hasDiscount =
    product.discountPrice != null && product.discountPrice < product.price;
  const effectivePrice = hasDiscount ? product.discountPrice! : product.price;

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden">
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          className="object-cover"
          priority
        />
        {product.promoBadge && (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-xs px-2 py-1 rounded">
            {product.promoBadge}
          </span>
        )}
      </div>

      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>

        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-semibold text-gray-900">
            {formatTaka(effectivePrice)}
          </span>
          {hasDiscount && (
            <span className="text-lg text-gray-400 line-through">
              {formatTaka(product.price)}
            </span>
          )}
        </div>

        <p className="text-sm">
          {product.stock > 0 ? (
            <span className="text-green-700 font-medium">
              In stock ({product.stock} available)
            </span>
          ) : (
            <span className="text-red-600 font-medium">Out of stock</span>
          )}
        </p>

        {product.description && (
          <p className="text-gray-700 whitespace-pre-line">{product.description}</p>
        )}

        <AddToCartPanel
          productId={product.id}
          slug={product.slug}
          name={product.name}
          unitPrice={effectivePrice}
          imageUrl={primaryImage}
          stock={product.stock}
        />
      </div>
    </div>
  );
}
