import { getSettingGroup, setSetting } from "@/lib/settings";

// Inventory settings (Phase 5): currently just the optional daily low-stock
// email digest toggle. Stored in the "inventory" group.

const GROUP = "inventory";

export interface InventoryConfig {
  digestEnabled: boolean;
}

export async function getInventoryConfig(): Promise<InventoryConfig> {
  const g = await getSettingGroup(GROUP);
  return { digestEnabled: g.digestEnabled === "true" };
}

export async function saveInventoryConfig(config: InventoryConfig): Promise<void> {
  await setSetting({ group: GROUP, key: "digestEnabled", value: String(config.digestEnabled) });
}
