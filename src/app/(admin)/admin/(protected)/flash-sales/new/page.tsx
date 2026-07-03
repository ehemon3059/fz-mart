import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Icon } from "@/components/icons";
import FlashSaleForm from "../FlashSaleForm";

export const metadata = { title: "New Flash Sale — FZ-Mart Admin" };

export default async function NewFlashSalePage() {
  const products = await prisma.product.findMany({
    where: { status: "ACTIVE" },
    select: { id: true, name: true, price: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <Link
        href="/admin/flash-sales"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Back to Flash Sales
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">New Flash Sale</h1>
      <p className="mt-1 text-[14.5px] text-stone-500">
        Set a time window and pick the products to discount.
      </p>

      <div className="mt-6">
        <FlashSaleForm products={products} />
      </div>
    </div>
  );
}
