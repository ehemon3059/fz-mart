import { paisaToTaka } from "@/lib/money";
import { getRedxConfig, type RedxConfig } from "@/server/settings/courier-redx";
import { CourierNotConfiguredError, CourierProviderError } from "./index";
import type { CourierAdapter, CreateConsignmentInput } from "./types";
import type {
  ConsignmentResult,
  CourierStatus,
  ParsedWebhook,
  TestConnectionResult,
} from "./index";

// RedX courier adapter (OpenAPI v1.0.0-beta).
//
//   Docs:  https://redx.com.bd/api
//   Base:  https://openapi.redx.com.bd/v1.0.0-beta   (same URL for sandbox &
//          live — the API key decides which environment you hit)
//   Auth:  static Bearer token (API-ACCESS-TOKEN header), no token exchange.
//
// Create:  POST /parcel
// Track:   GET  /parcel/{tracking_id}
//
// MONEY: cash_collection_amount is taka; codAmount is paisa. Convert once here.

const BASE_URL = "https://openapi.redx.com.bd/v1.0.0-beta";

// --- Status mapping (RedX status -> internal) -------------------------------
// Internal enum has no SHIPPED member; "picked up"/"in transit" map to IN_TRANSIT.

const REDX_STATUS_MAP: Record<string, CourierStatus> = {
  picked_up: "IN_TRANSIT",
  in_transit: "IN_TRANSIT",
  delivered: "DELIVERED",
  partially_delivered: "DELIVERED",
  return_in_transit: "RETURNED",
  returned: "RETURNED",
  cancelled: "CANCELLED",
};

function mapRedxStatus(raw: string): CourierStatus {
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return REDX_STATUS_MAP[key] ?? "PENDING";
}

// --- Config / HTTP helpers --------------------------------------------------

function requireConfig(config: RedxConfig | null): RedxConfig {
  if (!config || !config.apiKey) throw new CourierNotConfiguredError();
  return config;
}

function authHeaders(config: RedxConfig): Record<string, string> {
  return {
    // RedX accepts the token via API-ACCESS-TOKEN; send Bearer too for portals
    // that expect the standard Authorization header.
    "API-ACCESS-TOKEN": `Bearer ${config.apiKey}`,
    Authorization: `Bearer ${config.apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object"
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return { _raw: text };
  }
}

async function callRedx(
  config: RedxConfig,
  path: string,
  init: RequestInit,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: { ...authHeaders(config), ...(init.headers ?? {}) },
    });
  } catch (err) {
    throw new CourierProviderError(
      `Could not reach RedX. Check your network. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  const body = await readJson(response);
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new CourierProviderError("RedX rejected the API key — check the token.");
    }
    const msg = body.message;
    const detail =
      (typeof msg === "string" && msg) ||
      (typeof body._raw === "string" ? body._raw.slice(0, 200) : "") ||
      `HTTP ${response.status}`;
    throw new CourierProviderError(`RedX request failed (${response.status}): ${detail}`);
  }
  return body;
}

// --- Adapter contract -------------------------------------------------------

async function createConsignment(
  input: CreateConsignmentInput,
): Promise<ConsignmentResult> {
  const config = requireConfig(await getRedxConfig());

  const body = await callRedx(config, "/parcel", {
    method: "POST",
    body: JSON.stringify({
      customer_name: input.recipientName,
      customer_phone: input.recipientPhone,
      delivery_area: input.recipientAddress,
      delivery_address: input.recipientAddress,
      merchant_invoice_id: input.orderNo,
      cash_collection_amount: paisaToTaka(input.codAmount),
      parcel_weight: input.itemWeight ?? 500, // RedX expects grams
      instruction: input.specialInstruction ?? "",
      value: paisaToTaka(input.codAmount),
      pickup_store_id: config.pickupStoreId || undefined,
    }),
  });

  // RedX returns { tracking_id } (sometimes nested under data).
  const data =
    body.data && typeof body.data === "object"
      ? (body.data as Record<string, unknown>)
      : body;
  const trackingId = data.tracking_id ?? body.tracking_id;
  if (trackingId == null) {
    throw new CourierProviderError(
      "RedX accepted the request but returned no tracking id.",
    );
  }

  return {
    consignmentId: String(trackingId),
    trackingCode: String(trackingId),
    status: mapRedxStatus(String(data.status ?? "pending")),
  };
}

async function getConsignmentStatus(consignmentId: string): Promise<CourierStatus> {
  const config = requireConfig(await getRedxConfig());
  const body = await callRedx(
    config,
    `/parcel/${encodeURIComponent(consignmentId)}`,
    { method: "GET" },
  );
  const parcel =
    body.parcel && typeof body.parcel === "object"
      ? (body.parcel as Record<string, unknown>)
      : body;
  return mapRedxStatus(String(parcel.status ?? parcel.current_status ?? "pending"));
}

async function testConnection(): Promise<TestConnectionResult> {
  try {
    const config = requireConfig(await getRedxConfig());
    // /areas is auth-gated and read-only — a 2xx proves the key is valid.
    await callRedx(config, "/areas?limit=1", { method: "GET" });
    return { ok: true, message: "Connection successful — RedX API key is valid." };
  } catch (err) {
    if (err instanceof CourierProviderError || err instanceof CourierNotConfiguredError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Connection failed." };
  }
}

function parseWebhook(raw: unknown): ParsedWebhook | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const cid = p.tracking_id ?? p.trackingId ?? p.merchant_invoice_id;
  const status = p.status ?? p.current_status ?? p.event;
  if (cid == null || status == null) return null;
  return { consignmentId: String(cid), status: mapRedxStatus(String(status)) };
}

export const redxAdapter: CourierAdapter = {
  provider: "REDX",
  createConsignment,
  getConsignmentStatus,
  testConnection,
  parseWebhook,
};
