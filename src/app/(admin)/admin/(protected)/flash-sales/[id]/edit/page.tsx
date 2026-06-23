import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getFlashSaleById } from "@/server/flash-sales/admin";
import FlashSaleForm from "../../FlashSaleForm";

export default async function EditFlashSalePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [flashSale, products] = await Promise.all([
    getFlashSaleById(Number(id)),
    prisma.product.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, name: true, price: true },
      orderBy: { name: "asc" },
    }),
  ]);
  if (!flashSale) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Edit Flash Sale</h1>
      <FlashSaleForm
        products={products}
        flashSale={{
          id: flashSale.id,
          name: flashSale.name,
          startsAt: flashSale.startsAt,
          endsAt: flashSale.endsAt,
          isActive: flashSale.isActive,
          products: flashSale.products.map((p) => ({
            productId: p.productId,
            salePrice: p.salePrice,
          })),
        }}
      />
    </div>
  );
}
