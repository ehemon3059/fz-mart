import { getCourierConfig, type CourierConfig } from "@/server/settings/courier";
import { paisaToTaka } from "@/lib/money";

// Courier adapter — real Steadfast (Packzy) integration.
//
// This is the ONE place that knows Steadfast's request/response shapes. The
// service layer (server/courier/), the webhook route, and the admin UI all
// speak the provider-neutral interface defined here, so swapping providers
// means rewriting only this file.
//
// Steadfast API reference (merchant portal → Developer):
//   Base URL:  https://portal.packzy.com/api/v1  (admin-configurable)
//   Auth:      headers  Api-Key: <key>   Secret-Key: <secret>
//   Create:    POST /create_order
//   Status:    GET  /status_by_cid/{consignment_id}
//
// MONEY: order totals are paisa internally (see lib/money.ts). Steadfast's
// cod_amount is taka. We convert exactly once, at this boundary.

export interface CreateConsignmentInput {
  orderNo: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  /** COD amount in PAISA (integer). Converted to taka before sending. */
  codAmount: number;
}

/** Provider-neutral internal status enum stored on CourierShipment.courierStatus. */
export type CourierStatus =
  | "PENDING"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "RETURNED"
  | "CANCELLED";

export interface ConsignmentResult {
  consignmentId: string;
  trackingCode: string | null;
  status: CourierStatus;
}

export class CourierNotConfiguredError extends Error {
  constructor() {
    super("Courier is not configured — set it under Admin > Settings > Courier.");
    this.name = "CourierNotConfiguredError";
  }
}

/** Provider-side failure (bad credentials, rejected order, network). The admin
 *  UI surfaces `.message` verbatim, so keep messages human-readable. */
export class CourierProviderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CourierProviderError";
  }
}

// --- Status mapping ---------------------------------------------------------
//
// Steadfast exposes both a numeric `status` on create and a string
// `delivery_status` on lookup / webhook. We normalise every known spelling to
// the internal enum; anything unrecognised is treated as PENDING (safe: it
// won't spuriously transition the order to a terminal state).

const STEADFAST_STATUS_MAP: Record<string, CourierStatus> = {
  // create_order + status responses
  pending: "PENDING",
  in_review: "PENDING",
  hold: "PENDING",
  // in transit family
  delivered_approval_pending: "IN_TRANSIT",
  partial_delivered_approval_pending: "IN_TRANSIT",
  cancelled_approval_pending: "IN_TRANSIT",
  unknown_approval_pending: "IN_TRANSIT",
  in_transit: "IN_TRANSIT",
  // terminal
  delivered: "DELIVERED",
  partial_delivered: "DELIVERED",
  returned: "RETURNED",
  partial_returned: "RETURNED",
  cancelled: "CANCELLED",
};

export function mapCourierStatus(raw: string): CourierStatus {
  return STEADFAST_STATUS_MAP[raw.trim().toLowerCase()] ?? "PENDING";
}

// --- HTTP helpers -----------------------------------------------------------

function requireConfig(config: CourierConfig | null): CourierConfig {
  if (!config || !config.apiKey) throw new CourierNotConfiguredError();
  return config;
}

function baseUrl(config: CourierConfig): string {
  const url = config.apiUrl?.trim() || "https://portal.packzy.com/api/v1";
  return url.replace(/\/+$/, "");
}

function authHeaders(config: CourierConfig): Record<string, string> {
  return {
    "Api-Key": config.apiKey,
    "Secret-Key": config.secretKey,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

/** Perform a request and parse JSON, converting transport/HTTP errors into a
 *  human-readable CourierProviderError. */
async function callSteadfast(
  config: CourierConfig,
  path: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl(config)}${path}`, {
      ...init,
      headers: { ...authHeaders(config), ...(init.headers ?? {}) },
    });
  } catch (err) {
    throw new CourierProviderError(
      `Could not reach the courier service. Check the API URL and your network. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  const text = await response.text();
  let body: Record<string, unknown> = {};
  if (text) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === "object") {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // non-JSON body (e.g. an HTML error page) — keep raw text for the message
    }
  }

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new CourierProviderError(
        "Courier rejected the credentials — check the API key and secret key.",
      );
    }
    const detail =
      body.message ||
      body.errors ||
      (text ? text.slice(0, 200) : `HTTP ${response.status}`);
    throw new CourierProviderError(
      `Courier request failed (${response.status}): ${
        typeof detail === "string" ? detail : JSON.stringify(detail)
      }`,
    );
  }

  return body;
}

// --- Public adapter contract ------------------------------------------------

export async function createConsignment(
  input: CreateConsignmentInput,
): Promise<ConsignmentResult> {
  const config = requireConfig(await getCourierConfig());

  const body = await callSteadfast(config, "/create_order", {
    method: "POST",
    body: JSON.stringify({
      invoice: input.orderNo,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      // paisa -> taka, exactly at the provider boundary.
      cod_amount: paisaToTaka(input.codAmount),
    }),
  });

  // Steadfast wraps the payload as { status: 200, consignment: {...} }.
  const consignment =
    body.consignment && typeof body.consignment === "object"
      ? (body.consignment as Record<string, unknown>)
      : null;
  if (!consignment?.consignment_id) {
    throw new CourierProviderError(
      "Courier accepted the request but returned no consignment id.",
    );
  }

  return {
    consignmentId: String(consignment.consignment_id),
    trackingCode: consignment.tracking_code
      ? String(consignment.tracking_code)
      : null,
    status: mapCourierStatus(String(consignment.status ?? "pending")),
  };
}

export async function getConsignmentStatus(
  consignmentId: string,
): Promise<CourierStatus> {
  const config = requireConfig(await getCourierConfig());

  const body = await callSteadfast(
    config,
    `/status_by_cid/${encodeURIComponent(consignmentId)}`,
    { method: "GET" },
  );

  // { status: 200, delivery_status: "in_review" | "delivered" | ... }
  return mapCourierStatus(String(body.delivery_status ?? "pending"));
}

// --- Credential validation (admin "test connection") ------------------------

export interface TestConnectionResult {
  ok: boolean;
  message: string;
}

/**
 * Live credential check used by the settings form before saving. Steadfast has
 * no dedicated ping endpoint, so we hit the balance endpoint (cheap, read-only,
 * auth-gated) and treat a 2xx as "credentials valid".
 */
export async function testCourierConnection(
  config: CourierConfig,
): Promise<TestConnectionResult> {
  try {
    await callSteadfast(config, "/get_balance", { method: "GET" });
    return { ok: true, message: "Connection successful — credentials are valid." };
  } catch (err) {
    if (err instanceof CourierProviderError) {
      return { ok: false, message: err.message };
    }
    return {
      ok: false,
      message: err instanceof Error ? err.message : "Connection failed.",
    };
  }
}

// --- Webhook payload parsing ------------------------------------------------

export interface ParsedWebhook {
  consignmentId: string;
  status: CourierStatus;
}

/**
 * Extract the (consignmentId, internal status) pair from a raw Steadfast
 * delivery-status callback body. Returns null when the payload is missing the
 * fields we need. Signature verification is the caller's responsibility.
 *
 * Steadfast webhook body:
 *   { notification_type, consignment_id, invoice, cod_amount,
 *     status, delivery_status, ... }
 */
export function parseWebhookPayload(raw: unknown): ParsedWebhook | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const cid = p.consignment_id;
  const status = p.delivery_status ?? p.status;
  if (cid == null || status == null) return null;
  return {
    consignmentId: String(cid),
    status: mapCourierStatus(String(status)),
  };
}
