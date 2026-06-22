import { getCourierConfig } from "@/server/settings/courier";

// Generic courier adapter interface. No provider (Pathao / Steadfast / RedX)
// is wired in yet — this is a stub that logs the request and returns a fake
// consignment id, so the order->shipment->webhook pipeline can be built and
// tested before a real account exists.
//
// Swapping in a real provider means rewriting only the two functions below;
// the service layer (server/courier/), webhook route, and admin UI never
// change, because all provider-specific request/response shapes are
// translated to/from this interface right here.

export interface CreateConsignmentInput {
  orderNo: string;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  codAmount: number;
}

export interface ConsignmentResult {
  consignmentId: string;
  trackingCode: string | null;
  status: string;
}

export class CourierNotConfiguredError extends Error {
  constructor() {
    super("Courier is not configured — set it under Admin > Settings > Courier.");
    this.name = "CourierNotConfiguredError";
  }
}

export async function createConsignment(
  input: CreateConsignmentInput,
): Promise<ConsignmentResult> {
  const config = await getCourierConfig();
  if (!config) {
    throw new CourierNotConfiguredError();
  }

  if (!config.apiUrl) {
    // No real provider wired yet — stub response so the pipeline (service
    // layer, CourierShipment row, admin UI, webhook) is provably correct
    // ahead of a real integration.
    const fakeId = `STUB-${Date.now()}`;
    console.log(
      `[courier:stub] would create consignment for order ${input.orderNo} ` +
        `(COD ${input.codAmount}) -> ${fakeId}`,
    );
    return { consignmentId: fakeId, trackingCode: fakeId, status: "pending" };
  }

  const response = await fetch(`${config.apiUrl}/consignments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      invoice: input.orderNo,
      recipient_name: input.recipientName,
      recipient_phone: input.recipientPhone,
      recipient_address: input.recipientAddress,
      cod_amount: input.codAmount,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Courier provider responded ${response.status}: ${await response.text()}`,
    );
  }

  const data = await response.json();
  return {
    consignmentId: String(data.consignment_id),
    trackingCode: data.tracking_code ? String(data.tracking_code) : null,
    status: String(data.status ?? "pending"),
  };
}

export async function getConsignmentStatus(consignmentId: string): Promise<string> {
  const config = await getCourierConfig();
  if (!config) {
    throw new CourierNotConfiguredError();
  }

  if (!config.apiUrl) {
    console.log(`[courier:stub] would fetch status for ${consignmentId}`);
    return "pending";
  }

  const response = await fetch(`${config.apiUrl}/consignments/${consignmentId}`, {
    headers: { Authorization: `Bearer ${config.apiKey}` },
  });

  if (!response.ok) {
    throw new Error(
      `Courier provider responded ${response.status}: ${await response.text()}`,
    );
  }

  const data = await response.json();
  return String(data.status ?? "unknown");
}
