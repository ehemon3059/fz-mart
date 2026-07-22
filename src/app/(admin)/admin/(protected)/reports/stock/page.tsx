import { getStockReport } from "@/server/reports/stock";

export default async function StockReportPage() {
  const rows = await getStockReport();
  const outOfStock = rows.filter((r) => r.stock <= 0).length;
  const lowStock = rows.filter((r) => r.stock > 0 && r.stock <= 10).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Stock Report</h1>
        <p className="text-xs text-gray-400">Cached for up to 60 seconds</p>
      </div>

      <div className="grid grid-cols-2 gap-4 max-w-md">
        <div className="border rounded-lg bg-white p-4">
          <p className="text-sm text-gray-500">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{outOfStock}</p>
        </div>
        <div className="border rounded-lg bg-white p-4">
          <p className="text-sm text-gray-500">Low Stock (≤10)</p>
          <p className="text-2xl font-bold text-amber-600">{lowStock}</p>
        </div>
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Product</th>
              <th className="px-4 py-2">Category</th>
              <th className="px-4 py-2">Stock</th>
              <th className="px-4 py-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-medium">{row.name}</td>
                <td className="px-4 py-2 text-gray-500">{row.categoryPath}</td>
                <td className="px-4 py-2">
                  <span
                    className={
                      row.stock <= 0
                        ? "text-red-600 font-medium"
                        : row.stock <= 10
                          ? "text-amber-600 font-medium"
                          : ""
                    }
                  >
                    {row.stock}
                  </span>
                </td>
                <td className="px-4 py-2 text-gray-500">{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
