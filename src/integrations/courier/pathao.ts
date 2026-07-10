import { redis } from "@/lib/redis";
import { paisaToTaka } from "@/lib/money";
import {
  getPathaoConfig,
  type PathaoConfig,
} from "@/server/settings/courier-pathao";
import { CourierNotConfiguredError, CourierProviderError } from "./index";
import type {
  CourierAdapter,
  CreateConsignmentInput,
} from "./types";
import type {
  ConsignmentResult,
  CourierStatus,
  ParsedWebhook,
  TestConnectionResult,
} from "./index";

// Pathao Courier adapter (aladdin merchant API v1).
//
//   Docs:     https://pathao.com/api/courier
//   Sandbox:  https://sandbox-merchant.pathao.com/aladdin/api/v1
//   Live:     https://merchant.pathao.com/aladdin/api/v1
//   Auth:     OAuth2 client_credentials -> access_token (expires_in ~3600s),
//             cached in Redis with a safety buffer (see TOKEN_TTL_BUFFER_S).
//
// Everything Pathao-shaped lives here; the service layer and webhook route see
// only the provider-neutral CourierAdapter contract from ./types.
//
// MONEY: amount_to_collect is taka; order codAmount is paisa. Convert once here.

const SANDBOX_BASE = "https://sandbox-merchant.pathao.com/aladdin/api/v1";
const LIVE_BASE = "https://merchant.pathao.com/aladdin/api/v1";

// Cache the OAuth token for (expires_in - 50s) so an in-flight request can never
// fire with a token that expires mid-flight.
const TOKEN_TTL_BUFFER_S = 50;
const TOKEN_CACHE_KEY = "courier:pathao:token";

// Pathao's fixed codes for a normal parcel delivery.
const DELIVERY_TYPE_NORMAL = 48;
const ITEM_TYPE_PARCEL = 2;

// --- Status mapping (status_slug -> internal) -------------------------------
// The internal enum has no PROCESSING/SHIPPED members; per the project's
// CourierStatus those buckets are PENDING / IN_TRANSIT respectively.

const PATHAO_STATUS_MAP: Record<string, CourierStatus> = {
  pending: "PENDING",
  pickup_requested: "PENDING",
  picked_up: "IN_TRANSIT",
  in_transit: "IN_TRANSIT",
  delivered: "DELIVERED",
  partial_delivery: "DELIVERED",
  return_in_transit: "RETURNED",
  return: "RETURNED",
  cancelled: "CANCELLED",
};

function mapPathaoStatus(raw: string): CourierStatus {
  // Slugs arrive with mixed casing / spaces / hyphens depending on endpoint.
  const key = raw.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return PATHAO_STATUS_MAP[key] ?? "PENDING";
}

// --- Config / HTTP helpers --------------------------------------------------

function requireConfig(config: PathaoConfig | null): PathaoConfig {
  if (!config) throw new CourierNotConfiguredError();
  return config;
}

function baseUrl(config: PathaoConfig): string {
  return config.mode === "live" ? LIVE_BASE : SANDBOX_BASE;
}

/** Namespace the token cache by mode so sandbox/live tokens never collide. */
function tokenCacheKey(config: PathaoConfig): string {
  return `${TOKEN_CACHE_KEY}:${config.mode}`;
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

/** Human-readable error out of a Pathao error body. */
function describeError(status: number, body: Record<string, unknown>): string {
  if (status === 401 || status === 403) {
    return "Pathao rejected the credentials — check the client id and secret.";
  }
  const msg = body.message;
  const errors = body.errors;
  const detail =
    (typeof msg === "string" && msg) ||
    (errors ? JSON.stringify(errors) : "") ||
    (typeof body._raw === "string" ? body._raw.slice(0, 200) : "") ||
    `HTTP ${status}`;
  return `Pathao request failed (${status}): ${detail}`;
}

// --- OAuth token (Redis-cached) ---------------------------------------------

async function fetchNewToken(config: PathaoConfig): Promise<string> {
  let response: Response;
  try {
    response = await fetch(`${baseUrl(config)}/issue-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "client_credentials",
      }),
    });
  } catch (err) {
    throw new CourierProviderError(
      `Could not reach Pathao to authenticate. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  const body = await readJson(response);
  if (!response.ok) throw new CourierProviderError(describeError(response.status, body));

  const token = body.access_token;
  const expiresIn = body.expires_in;
  if (typeof token !== "string" || !token) {
    throw new CourierProviderError("Pathao returned no access token.");
  }

  // Cache with a safety buffer; fall back to a conservative TTL if Pathao omits
  // expires_in for some reason.
  const ttl =
    typeof expiresIn === "number" && expiresIn > TOKEN_TTL_BUFFER_S
      ? expiresIn - TOKEN_TTL_BUFFER_S
      : 3600 - TOKEN_TTL_BUFFER_S;
  try {
    await redis.set(tokenCacheKey(config), token, "EX", ttl);
  } catch {
    // A Redis hiccup must not break shipping — we just won't cache this token.
  }
  return token;
}

async function getToken(config: PathaoConfig): Promise<string> {
  try {
    const cached = await redis.get(tokenCacheKey(config));
    if (cached) return cached;
  } catch {
    // Redis unavailable — fall through and fetch a fresh token every time.
  }
  return fetchNewToken(config);
}

/** Authenticated JSON call. Retries once on 401 with a fresh token, since a
 *  cached token can expire between our buffer and the actual server clock. */
async function callPathao(
  config: PathaoConfig,
  path: string,
  init: RequestInit,
  retryOn401 = true,
): Promise<Record<string, unknown>> {
  const token = await getToken(config);

  let response: Response;
  try {
    response = await fetch(`${baseUrl(config)}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    throw new CourierProviderError(
      `Could not reach Pathao. Check your network. (${
        err instanceof Error ? err.message : String(err)
      })`,
    );
  }

  if (response.status === 401 && retryOn401) {
    try {
      await redis.del(tokenCacheKey(config));
    } catch {
      /* ignore */
    }
    return callPathao(config, path, init, false);
  }

  const body = await readJson(response);
  if (!response.ok) throw new CourierProviderError(describeError(response.status, body));
  return body;
}

/** Pathao wraps success payloads as { code, message, data: {...} }. */
function unwrapData(body: Record<string, unknown>): Record<string, unknown> {
  const data = body.data;
  return data && typeof data === "object" ? (data as Record<string, unknown>) : body;
}

// --- Adapter contract -------------------------------------------------------

async function createConsignment(
  input: CreateConsignmentInput,
): Promise<ConsignmentResult> {
  const config = requireConfig(await getPathaoConfig());

  if (
    input.recipientCityId == null ||
    input.recipientZoneId == null ||
    input.recipientAreaId == null
  ) {
    throw new CourierProviderError(
      "Pathao needs the recipient city, zone, and area — select them before creating the consignment.",
    );
  }
  if (!config.storeId) {
    throw new CourierProviderError(
      "Pathao store id is not set — configure it under Admin > Settings > Courier.",
    );
  }

  const body = await callPathao(config, "/orders/draft", {
    method: "POST",
    body: JSON.stringify({
      store_id: config.storeId,
      merchant_order_id: input.orderNo,
      sender_name: config.senderName,
      sender_phone: config.senderPhone,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      recipient_city: input.recipientCityId,
      recipient_zone: input.recipientZoneId,
      recipient_area: input.recipientAreaId,
      delivery_type: DELIVERY_TYPE_NORMAL,
      item_type: ITEM_TYPE_PARCEL,
      special_instruction: input.specialInstruction ?? "",
      item_quantity: input.itemQuantity ?? 1,
      item_weight: input.itemWeight ?? 0.5,
      amount_to_collect: paisaToTaka(input.codAmount),
      item_description: input.itemDescription ?? input.orderNo,
    }),
  });

  const data = unwrapData(body);
  const cid = data.consignment_id ?? data.order_id;
  if (cid == null) {
    throw new CourierProviderError(
      "Pathao accepted the request but returned no consignment id.",
    );
  }

  return {
    consignmentId: String(cid),
    trackingCode: data.consignment_id ? String(data.consignment_id) : null,
    status: mapPathaoStatus(String(data.order_status ?? data.status ?? "pending")),
  };
}

async function getConsignmentStatus(consignmentId: string): Promise<CourierStatus> {
  const config = requireConfig(await getPathaoConfig());
  const body = await callPathao(
    config,
    `/orders/${encodeURIComponent(consignmentId)}/summary`,
    { method: "GET" },
  );
  const data = unwrapData(body);
  return mapPathaoStatus(String(data.order_status ?? data.status_slug ?? data.status ?? "pending"));
}

async function testConnection(): Promise<TestConnectionResult> {
  try {
    const config = requireConfig(await getPathaoConfig());
    // A successful token issue proves the client id/secret are valid.
    await fetchNewToken(config);
    return { ok: true, message: "Connection successful — Pathao credentials are valid." };
  } catch (err) {
    if (err instanceof CourierProviderError || err instanceof CourierNotConfiguredError) {
      return { ok: false, message: err.message };
    }
    return { ok: false, message: err instanceof Error ? err.message : "Connection failed." };
  }
}

/**
 * Pathao webhook body carries consignment_id and a status/order_status slug.
 * Signature verification is the route's job.
 */
function parseWebhook(raw: unknown): ParsedWebhook | null {
  if (!raw || typeof raw !== "object") return null;
  const p = raw as Record<string, unknown>;
  const cid = p.consignment_id ?? p.merchant_order_id;
  const status = p.order_status ?? p.status ?? p.event;
  if (cid == null || status == null) return null;
  return { consignmentId: String(cid), status: mapPathaoStatus(String(status)) };
}

export const pathaoAdapter: CourierAdapter = {
  provider: "PATHAO",
  createConsignment,
  getConsignmentStatus,
  testConnection,
  parseWebhook,
};

// --- Location helpers (for the Create-Consignment picker) -------------------
// Pathao requires numeric city/zone/area ids, resolved through these cascading
// lists. Exposed as server actions by the order page.

export interface PathaoLocation {
  id: number;
  name: string;
}

/** Pathao location endpoints wrap the array under data.data ({city|zone|area}_list). */
function parseLocationList(body: Record<string, unknown>, listKey: string): PathaoLocation[] {
  const data = unwrapData(body);
  const list = data[listKey];
  if (!Array.isArray(list)) return [];
  return list.flatMap((item): PathaoLocation[] => {
    if (!item || typeof item !== "object") return [];
    const rec = item as Record<string, unknown>;
    const id = rec.city_id ?? rec.zone_id ?? rec.area_id ?? rec.id;
    const name = rec.city_name ?? rec.zone_name ?? rec.area_name ?? rec.name;
    if (id == null || name == null) return [];
    return [{ id: Number(id), name: String(name) }];
  });
}

export async function getPathaoCities(): Promise<PathaoLocation[]> {
  const config = requireConfig(await getPathaoConfig());
  const body = await callPathao(config, "/city-list", { method: "GET" });
  return parseLocationList(body, "data");
}

export async function getPathaoZones(cityId: number): Promise<PathaoLocation[]> {
  const config = requireConfig(await getPathaoConfig());
  const body = await callPathao(config, `/cities/${cityId}/zone-list`, { method: "GET" });
  return parseLocationList(body, "data");
}

export async function getPathaoAreas(zoneId: number): Promise<PathaoLocation[]> {
  const config = requireConfig(await getPathaoConfig());
  const body = await callPathao(config, `/zones/${zoneId}/area-list`, { method: "GET" });
  return parseLocationList(body, "data");
}
