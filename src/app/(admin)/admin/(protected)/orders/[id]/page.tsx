import { notFound } from "next/navigation";
import { getOrderById } from "@/server/orders/admin";
import { getExistingFraudCheck } from "@/server/fraud";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS, nextStatuses } from "@/config/order-status";
import StatusControls from "./StatusControls";
import CourierPanel from "./CourierPanel";
import RiskBadge from "@/components/admin/RiskBadge";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(Number(id));
  if (!order) notFound();

  const fraudCheck = await getExistingFraudCheck(order.customerPhone);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNo}</h1>
        <p className="text-gray-500 text-sm">
          Placed {order.createdAt.toLocaleString("en-BD")}
        </p>
      </div>

      <div className="border rounded-lg bg-white p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-500">Current Status</p>
          <p className="text-lg font-semibold">{ORDER_STATUS_LABELS[order.status]}</p>
        </div>
        <StatusControls orderId={order.id} options={nextStatuses(order.status)} />
      </div>

      <CourierPanel orderId={order.id} shipment={order.courierShipment} />

      <div className="border rounded-lg bg-white p-6 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Customer</h2>
          <RiskBadge riskScore={fraudCheck?.riskScore ?? null} />
        </div>
        <p className="text-sm">{order.customerName}</p>
        <p className="text-sm">{order.customerPhone}</p>
        <p className="text-sm whitespace-pre-line">{order.address}</p>
        {order.shippingZone && (
          <p className="text-sm text-gray-500">Zone: {order.shippingZone.name}</p>
        )}
        {fraudCheck && (
          <p className="text-xs text-gray-400">
            {fraudCheck.successOrders} successful / {fraudCheck.returnOrders} returned of{" "}
            {fraudCheck.totalOrders} total orders across couriers — checked{" "}
            {fraudCheck.checkedAt.toLocaleString("en-BD")}
          </p>
        )}
      </div>

      <div className="border rounded-lg bg-white p-6">
        <h2 className="font-semibold mb-3">Items</h2>
        <div className="divide-y">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between py-2 text-sm">
              <span>
                {item.productName} × {item.quantity}
              </span>
              <span>{formatTaka(item.unitPrice * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="border-t pt-3 mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span>{formatTaka(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span>Delivery</span>
            <span>{formatTaka(order.deliveryCharge)}</span>
          </div>
          <div className="flex justify-between font-bold text-base">
            <span>Total</span>
            <span>{formatTaka(order.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
