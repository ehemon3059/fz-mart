import { getSetting, setSetting } from "@/lib/settings";
import type { CourierProvider } from "@prisma/client";

// Which provider is the DEFAULT for NEW consignments. This is a pure default:
// once a consignment exists, its provider is frozen on Order.courierProvider,
// and status refresh / webhooks dispatch to THAT provider — never this setting.
// So changing the active provider never affects already-shipped orders.

const GROUP = "courier";
const KEY = "activeProvider";

const VALID: readonly CourierProvider[] = ["STEADFAST", "PATHAO", "REDX"];

function isProvider(v: string | null): v is CourierProvider {
  return v != null && (VALID as readonly string[]).includes(v);
}

/** The configured default provider, or null if none has been chosen. */
export async function getActiveProvider(): Promise<CourierProvider | null> {
  const raw = await getSetting(GROUP, KEY);
  return isProvider(raw) ? raw : null;
}

export async function setActiveProvider(provider: CourierProvider): Promise<void> {
  await setSetting({ group: GROUP, key: KEY, value: provider });
}
