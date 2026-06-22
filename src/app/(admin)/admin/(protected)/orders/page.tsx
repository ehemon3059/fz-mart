import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { listOrders } from "@/server/orders/admin";
import { getExistingFraudChecksByPhones } from "@/server/fraud";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/config/order-status";
import RiskBadge from "@/components/admin/RiskBadge";

const FILTERS: Array<OrderStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "CONFIRMED",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "RETURNED",
];

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const filter = status && status !== "ALL" ? (status as OrderStatus) : undefined;
  const orders = await listOrders(filter ? { status: filter } : undefined);
  const riskByPhone = await getExistingFraudChecksByPhones(
    Array.from(new Set(orders.map((o) => o.customerPhone))),
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Orders</h1>

      <div className="flex gap-2 text-sm flex-wrap">
        {FILTERS.map((f) => (
          <Link
            key={f}
            href={f === "ALL" ? "/admin/orders" : `/admin/orders?status=${f}`}
            className={`px-3 py-1 rounded-full border ${
              (status ?? "ALL") === f
                ? "bg-black text-white border-black"
                : "text-gray-700"
            }`}
          >
            {f === "ALL" ? "All" : ORDER_STATUS_LABELS[f]}
          </Link>
        ))}
      </div>

      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Order No.</th>
              <th className="px-4 py-2">Customer</th>
              <th className="px-4 py-2">Phone</th>
              <th className="px-4 py-2">Total</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2">Risk</th>
              <th className="px-4 py-2">Placed</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="px-4 py-2 font-mono font-medium">{order.orderNo}</td>
                <td className="px-4 py-2">{order.customerName}</td>
                <td className="px-4 py-2">{order.customerPhone}</td>
                <td className="px-4 py-2">{formatTaka(order.total)}</td>
                <td className="px-4 py-2">{ORDER_STATUS_LABELS[order.status]}</td>
                <td className="px-4 py-2">
                  <RiskBadge riskScore={riskByPhone.get(order.customerPhone) ?? null} />
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {order.createdAt.toLocaleDateString("en-BD")}
                </td>
                <td className="px-4 py-2">
                  <Link href={`/admin/orders/${order.id}`} className="underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
