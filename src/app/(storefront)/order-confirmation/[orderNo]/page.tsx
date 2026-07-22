import { notFound } from "next/navigation";
import Link from "next/link";
import { getOrderByOrderNo } from "@/server/orders/getOrder";
import { returnWindowOpen } from "@/server/orders/self-service";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/config/order-status";
import CustomerOrderActions from "@/components/storefront/CustomerOrderActions";
import SuccessAnimation from "@/components/storefront/SuccessAnimation";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ orderNo: string }>;
}) {
  const { orderNo } = await params;
  const order = await getOrderByOrderNo(orderNo);
  if (!order) notFound();

  const canReturn = order.status === "DELIVERED" ? await returnWindowOpen(order.id) : false;

  return (
    <div className="max-w-xl mx-auto space-y-6 text-center pt-10 sm:pt-14">
      {/* No Purchase pixel fires here. For this COD store the real conversion
          is a phone-CONFIRMED order — that Purchase is sent server-side via the
          Conversions API when the owner confirms (see server/orders/admin.ts),
          so ad delivery optimizes for genuine confirmations, not raw orders. */}
      <SuccessAnimation />
      <h1 className="text-2xl font-bold text-gray-900">Order Placed!</h1>
      <p className="text-gray-600">
        Thank you, {order.customerName}. We&apos;ll call you at {order.customerPhone}{" "}
        to confirm.
      </p>

      <div className="border rounded-lg bg-white p-6 text-left space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Order No.</span>
          <span className="font-mono font-bold text-lg">{order.orderNo}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Status</span>
          <span className="font-medium">{ORDER_STATUS_LABELS[order.status]}</span>
        </div>
        <div className="border-t pt-3 divide-y">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>{formatTaka(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 flex justify-between font-bold">
          <span>Total (Cash on Delivery)</span>
          <span>{formatTaka(order.total)}</span>
        </div>
      </div>

      <div className="text-left">
        <CustomerOrderActions
          orderNo={order.orderNo}
          phone={order.customerPhone}
          status={order.status}
          returnWindowOpen={canReturn}
        />
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <Link href={`/track?orderNo=${order.orderNo}`} className="underline">
          Track this order
        </Link>
        <Link href="/" className="underline">
          Continue shopping
        </Link>
      </div>
    </div>
  );
}
