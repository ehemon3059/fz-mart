// Shared, provider-neutral courier adapter contract.
//
// The Steadfast adapter (./index.ts) predates this file and defines the base
// vocabulary — CourierStatus, ConsignmentResult, the error classes. We re-export
// those here (single source of truth, no duplication) and add the multi-provider
// pieces: the CourierAdapter interface every provider implements and the
// superset consignment input.
//
// index.ts is intentionally NOT imported the other way around — it stays a
// self-contained Steadfast adapter with no knowledge of Pathao/RedX.

export {
  CourierNotConfiguredError,
  CourierProviderError,
} from "./index";
export type {
  CourierStatus,
  ConsignmentResult,
  ParsedWebhook,
  TestConnectionResult,
} from "./index";

import type {
  CourierStatus,
  ConsignmentResult,
  ParsedWebhook,
  TestConnectionResult,
} from "./index";

/**
 * Superset of the fields any provider might need to create a consignment.
 *
 * The base fields (orderNo, recipient details, codAmount) are shared by every
 * provider and mirror Steadfast's input. Provider-specific fields are
 * optional; each adapter reads only what it needs and validates its own
 * requirements (e.g. Pathao requires the location IDs, RedX does not).
 *
 * COD amount is PAISA (integer) — adapters convert to taka at their own
 * boundary, exactly once, as the Steadfast adapter does.
 */
export interface CreateConsignmentInput {
  orderNo: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  /** COD amount in PAISA (integer). */
  codAmount: number;

  // ── Pathao-specific (numeric location IDs from Pathao's location APIs) ──
  recipientCityId?: number;
  recipientZoneId?: number;
  recipientAreaId?: number;

  // ── Optional parcel metadata (used by Pathao/RedX; ignored by Steadfast) ──
  /** Whole-number parcel weight in KG. Defaults per-adapter when omitted. */
  itemWeight?: number;
  itemQuantity?: number;
  itemDescription?: string;
  specialInstruction?: string;
}

/**
 * Every provider adapter implements this. The dispatch layer (./dispatch.ts)
 * resolves the right one; the service layer never imports a concrete adapter.
 *
 * Methods throw CourierProviderError / CourierNotConfiguredError on failure —
 * the service layer's toServiceError() converts those to CourierServiceError,
 * which the admin UI surfaces as an inline/toast message. A courier failure
 * therefore never crashes the order page.
 */
export interface CourierAdapter {
  /** Provider tag stored on Order.courierProvider / CourierShipment.courierName. */
  readonly provider: "STEADFAST" | "PATHAO" | "REDX";
  createConsignment(input: CreateConsignmentInput): Promise<ConsignmentResult>;
  getConsignmentStatus(consignmentId: string): Promise<CourierStatus>;
  /** Verify credentials without side effects (admin "Test Connection"). */
  testConnection(): Promise<TestConnectionResult>;
  /**
   * Extract (consignmentId, internal status) from a raw webhook body, or null
   * when the payload lacks the fields we need. Signature verification is the
   * caller's (route's) responsibility.
   */
  parseWebhook(raw: unknown): ParsedWebhook | null;
}
