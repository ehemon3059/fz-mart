import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/config/order-status";
import { Badge, type BadgeTone } from "@/components/admin/ui/Badge";

/** Maps the order lifecycle onto the shared semantic tones so status colour is
 *  consistent with every other badge in the panel. */
const STATUS_TONE: Record<OrderStatus, BadgeTone> = {
  PENDING_PAYMENT: "warning",
  PENDING: "warning",
  CONFIRMED: "accent",
  SHIPPED: "accent",
  DELIVERED: "success",
  CANCELLED: "neutral",
  RETURNED: "danger",
};

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <Badge tone={STATUS_TONE[status]} dot>{ORDER_STATUS_LABELS[status]}</Badge>;
}
