import Link from "next/link";
import { listAllProducts } from "@/server/products/admin";
import { Icon } from "@/components/icons";
import { StatsStrip } from "@/components/admin/products/StatsStrip";
import { ProductsListClient } from "@/components/admin/products/ProductsListClient";

export const metadata = { title: "Products — FZ-Mart Admin" };

export default async function AdminProductsPage() {
  const products = await listAllProducts();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-7 py-8 pb-28 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">Products</h1>
          <p className="mt-1 text-[14.5px] text-stone-500">
            Manage your store&apos;s catalog — {products.length} products total.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 lg:flex"
        >
          <Icon name="plus" size={17} /> New Product
        </Link>
        <Link
          href="/admin/products/new"
          aria-label="New Product"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm lg:hidden"
        >
          <Icon name="plus" size={20} />
        </Link>
      </div>

      <div className="mt-6">
        <StatsStrip products={products} />
      </div>

      <div className="mt-6">
        <ProductsListClient initialProducts={products} />
      </div>
    </div>
  );
}
