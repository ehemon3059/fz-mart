import Link from "next/link";
import { listCoupons } from "@/server/coupons/admin";
import { formatTaka } from "@/lib/money";
import CouponRow from "./CouponRow";

export const metadata = { title: "Coupons — FZ-Mart Admin" };

function statusOf(c: { isActive: boolean; startsAt: Date | null; endsAt: Date | null }) {
  const now = new Date();
  if (!c.isActive) return { label: "Inactive", cls: "bg-stone-200 text-stone-600" };
  if (c.startsAt && c.startsAt > now) return { label: "Scheduled", cls: "bg-amber-100 text-amber-700" };
  if (c.endsAt && c.endsAt < now) return { label: "Expired", cls: "bg-red-100 text-red-700" };
  return { label: "Active", cls: "bg-green-100 text-green-700" };
}

export default async function CouponsPage() {
  const coupons = await listCoupons();

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coupons</h1>
          <p className="mt-1 text-sm text-gray-500">Discount codes applied at checkout.</p>
        </div>
        <Link href="/admin/coupons/new" className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
          New coupon
        </Link>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-[12px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Discount</th>
              <th className="px-4 py-3">Used</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {coupons.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-stone-400">
                  No coupons yet.
                </td>
              </tr>
            ) : (
              coupons.map((c) => {
                const value =
                  c.type === "PERCENT"
                    ? `${c.value}% off${c.maxDiscount ? ` (max ${formatTaka(c.maxDiscount)})` : ""}`
                    : `${formatTaka(c.value)} off`;
                const min = c.minOrder > 0 ? ` · min ${formatTaka(c.minOrder)}` : "";
                const scope =
                  c.appliesTo === "CATEGORY"
                    ? ` · category: ${c.category?.name ?? "—"}`
                    : c.appliesTo === "PRODUCT"
                      ? ` · product: ${c.product?.name ?? "—"}`
                      : "";
                const usage = `${c.timesUsed}${c.usageLimit != null ? ` / ${c.usageLimit}` : ""}`;
                return (
                  <CouponRow
                    key={c.id}
                    id={c.id}
                    code={c.code}
                    summary={value + min + scope}
                    usage={usage}
                    status={statusOf(c)}
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
