"use client";

import { useState, useTransition } from "react";
import { createShipment, refreshShipmentStatus } from "./courier-actions";

interface Props {
  orderId: number;
  shipment: {
    courierName: string;
    consignmentId: string;
    trackingCode: string | null;
    courierStatus: string;
    lastSyncedAt: Date;
  } | null;
}

export default function CourierPanel({ orderId, shipment }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      const result = await createShipment(orderId);
      if (result?.error) setError(result.error);
    });
  }

  function handleRefresh() {
    setError(null);
    startTransition(async () => {
      const result = await refreshShipmentStatus(orderId);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <div className="border rounded-lg bg-white p-6 space-y-3">
      <h2 className="font-semibold">Courier Shipment</h2>
      {shipment ? (
        <div className="space-y-1 text-sm">
          <p>
            <span className="text-gray-500">Provider:</span> {shipment.courierName}
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
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500 mb-3">No shipment created yet.</p>
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
