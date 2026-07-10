import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { listOrdersForCustomer } from "@/server/orders/getOrder";
import { formatTaka } from "@/lib/money";

export const metadata = { title: "Purchase History", robots: { index: false } };

// "Purchase history" is order history narrowed to orders that actually
// completed — DELIVERED — as opposed to /account/orders, which shows every
// order regardless of status (including pending/cancelled).
export default async function AccountPurchasesPage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account/purchases");

  const orders = await listOrdersForCustomer(session.customerId, ["DELIVERED"]);

  if (orders.length === 0) {
    return (
      <p className="text-gray-500">
        No completed purchases yet.{" "}
        <Link href="/account/orders" className="underline">
          View all orders
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {orders.map((order) => (
        <div key={order.id} className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-2">
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
            <span className="font-semibold text-gray-900">{formatTaka(order.total)}</span>
          </div>
          <div className="mt-2 divide-y divide-gray-100">
            {order.items.map((item) => (
              <div key={item.id} className="flex justify-between py-1.5 text-sm text-gray-700">
                <span>
                  {item.productName}
                  {item.variantLabel ? ` — ${item.variantLabel}` : ""} × {item.quantity}
                </span>
                <span>{formatTaka(item.unitPrice * item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
