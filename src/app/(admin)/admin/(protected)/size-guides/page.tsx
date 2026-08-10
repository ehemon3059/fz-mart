import Link from "next/link";
import { Icon } from "@/components/icons";
import { listSizeGuides } from "@/server/size-guides/admin";
import SizeGuidesClient from "./SizeGuidesClient";

export const metadata = { title: "Size Guides — FZ-Mart Admin" };

export default async function AdminSizeGuidesPage() {
  const guides = await listSizeGuides();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-7 py-8 pb-24 lg:pb-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">Size Guides</h1>
          <p className="mt-1 text-[14.5px] text-stone-500">
            Reusable size sets — the chips shoppers pick from, what to call them, and the size chart behind them.
          </p>
        </div>
        <Link
          href="/admin/size-guides/new"
          className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[13.5px] font-semibold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Icon name="plus" size={15} /> New size guide
        </Link>
      </div>

      <SizeGuidesClient
        guides={guides.map((g) => ({
          id: g.id,
          name: g.name,
          sizeLabel: g.sizeLabel,
          hasChart: !!g.chart?.trim(),
          isActive: g.isActive,
          values: g.values.map((v) => v.value),
          categoryCount: g._count.categories,
          productCount: g._count.products,
        }))}
      />
    </div>
  );
}
