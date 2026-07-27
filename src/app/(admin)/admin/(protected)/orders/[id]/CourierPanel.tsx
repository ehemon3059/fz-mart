"use client";

import { useEffect, useState, useTransition } from "react";
import type { CourierProvider } from "@prisma/client";
import {
  createShipment,
  refreshShipmentStatus,
  simulateShipmentStatus,
  fetchPathaoCities,
  fetchPathaoZones,
  fetchPathaoAreas,
  type CreateShipmentInput,
  type PathaoLocationResult,
} from "./courier-actions";
import type { CourierStatus } from "@/integrations/courier";

interface PathaoLocation {
  id: number;
  name: string;
}

interface Props {
  orderId: number;
  shipment: {
    courierName: string;
    consignmentId: string;
    trackingCode: string | null;
    courierStatus: string;
    lastSyncedAt: Date;
    /** Created by the Steadfast simulator — no real parcel exists. */
    isTest: boolean;
  } | null;
  /** Steadfast test mode is currently ON (affects NEW consignments only). */
  courierTestMode: boolean;
  /** Providers that have credentials configured. */
  available: CourierProvider[];
  /** Default provider for new consignments. */
  activeProvider: CourierProvider | null;
}

const PROVIDER_LABEL: Record<CourierProvider, string> = {
  STEADFAST: "Steadfast",
  PATHAO: "Pathao",
  REDX: "RedX",
};

/** Courier statuses an operator can force on a simulated shipment. */
const SIMULATABLE: { value: CourierStatus; label: string }[] = [
  { value: "PENDING", label: "Pending" },
  { value: "IN_TRANSIT", label: "In transit" },
  { value: "DELIVERED", label: "Delivered" },
  { value: "RETURNED", label: "Returned" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default function CourierPanel({
  orderId,
  shipment,
  available,
  activeProvider,
  courierTestMode,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Default the selector to the active provider if it's available, else first.
  const initialProvider =
    (activeProvider && available.includes(activeProvider) ? activeProvider : available[0]) ??
    null;
  const [provider, setProvider] = useState<CourierProvider | null>(initialProvider);

  // Pathao location cascade state.
  const [cityId, setCityId] = useState<number | "">("");
  const [zoneId, setZoneId] = useState<number | "">("");
  const [areaId, setAreaId] = useState<number | "">("");

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshShipmentStatus(orderId);
      if (result?.error) setError(result.error);
    });
  }

  function handleSimulate(status: CourierStatus) {
    setError(null);
    startTransition(async () => {
      const result = await simulateShipmentStatus(orderId, status);
      if (result?.error) setError(result.error);
    });
  }

  function handleCreate() {
    setError(null);
    if (!provider) {
      setError("No courier provider is configured. Set one under Settings > Courier.");
      return;
    }
    const input: CreateShipmentInput = { provider };
    if (provider === "PATHAO") {
      if (cityId === "" || zoneId === "" || areaId === "") {
        setError("Select the recipient city, zone, and area for Pathao.");
        return;
      }
      input.recipientCityId = cityId;
      input.recipientZoneId = zoneId;
      input.recipientAreaId = areaId;
    }
    startTransition(async () => {
      const result = await createShipment(orderId, input);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="border rounded-lg bg-white p-6 space-y-3">
      <h2 className="font-semibold">Courier Shipment</h2>
      {shipment ? (
        <div className="space-y-1 text-sm">
          {shipment.isTest && (
            <p className="mb-2 rounded border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-900">
              SIMULATED SHIPMENT — this consignment was never sent to Steadfast.
              No parcel exists and no COD will be collected.
            </p>
          )}
          <p>
            <span className="text-gray-500">Provider:</span>{" "}
            {PROVIDER_LABEL[shipment.courierName as CourierProvider] ?? shipment.courierName}
          </p>
          <p>
            <span className="text-gray-500">Consignment ID:</span>{" "}
            <span className="font-mono">{shipment.consignmentId}</span>
          </p>
          {shipment.trackingCode && (
            <p>
              <span className="text-gray-500">Tracking Code:</span>{" "}
              <span className="font-mono">{shipment.trackingCode}</span>
            </p>
          )}
          <p>
            <span className="text-gray-500">Status:</span> {shipment.courierStatus}
          </p>
          <p className="text-xs text-gray-400">
            Last synced {new Date(shipment.lastSyncedAt).toLocaleString("en-BD")}
          </p>
          <button
            onClick={handleRefresh}
            disabled={pending}
            className="mt-2 border rounded px-3 py-1.5 text-sm font-medium hover:border-black disabled:opacity-50"
          >
            {pending ? "Refreshing..." : "Refresh Status"}
          </button>

          {shipment.isTest && (
            <div className="mt-3 space-y-2 rounded border border-amber-200 bg-amber-50/60 p-3">
              <p className="text-xs font-medium text-gray-700">
                Simulate a courier update
              </p>
              <p className="text-xs text-gray-500">
                Refresh does nothing on a simulated shipment — there is no
                courier to poll. Use these to drive the order lifecycle instead.
                Delivered runs the same state machine and finance log as a real
                delivery.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {SIMULATABLE.map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleSimulate(s.value)}
                    disabled={pending || shipment.courierStatus === s.value}
                    className="rounded border border-amber-300 bg-white px-2.5 py-1 text-xs font-medium text-amber-900 hover:border-amber-500 disabled:opacity-40"
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : available.length === 0 ? (
        <p className="text-sm text-gray-500">
          No courier provider is configured. Set one under Settings &gt; Courier.
        </p>
      ) : (
        <div className="space-y-3">
          {courierTestMode && (provider === "STEADFAST" || provider === null) && (
            <p className="rounded border border-amber-300 bg-amber-50 px-2.5 py-2 text-xs font-medium text-amber-900">
              Steadfast test mode is ON — this will create a SIMULATED
              consignment. Nothing is sent to Steadfast and no parcel ships.
              Turn it off in Settings &gt; Courier to ship for real.
            </p>
          )}
          {available.length > 1 && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Courier</label>
              <select
                value={provider ?? ""}
                onChange={(e) => setProvider(e.target.value as CourierProvider)}
                className="w-full max-w-xs border rounded px-2 py-1.5 text-sm"
              >
                {available.map((p) => (
                  <option key={p} value={p}>
                    {PROVIDER_LABEL[p]}
                  </option>
                ))}
              </select>
            </div>
          )}

          {provider === "PATHAO" && (
            <PathaoLocationPicker
              cityId={cityId}
              zoneId={zoneId}
              areaId={areaId}
              onCity={(id) => {
                setCityId(id);
                setZoneId("");
                setAreaId("");
              }}
              onZone={(id) => {
                setZoneId(id);
                setAreaId("");
              }}
              onArea={setAreaId}
            />
          )}

          <button
            onClick={handleCreate}
            disabled={pending}
            className="border rounded px-3 py-1.5 text-sm font-medium hover:border-black disabled:opacity-50"
          >
            {pending ? "Creating..." : "Create Shipment"}
          </button>
        </div>
      )}
      {error && <p className="text-red-600 text-sm">{error}</p>}
    </div>
  );
}

// ── Pathao cascading city → zone → area picker ───────────────────────────────

function PathaoLocationPicker({
  cityId,
  zoneId,
  areaId,
  onCity,
  onZone,
  onArea,
}: {
  cityId: number | "";
  zoneId: number | "";
  areaId: number | "";
  onCity: (id: number) => void;
  onZone: (id: number) => void;
  onArea: (id: number) => void;
}) {
  const [cities, setCities] = useState<PathaoLocation[]>([]);
  const [zones, setZones] = useState<PathaoLocation[]>([]);
  const [areas, setAreas] = useState<PathaoLocation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function apply(res: PathaoLocationResult, set: (v: PathaoLocation[]) => void) {
    if (res.error) setError(res.error);
    else set(res.locations ?? []);
  }

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchPathaoCities()
      .then((res) => apply(res, setCities))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (cityId === "") {
      setZones([]);
      return;
    }
    setError(null);
    fetchPathaoZones(cityId).then((res) => apply(res, setZones));
  }, [cityId]);

  useEffect(() => {
    if (zoneId === "") {
      setAreas([]);
      return;
    }
    setError(null);
    fetchPathaoAreas(zoneId).then((res) => apply(res, setAreas));
  }, [zoneId]);

  const selectClass = "w-full max-w-xs border rounded px-2 py-1.5 text-sm disabled:opacity-50";

  return (
    <div className="space-y-2 rounded border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-medium text-gray-600">Pathao delivery location</p>
      <div>
        <label className="block text-xs text-gray-500 mb-1">City</label>
        <select
          value={cityId}
          disabled={loading}
          onChange={(e) => onCity(Number(e.target.value))}
          className={selectClass}
        >
          <option value="">{loading ? "Loading…" : "Select city"}</option>
          {cities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Zone</label>
        <select
          value={zoneId}
          disabled={cityId === ""}
          onChange={(e) => onZone(Number(e.target.value))}
          className={selectClass}
        >
          <option value="">Select zone</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Area</label>
        <select
          value={areaId}
          disabled={zoneId === ""}
          onChange={(e) => onArea(Number(e.target.value))}
          className={selectClass}
        >
          <option value="">Select area</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
