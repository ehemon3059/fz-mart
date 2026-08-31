import { notFound } from "next/navigation";
import { getProductById } from "@/server/products/admin";
import { listAllCategories } from "@/server/categories/admin";
import { listStockHistory } from "@/server/inventory";
import { listActiveSizeGuides } from "@/server/size-guides";
import { onHandUnits, variantsCarryStock } from "@/lib/product-stock";
import { getProductListingOverview } from "@/server/inventory/listing";
import ProductForm from "../../ProductForm";
import StockPanel from "./StockPanel";
import ListingPanel from "./ListingPanel";
import SourcingPanel from "./SourcingPanel";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const productId = Number(id);
  const [product, categories, history, sizeGuides, overview] = await Promise.all([
    getProductById(productId),
    listAllCategories(),
    listStockHistory(productId),
    listActiveSizeGuides(),
    getProductListingOverview(productId),
  ]);
  if (!product) notFound();

  // What a customer actually pays today — the discount when one is set. For a
  // product sold by option the product row is only a "from" price, so take the
  // cheapest option instead, which is the figure a shopper first sees.
  const effectivePrice =
    product.variants.length > 0
      ? Math.min(
          ...product.variants.map((v) =>
            v.discountPrice != null && v.discountPrice < v.price ? v.discountPrice : v.price,
          ),
        )
      : product.discountPrice != null && product.discountPrice < product.price
        ? product.discountPrice
        : product.price;

  const DATE = new Intl.DateTimeFormat("en-BD", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Product</h1>
      <ProductForm
        categories={categories}
        product={product}
      sizeGuides={sizeGuides.map((g) => ({
        id: g.id,
        name: g.name,
        sizeLabel: g.sizeLabel,
        chart: g.chart,
        values: g.values.map((v) => v.value),
      }))}
      />

      {/* Matches the form above, which is now full-bleed — a centred column here
          would sit oddly under a full-width form. */}
      <div className="w-full space-y-6 px-5 lg:px-8">
        <SourcingPanel
          productId={product.id}
          sellPrice={effectivePrice}
          purchased={overview.totals.purchased}
          incoming={overview.totals.incoming}
          sourcing={
            overview.sourcing
              ? { ...overview.sourcing, on: DATE.format(overview.sourcing.on) }
              : null
          }
        />

        <ListingPanel productId={product.id} rows={overview.rows} totals={overview.totals} />

        <StockPanel
          productId={product.id}
          currentStock={onHandUnits(product)}
          variantBacked={variantsCarryStock(product)}
          history={history.map((h) => ({
            id: h.id,
            delta: h.delta,
            newStock: h.afterQty,
            type: h.type,
            reason: h.reason,
            actorName: h.actorName,
            createdAt: h.createdAt.toLocaleString("en-BD"),
          }))}
        />
      </div>
    </div>
  );
}
