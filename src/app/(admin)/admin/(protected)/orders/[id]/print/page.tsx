import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/server/orders/admin";
import { formatTaka } from "@/lib/money";
import { ORDER_STATUS_LABELS } from "@/config/order-status";
import PrintButton from "./PrintButton";

export default async function OrderInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(Number(id));
  if (!order) notFound();

  return (
    <div className="max-w-2xl mx-auto bg-white print:max-w-none">
      {/* Toolbar — hidden when printing */}
      <div className="print:hidden flex items-center justify-between mb-6">
        <Link href={`/admin/orders/${order.id}`} className="text-sm underline text-gray-600">
          ← Back to order
        </Link>
        <PrintButton />
      </div>

      <div className="border rounded-lg p-8 print:border-0 print:p-0">
        {/* Header */}
        <div className="flex items-start justify-between border-b pb-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">fz-mart</h1>
            <p className="text-sm text-gray-500">Invoice / Packing Slip</p>
          </div>
          <div className="text-right text-sm">
            <p className="font-mono font-semibold text-base">{order.orderNo}</p>
            <p className="text-gray-500">{order.createdAt.toLocaleString("en-BD")}</p>
            <p className="text-gray-500">Status: {ORDER_STATUS_LABELS[order.status]}</p>
          </div>
        </div>

        {/* Ship to */}
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wide text-gray-400 mb-1">Ship To</p>
          <p className="font-medium">{order.customerName}</p>
          <p className="text-sm">{order.customerPhone}</p>
          <p className="text-sm whitespace-pre-line">{order.address}</p>
          {order.shippingZone && (
            <p className="text-sm text-gray-500">Zone: {order.shippingZone.name}</p>
          )}
        </div>

        {/* Items */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="py-2">Item</th>
              <th className="py-2 text-center w-16">Qty</th>
              <th className="py-2 text-right w-28">Unit</th>
              <th className="py-2 text-right w-28">Amount</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.id} className="border-b">
                <td className="py-2">{item.productName}</td>
                <td className="py-2 text-center">{item.quantity}</td>
                <td className="py-2 text-right">{formatTaka(item.unitPrice)}</td>
                <td className="py-2 text-right">
                  {formatTaka(item.unitPrice * item.quantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Subtotal</span>
              <span>{formatTaka(order.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Delivery</span>
              <span>{formatTaka(order.deliveryCharge)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-bold text-base">
              <span>Total (COD)</span>
              <span>{formatTaka(order.total)}</span>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-10">
          Thank you for shopping with fz-mart.
        </p>
      </div>
    </div>
  );
}
