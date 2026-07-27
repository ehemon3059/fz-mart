import { prisma } from "@/lib/prisma";
import { mapCourierStatus, type CourierStatus } from "./index";
import type {
  CourierAdapter,
  ConsignmentResult,
  CreateConsignmentInput,
  ParsedWebhook,
  TestConnectionResult,
} from "./types";

// Steadfast SIMULATOR — test mode for the Steadfast provider only.
//
// Steadfast has no sandbox server (see their API docs: base URL, two auth
// headers, no test environment), so "test mode" cannot point somewhere else.
// This adapter stands in for the provider entirely: it makes NO HTTP call and
// fabricates responses locally.
//
// It is a drop-in CourierAdapter, so everything downstream of the adapter
// boundary behaves exactly as in production — CourierShipment rows are written,
// the order state machine runs, OrderStatusLog entries are recorded, the admin
// UI renders the same panels. Only the network call is replaced.
//
// WHAT IT CANNOT DO: validate the contract with Steadfast. Both sides of this
// conversation are our own code, so a wrong phone format or field name will be
// accepted here forever. Do one real consignment before going live.
//
// Simulated consignment ids are prefixed TEST- so they are unmistakable in
// lists, logs, and the database, and CourierShipment.isTest is frozen at
// creation so a later switch to live mode never sends these ids to the real API.

export const TEST_CONSIGNMENT_PREFIX = "TEST-";

export function isTestConsignmentId(consignmentId: string): boolean {
  return consignmentId.startsWith(TEST_CONSIGNMENT_PREFIX);
}

/** Statuses an operator can force a simulated shipment into. Mirrors the real
 *  provider's vocabulary so the mapping in index.ts is exercised too. */
export const SIMULATABLE_STATUSES = [
  "pending",
  "in_transit",
  "delivered",
  "returned",
  "cancelled",
] as const;

export type SimulatableStatus = (typeof SIMULATABLE_STATUSES)[number];

/**
 * Simulated consignments live in the CourierShipment row itself — the status
 * we return on lookup is simply the one already stored. That keeps the
 * simulator stateless (no side table, survives redeploys) and makes "force
 * status" a plain update to that row.
 */
async function storedStatus(consignmentId: string): Promise<CourierStatus> {
  const shipment = await prisma.courierShipment.findUnique({
    where: { consignmentId },
    select: { courierStatus: true },
  });
  return (shipment?.courierStatus as CourierStatus) ?? "PENDING";
}

export const steadfastSimAdapter: CourierAdapter = {
  provider: "STEADFAST",

  async createConsignment(input: CreateConsignmentInput): Promise<ConsignmentResult> {
    // Mirror the real adapter's required-field expectations so the simulator
    // still catches an order that Steadfast would have rejected outright.
    if (!input.recipientName?.trim()) {
      throw new Error("Simulator: recipient name is required.");
    }
    if (!input.recipientPhone?.trim()) {
      throw new Error("Simulator: recipient phone is required.");
    }
    if (!input.recipientAddress?.trim()) {
      throw new Error("Simulator: recipient address is required.");
    }

    const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
    const consignmentId = `${TEST_CONSIGNMENT_PREFIX}${input.orderNo}-${suffix}`;

    console.info(
      `[courier:sim] created simulated consignment ${consignmentId} for order ${input.orderNo} (no request sent to Steadfast)`,
    );

    return {
      consignmentId,
      trackingCode: `${TEST_CONSIGNMENT_PREFIX}TRK-${suffix}`,
      status: "PENDING",
    };
  },

  async getConsignmentStatus(consignmentId: string): Promise<CourierStatus> {
    // Refresh on a simulated shipment is a no-op that echoes the stored status:
    // there is no external system to poll. Status changes come from the admin's
    // "force status" control instead.
    return storedStatus(consignmentId);
  },

  async testConnection(): Promise<TestConnectionResult> {
    return {
      ok: true,
      message:
        "Test mode active — using the local simulator. No credentials are checked and nothing is sent to Steadfast.",
    };
  },

  parseWebhook(raw: unknown): ParsedWebhook | null {
    // Accepts the same shape as the real Steadfast callback so the webhook
    // route can be exercised end-to-end against a simulated shipment.
    if (!raw || typeof raw !== "object") return null;
    const p = raw as Record<string, unknown>;
    const cid = p.consignment_id;
    const status = p.delivery_status ?? p.status;
    if (cid == null || status == null) return null;
    return {
      consignmentId: String(cid),
      status: mapCourierStatus(String(status)),
    };
  },
};
