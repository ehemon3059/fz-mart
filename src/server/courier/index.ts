import { prisma } from "@/lib/prisma";
import type { OrderStatus, CourierProvider } from "@prisma/client";
import {
  CourierNotConfiguredError,
  CourierProviderError,
  type CourierStatus,
} from "@/integrations/courier";
import type { CreateConsignmentInput } from "@/integrations/courier/types";
import { resolveAdapter } from "@/integrations/courier/dispatch";
import { getActiveProvider } from "@/server/settings/courier-active";
import { updateOrderStatus } from "@/server/orders/admin";
import { nextStatuses } from "@/config/order-status";

export class CourierServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourierServiceError";
  }
}

/** Wrap adapter errors into CourierServiceError (the admin UI displays these). */
function toServiceError(err: unknown): CourierServiceError {
  if (err instanceof CourierNotConfiguredError || err instanceof CourierProviderError) {
    return new CourierServiceError(err.message);
  }
  if (err instanceof CourierServiceError) return err;
  console.error("[courier] unexpected adapter error:", err);
  return new CourierServiceError("Courier request failed. See server logs.");
}

/**
 * The provider a shipment belongs to. Prefers Order.courierProvider (set at
 * creation), falling back to CourierShipment.courierName for rows created
 * before that column existed. courierName historically stored the lowercase
 * provider slug (e.g. "steadfast"), so we normalise case-insensitively;
 * anything unrecognised defaults to STEADFAST (the only pre-existing provider).
 */
export function resolveShipmentProvider(
  orderProvider: CourierProvider | null,
  courierName: string,
): CourierProvider {
  if (orderProvider) return orderProvider;
  const upper = courierName.trim().toUpperCase();
  if (upper === "PATHAO") return "PATHAO";
  if (upper === "REDX") return "REDX";
  return "STEADFAST";
}

/** Extra, provider-specific inputs the admin supplies at consignment time
 *  (currently only Pathao's location ids). Optional for other providers. */
export interface ShipOrderOptions {
  /** Which provider to ship with. Defaults to the active provider setting. */
  provider?: CourierProvider;
  recipientCityId?: number;
  recipientZoneId?: number;
  recipientAreaId?: number;
}

/**
 * Creates a consignment for an order and stores the resulting CourierShipment.
 *
 * The chosen provider is FROZEN onto Order.courierProvider here. Every later
 * status refresh and webhook dispatches to that stored provider — never the
 * currently-active one — so switching the shop's active courier can never
 * misroute an already-shipped order's status lookups.
 */
export async function shipOrder(orderId: number, options: ShipOrderOptions = {}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { courierShipment: true },
  });
  if (!order) {
    throw new CourierServiceError("Order not found.");
  }
  if (order.courierShipment) {
    throw new CourierServiceError("This order already has a courier shipment.");
  }

  const provider = options.provider ?? (await getActiveProvider());
  if (!provider) {
    throw new CourierServiceError(
      "No courier provider selected — configure one under Admin > Settings > Courier.",
    );
  }
  const adapter = resolveAdapter(provider);

  const input: CreateConsignmentInput = {
    orderNo: order.orderNo,
    recipientName: order.customerName,
    recipientPhone: order.customerPhone,
    recipientAddress: order.address,
    codAmount: order.total,
    recipientCityId: options.recipientCityId,
    recipientZoneId: options.recipientZoneId,
    recipientAreaId: options.recipientAreaId,
  };

  // Create the consignment FIRST. If the provider call throws we never write a
  // CourierShipment row, so there is no half-created shipment to clean up.
  let result;
  try {
    result = await adapter.createConsignment(input);
  } catch (err) {
    throw toServiceError(err);
  }

  // Freeze the provider on the order and persist the shipment together, so the
  // two can't drift out of sync.
  const [shipment] = await prisma.$transaction([
    prisma.courierShipment.create({
      data: {
        orderId: order.id,
        courierName: provider,
        consignmentId: result.consignmentId,
        trackingCode: result.trackingCode,
        courierStatus: result.status,
      },
    }),
    prisma.order.update({
      where: { id: order.id },
      data: { courierProvider: provider },
    }),
  ]);

  // A newly-created consignment means the order is handed to the courier —
  // advance it to SHIPPED so the lifecycle and the finance log stay in step.
  await reconcileOrderStatus(orderId, result.status);

  return shipment;
}

/**
 * Polls the provider and updates the stored status (manual "refresh" action).
 *
 * Dispatches to the provider FROZEN on the order at creation time, resolved
 * from Order.courierProvider (falling back to the shipment's courierName for
 * rows created before that column existed). It deliberately ignores the active
 * provider setting, so refreshing an old Pathao order still calls Pathao even
 * after the shop switched its active courier to RedX.
 */
export async function syncShipmentStatus(orderId: number) {
  const shipment = await prisma.courierShipment.findUnique({
    where: { orderId },
    include: { order: { select: { courierProvider: true } } },
  });
  if (!shipment) {
    throw new CourierServiceError("This order has no courier shipment yet.");
  }

  const provider = resolveShipmentProvider(
    shipment.order.courierProvider,
    shipment.courierName,
  );
  const adapter = resolveAdapter(provider);

  let status: CourierStatus;
  try {
    status = await adapter.getConsignmentStatus(shipment.consignmentId);
  } catch (err) {
    throw toServiceError(err);
  }

  const updated = await prisma.courierShipment.update({
    where: { orderId },
    data: { courierStatus: status, lastSyncedAt: new Date() },
  });

  await reconcileOrderStatus(orderId, status);
  return updated;
}

/**
 * Apply a verified webhook status push: persist it on the shipment and
 * reconcile the linked order's lifecycle. Called from the courier webhook
 * route after signature verification and the idempotency check.
 */
export async function applyCourierWebhookStatus(
  orderId: number,
  status: CourierStatus,
) {
  await prisma.courierShipment.update({
    where: { orderId },
    data: { courierStatus: status, lastSyncedAt: new Date() },
  });
  await reconcileOrderStatus(orderId, status);
}

/**
 * Move the linked order along its lifecycle to match a courier status, going
 * through updateOrderStatus so OrderStatusLog is written (finance P&L reads
 * that log for revenue recognition).
 *
 * The order state machine only allows single forward steps
 * (CONFIRMED→SHIPPED→DELIVERED), so we walk the happy path one hop at a time.
 * Terminal courier states (RETURNED/CANCELLED) transition once if reachable.
 * Every step is validated by updateOrderStatus, so an out-of-order callback is
 * a safe no-op rather than an illegal jump.
 */
async function reconcileOrderStatus(orderId: number, courierStatus: CourierStatus) {
  const target = courierStatusToOrderStatus(courierStatus);
  if (!target) return;

  // Walk toward the target; bail the moment a hop isn't allowed or we arrive.
  for (let guard = 0; guard < 4; guard++) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order || order.status === target) return;

    const next = chooseNextHop(order.status, target);
    if (!next) return; // target not reachable from here — leave as-is

    try {
      await updateOrderStatus(orderId, next, "courier");
    } catch {
      // Transition became invalid (concurrent change) — stop, don't loop.
      return;
    }
  }
}

/** The order status a given courier status implies, or null for "no change". */
function courierStatusToOrderStatus(status: CourierStatus): OrderStatus | null {
  switch (status) {
    case "IN_TRANSIT":
      return "SHIPPED";
    case "DELIVERED":
      return "DELIVERED";
    case "RETURNED":
      return "RETURNED";
    case "CANCELLED":
      return "CANCELLED";
    case "PENDING":
    default:
      return null;
  }
}

/** Pick the next hop from `current` that makes progress toward `target`. */
function chooseNextHop(
  current: OrderStatus,
  target: OrderStatus,
): OrderStatus | null {
  const allowed = nextStatuses(current);
  if (allowed.includes(target)) return target;
  // Otherwise step forward along the happy path (SHIPPED is the only
  // intermediate that leads onward to DELIVERED).
  if (target === "DELIVERED" && allowed.includes("SHIPPED")) return "SHIPPED";
  return null;
}

export async function getShipmentByOrderId(orderId: number) {
  return prisma.courierShipment.findUnique({ where: { orderId } });
}
