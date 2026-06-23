import Link from "next/link";
import { listAllFlashSales } from "@/server/flash-sales/admin";
import DeleteButton from "@/components/admin/DeleteButton";
import { removeFlashSale } from "./actions";

function statusOf(sale: { isActive: boolean; startsAt: Date; endsAt: Date }) {
  const now = new Date();
  if (!sale.isActive) return { label: "Inactive", cls: "text-gray-400" };
  if (now < sale.startsAt) return { label: "Scheduled", cls: "text-amber-600" };
  if (now > sale.endsAt) return { label: "Ended", cls: "text-gray-400" };
  return { label: "Live", cls: "text-green-700" };
}

export default async function AdminFlashSalesPage() {
  const flashSales = await listAllFlashSales();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Flash Sales</h1>
        <Link
          href="/admin/flash-sales/new"
          className="bg-black text-white px-4 py-2 rounded text-sm font-medium"
        >
          + New Flash Sale
        </Link>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Window</th>
              <th className="px-4 py-2">Products</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {flashSales.map((sale) => {
              const status = statusOf(sale);
              return (
                <tr key={sale.id}>
                  <td className="px-4 py-2 font-medium">{sale.name}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {sale.startsAt.toLocaleString()} &rarr; {sale.endsAt.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">{sale.products.length}</td>
                  <td className="px-4 py-2">
                    <span className={status.cls}>{status.label}</span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex gap-3 justify-end">
                      <Link href={`/admin/flash-sales/${sale.id}/edit`} className="underline">
                        Edit
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
    </div>
  );
}
