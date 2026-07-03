import Link from "next/link";
import { Icon } from "@/components/icons";

export function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-stone-300 bg-white py-20 text-center shadow-soft">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-100 text-stone-400">
        <Icon name="box" size={32} />
      </div>
      <h3 className="mt-5 text-[17px] font-bold text-stone-800">No products yet</h3>
      <p className="mt-1.5 text-[14px] text-stone-400">Add your first product to start selling.</p>
      <Link
        href="/admin/products/new"
        className="mt-6 flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        <Icon name="plus" size={17} /> New Product
      </Link>
    </div>
  );
}
