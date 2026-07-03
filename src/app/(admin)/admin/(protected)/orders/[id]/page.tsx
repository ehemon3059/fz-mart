import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getOrderById,
  getOrderStatusHistory,
  getOrderNotes,
} from "@/server/orders/admin";
import { getExistingFraudCheck } from "@/server/fraud";
import { getOrderPayments } from "@/server/payments";
import { formatTaka } from "@/lib/money";
import { nextStatuses } from "@/config/order-status";
import StatusControls from "./StatusControls";
import PaymentPanel from "./PaymentPanel";
import StatusTimeline from "./StatusTimeline";
import OrderNotes from "./OrderNotes";
import OrderFinancials from "./OrderFinancials";
import CourierPanel from "./CourierPanel";
import RiskBadge from "@/components/admin/RiskBadge";
import OrderStatusBadge from "@/components/admin/OrderStatusBadge";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const orderId = Number(id);
  const order = await getOrderById(orderId);
  if (!order) notFound();

  const [fraudCheck, statusLogs, notes, payments] = await Promise.all([
    getExistingFraudCheck(order.customerPhone),
    getOrderStatusHistory(orderId),
    getOrderNotes(orderId),
    getOrderPayments(orderId),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Order {order.orderNo}</h1>
          <p className="text-gray-500 text-sm">
            Placed {order.createdAt.toLocaleString("en-BD")}
          </p>
        </div>
        <Link
          href={`/admin/orders/${order.id}/print`}
          target="_blank"
          className="shrink-0 border rounded px-3 py-1.5 text-sm font-medium hover:border-black"
        >
          Print invoice
        </Link>
      </div>

      <div className="border rounded-lg bg-white p-6 space-y-4">
        <div>
          <p className="text-sm text-gray-500">Current Status</p>
          <div className="mt-1">
            <OrderStatusBadge status={order.status} />
          </div>
        </div>
        <StatusControls orderId={order.id} options={nextStatuses(order.status)} />
      </div>

      <div className="border rounded-lg bg-white p-6">
        <h2 className="font-semibold mb-3">Payment</h2>
        <PaymentPanel
          orderId={order.id}
          paymentMethod={order.paymentMethod}
          total={order.total}
          paidAmount={order.paidAmount}
          payments={payments.map((p) => ({
            id: p.id,
            provider: p.provider,
            amount: p.amount,
            status: p.status,
            providerTxnId: p.providerTxnId,
            createdAt: p.createdAt.toLocaleString("en-BD"),
          }))}
        />
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
        {order.customerNote && (
          <div className="mt-2 rounded border border-amber-200 bg-amber-50 p-2">
            <p className="text-xs font-medium text-amber-700">Customer note</p>
            <p className="text-sm whitespace-pre-line text-amber-900">{order.customerNote}</p>
          </div>
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

      <div className="border rounded-lg bg-white p-6">
        <h2 className="font-semibold mb-4">Order Costs &amp; Profit Tracking</h2>
        <OrderFinancials
          orderId={order.id}
          status={order.status}
          shippingCost={order.shippingCost}
          returnShippingCost={order.returnShippingCost}
          paymentGatewayFee={order.paymentGatewayFee}
          returnRestockable={order.returnRestockable}
        />
      </div>

      <div className="border rounded-lg bg-white p-6">
        <h2 className="font-semibold mb-4">Internal Notes</h2>
        <OrderNotes orderId={order.id} notes={notes} />
      </div>

      <div className="border rounded-lg bg-white p-6">
        <h2 className="font-semibold mb-4">Status History</h2>
        <StatusTimeline logs={statusLogs} />
      </div>
    </div>
  );
}
