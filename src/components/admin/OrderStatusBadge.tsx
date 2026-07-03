import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABELS } from "@/config/order-status";

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      className={`inline-block text-xs px-2 py-0.5 rounded font-medium ${ORDER_STATUS_BADGE[status]}`}
    >
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
