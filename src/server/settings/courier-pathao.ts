import { getSettingGroup, setSetting } from "@/lib/settings";

// Pathao courier credentials — own setting group so it coexists with the
// legacy Steadfast `courier` group and the `courier_redx` group. Secrets are
// encrypted at rest via setSetting({ encrypted: true }), same as SMTP/SMS.

const GROUP = "courier_pathao";

export type PathaoMode = "sandbox" | "live";

export interface PathaoConfig {
  clientId: string;
  clientSecret: string;
  /** Pathao store id parcels are created against. */
  storeId: string;
  senderName: string;
  senderPhone: string;
  mode: PathaoMode;
  /** Shared secret used to verify inbound webhook signatures. */
  webhookSecret: string;
}

/** Returns null when Pathao isn't configured (no client id/secret). */
export async function getPathaoConfig(): Promise<PathaoConfig | null> {
  const s = await getSettingGroup(GROUP);
  if (!s.clientId || !s.clientSecret) return null;

  return {
    clientId: s.clientId,
    clientSecret: s.clientSecret,
    storeId: s.storeId ?? "",
    senderName: s.senderName ?? "",
    senderPhone: s.senderPhone ?? "",
    mode: s.mode === "live" ? "live" : "sandbox",
    webhookSecret: s.webhookSecret ?? "",
  };
}

export async function savePathaoConfig(config: PathaoConfig): Promise<void> {
  await Promise.all([
    setSetting({ group: GROUP, key: "clientId", value: config.clientId, encrypted: true }),
    setSetting({ group: GROUP, key: "clientSecret", value: config.clientSecret, encrypted: true }),
    setSetting({ group: GROUP, key: "storeId", value: config.storeId }),
    setSetting({ group: GROUP, key: "senderName", value: config.senderName }),
    setSetting({ group: GROUP, key: "senderPhone", value: config.senderPhone }),
    setSetting({ group: GROUP, key: "mode", value: config.mode }),
    setSetting({ group: GROUP, key: "webhookSecret", value: config.webhookSecret, encrypted: true }),
  ]);
}
