import { getSettingGroup, setSetting } from "@/lib/settings";

// RedX courier credentials — own setting group. RedX uses a single static
// Bearer API key (sandbox vs live is chosen by which key you paste), so there's
// no mode toggle. Secrets encrypted at rest, same pattern as the others.

const GROUP = "courier_redx";

export interface RedxConfig {
  /** Static Bearer token issued by RedX. */
  apiKey: string;
  /** RedX pickup store id parcels are dispatched from. */
  pickupStoreId: string;
  senderName: string;
  senderPhone: string;
  /** Shared secret used to verify inbound webhook signatures. */
  webhookSecret: string;
}

/** Returns null when RedX isn't configured (no api key). */
export async function getRedxConfig(): Promise<RedxConfig | null> {
  const s = await getSettingGroup(GROUP);
  if (!s.apiKey) return null;

  return {
    apiKey: s.apiKey,
    pickupStoreId: s.pickupStoreId ?? "",
    senderName: s.senderName ?? "",
    senderPhone: s.senderPhone ?? "",
    webhookSecret: s.webhookSecret ?? "",
  };
}

export async function saveRedxConfig(config: RedxConfig): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "apiKey", value: config.apiKey, encrypted: true }),
    setSetting({ group: GROUP, key: "pickupStoreId", value: config.pickupStoreId }),
    setSetting({ group: GROUP, key: "senderName", value: config.senderName }),
    setSetting({ group: GROUP, key: "senderPhone", value: config.senderPhone }),
    setSetting({ group: GROUP, key: "webhookSecret", value: config.webhookSecret, encrypted: true }),
  ]);
}
