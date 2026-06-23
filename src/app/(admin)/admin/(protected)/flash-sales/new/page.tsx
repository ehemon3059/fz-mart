import { prisma } from "@/lib/prisma";
import FlashSaleForm from "../FlashSaleForm";

export default async function NewFlashSalePage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, price: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">New Flash Sale</h1>
      <FlashSaleForm products={products} />
    </div>
  );
}
