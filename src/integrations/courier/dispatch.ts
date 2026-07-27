import type { CourierProvider } from "@prisma/client";
import {
  createConsignment as steadfastCreate,
  getConsignmentStatus as steadfastStatus,
  parseWebhookPayload as steadfastParseWebhook,
  testCourierConnection as steadfastTest,
} from "./index";
import { getCourierConfig, isCourierTestMode } from "@/server/settings/courier";
import { pathaoAdapter } from "./pathao";
import { redxAdapter } from "./redx";
import { steadfastSimAdapter, isTestConsignmentId } from "./steadfast-sim";
import type { CourierAdapter } from "./types";

// Adapter registry. This is the ONLY place that maps a CourierProvider enum to
// a concrete adapter. The service layer and webhook routes ask for an adapter
// by provider and never import a concrete implementation directly.
//
// The Steadfast adapter (./index.ts) predates the CourierAdapter interface, so
// we wrap its free functions here rather than modifying that file. Its
// testConnection reads credentials from the `courier` settings group.

const steadfastAdapter: CourierAdapter = {
  provider: "STEADFAST",
  createConsignment: steadfastCreate,
  getConsignmentStatus: steadfastStatus,
  parseWebhook: steadfastParseWebhook,
  async testConnection() {
    const config = await getCourierConfig();
    if (!config) {
      return {
        ok: false,
        message: "Steadfast is not configured — set it under Admin > Settings > Courier.",
      };
    }
    return steadfastTest(config);
  },
};

const ADAPTERS: Record<CourierProvider, CourierAdapter> = {
  STEADFAST: steadfastAdapter,
  PATHAO: pathaoAdapter,
  REDX: redxAdapter,
};

/** Resolve the adapter for a provider. Total over the enum — never throws.
 *  Always returns the LIVE adapter; see resolveAdapterForCreate /
 *  resolveAdapterForShipment for the Steadfast test-mode aware variants. */
export function resolveAdapter(provider: CourierProvider): CourierAdapter {
  return ADAPTERS[provider];
}

/**
 * Adapter to use when CREATING a new consignment. Steadfast honours the
 * test-mode setting here — this is the only point where the current setting
 * decides anything, because from creation onward the mode is frozen on the
 * shipment row. Pathao and RedX are unaffected (they have their own sandbox
 * story and are out of scope for Steadfast test mode).
 */
export async function resolveAdapterForCreate(
  provider: CourierProvider,
): Promise<CourierAdapter> {
  if (provider === "STEADFAST" && (await isCourierTestMode())) {
    return steadfastSimAdapter;
  }
  return ADAPTERS[provider];
}

/**
 * Adapter to use for an EXISTING shipment (status refresh, webhook dispatch).
 *
 * Follows the mode the shipment was created in, never the current setting —
 * the same frozen-provider invariant that keeps Order.courierProvider
 * authoritative. Without this, flipping to live mode and hitting Refresh on a
 * simulated shipment would ask the real Steadfast API about a TEST- id.
 *
 * `isTest` is the source of truth; the id prefix is a fallback for any row
 * written before the column existed.
 */
export function resolveAdapterForShipment(
  provider: CourierProvider,
  shipment: { isTest?: boolean; consignmentId: string },
): CourierAdapter {
  if (
    provider === "STEADFAST" &&
    (shipment.isTest || isTestConsignmentId(shipment.consignmentId))
  ) {
    return steadfastSimAdapter;
  }
  return ADAPTERS[provider];
}
