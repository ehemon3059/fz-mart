import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { listOrdersForCustomer } from "@/server/orders/getOrder";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE } from "@/config/order-status";

export const metadata = { title: "Order History", robots: { index: false } };

export default async function AccountOrdersPage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account/orders");

  const orders = await listOrdersForCustomer(session.customerId);

  if (orders.length === 0) {
    return (
      <p className="text-gray-500">
        You haven&apos;t placed any orders yet.{" "}
        <Link href="/products" className="underline">
          Start shopping
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <Link
          key={order.id}
          href={`/order-confirmation/${order.orderNo}`}
          className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-brand-600"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono font-bold text-gray-900">{order.orderNo}</span>
              <span className="ml-2 text-sm text-gray-500">
                {order.createdAt.toLocaleDateString("en-BD", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ORDER_STATUS_BADGE[order.status]}`}
            >
              {ORDER_STATUS_LABELS[order.status]}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-600">
            <span>
              {order.items.length} item{order.items.length === 1 ? "" : "s"}
            </span>
            <span className="font-semibold text-gray-900">{formatTaka(order.total)}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
