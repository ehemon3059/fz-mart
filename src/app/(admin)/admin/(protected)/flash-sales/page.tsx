import Link from "next/link";
import { listAllFlashSales } from "@/server/flash-sales/admin";
import { Icon } from "@/components/icons";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeFlashSale } from "./actions";

export const metadata = { title: "Flash Sales — FZ-Mart Admin" };

function statusOf(sale: { isActive: boolean; startsAt: Date; endsAt: Date }) {
  const now = new Date();
  if (!sale.isActive) return { label: "Inactive", cls: "bg-stone-100 text-stone-500" };
  if (now < sale.startsAt) return { label: "Scheduled", cls: "bg-amber-50 text-amber-600" };
  if (now > sale.endsAt) return { label: "Ended", cls: "bg-stone-100 text-stone-400" };
  return { label: "Live", cls: "bg-emerald-50 text-emerald-600" };
}

function fmt(date: Date) {
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminFlashSalesPage() {
  const flashSales = await listAllFlashSales();

  const now = new Date();
  const live = flashSales.filter((s) => s.isActive && now >= s.startsAt && now <= s.endsAt).length;
  const scheduled = flashSales.filter((s) => s.isActive && now < s.startsAt).length;

  const stats = [
    { label: "Total campaigns", value: flashSales.length, sub: "all time", tone: "neutral" as const },
    { label: "Live now", value: live, sub: "running on storefront", tone: "brand" as const },
    { label: "Scheduled", value: scheduled, sub: "upcoming", tone: "amber" as const },
  ];

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-28 sm:px-7 sm:py-8 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">Flash Sales</h1>
          <p className="mt-1 text-[14.5px] text-stone-500">
            Time-boxed discount campaigns — {flashSales.length} total.
          </p>
        </div>
        <Link
          href="/admin/flash-sales/new"
          className="hidden items-center gap-1.5 rounded-xl bg-brand-600 px-4 py-2.5 text-[14px] font-semibold text-white shadow-sm hover:bg-brand-700 lg:flex"
        >
          <Icon name="plus" size={17} /> New Flash Sale
        </Link>
        <Link
          href="/admin/flash-sales/new"
          aria-label="New Flash Sale"
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm lg:hidden"
        >
          <Icon name="plus" size={20} />
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`rounded-xl border border-stone-200 bg-white p-4 shadow-soft ${
              i === 2 ? "col-span-2 sm:col-span-1" : ""
            }`}
          >
            <p className="text-[12.5px] font-medium text-stone-500">{s.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={[
                  "text-[26px] font-extrabold tracking-tight sm:text-[28px]",
                  s.tone === "brand" ? "text-brand-600" : s.tone === "amber" ? "text-amber-500" : "text-stone-900",
                ].join(" ")}
              >
                {s.value}
              </span>
              <span className="text-[12px] text-stone-400">{s.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* List */}
      <div className="mt-6">
        {flashSales.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-300 bg-white py-16 text-center shadow-soft">
            <p className="text-[15px] font-semibold text-stone-700">No flash sales yet</p>
            <p className="mt-1 text-[13.5px] text-stone-400">
              Create a campaign to run time-limited discounts.
            </p>
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-hidden rounded-xl border border-stone-200 bg-white shadow-soft md:block">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-100 bg-stone-50 text-left">
                    {["Campaign", "Window", "Products", "Status", ""].map((h, i) => (
                      <th key={i} className="px-5 py-3.5 text-[11.5px] font-bold uppercase tracking-wider text-stone-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {flashSales.map((sale) => {
                    const status = statusOf(sale);
                    return (
                      <tr key={sale.id} className="border-b border-stone-100 last:border-0 hover:bg-stone-50/60">
                        <td className="px-5 py-4 text-[14.5px] font-semibold text-stone-900">{sale.name}</td>
                        <td className="px-5 py-4 text-[13.5px] text-stone-500">
                          {fmt(sale.startsAt)} <span className="text-stone-300">&rarr;</span> {fmt(sale.endsAt)}
                        </td>
                        <td className="px-5 py-4 text-[14px] text-stone-600">{sale.products.length}</td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-[12px] font-semibold ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/admin/flash-sales/${sale.id}/edit`}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 hover:bg-stone-100 hover:text-stone-900"
                              aria-label="Edit"
                            >
                              <Icon name="pencil" size={16} />
                            </Link>
                            <DeleteButton action={removeFlashSale} id={sale.id} label="flash sale" />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-4 md:hidden">
              {flashSales.map((sale) => {
                const status = statusOf(sale);
                return (
                  <div key={sale.id} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-[15px] font-semibold text-stone-900">{sale.name}</p>
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-[11.5px] font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-stone-500">
                      {fmt(sale.startsAt)} <span className="text-stone-300">&rarr;</span> {fmt(sale.endsAt)}
                    </p>
                    <p className="mt-1 text-[13px] text-stone-400">{sale.products.length} products</p>
                    <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-3">
                      <Link
                        href={`/admin/flash-sales/${sale.id}/edit`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-200 py-2 text-[13.5px] font-semibold text-stone-700"
                      >
                        <Icon name="pencil" size={15} /> Edit
                      </Link>
                      <DeleteButton action={removeFlashSale} id={sale.id} label="flash sale" />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-stone-200 bg-white p-4 lg:hidden">
        <Link
          href="/admin/flash-sales/new"
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 text-[15px] font-semibold text-white shadow"
        >
          <Icon name="plus" size={19} /> New Flash Sale
        </Link>
      </div>
    </div>
  );
}
