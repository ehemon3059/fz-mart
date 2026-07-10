import { getCourierConfig } from "@/server/settings/courier";
import { getPathaoConfig } from "@/server/settings/courier-pathao";
import { getRedxConfig } from "@/server/settings/courier-redx";
import { getActiveProvider } from "@/server/settings/courier-active";
import CourierPageClient from "./CourierPageClient";

export const metadata = { title: "Courier API — FZ-Mart Admin" };

export default async function CourierSettingsPage() {
  const [config, pathao, redx, active] = await Promise.all([
    getCourierConfig(),
    getPathaoConfig(),
    getRedxConfig(),
    getActiveProvider(),
  ]);

  // Only non-secret fields cross to the client. Decrypted keys/secrets must
  // never be serialized into the browser payload — the forms edit them
  // write-only (blank input == keep current).
  const safeConfig = config
    ? { provider: config.provider, apiUrl: config.apiUrl }
    : null;
  const safePathao = pathao
    ? {
        storeId: pathao.storeId,
        senderName: pathao.senderName,
        senderPhone: pathao.senderPhone,
        mode: pathao.mode,
      }
    : null;
  const safeRedx = redx
    ? {
        pickupStoreId: redx.pickupStoreId,
        senderName: redx.senderName,
        senderPhone: redx.senderPhone,
      }
    : null;

  return (
    <CourierPageClient
      config={safeConfig}
      pathao={safePathao}
      redx={safeRedx}
      activeProvider={active}
      configured={{
        steadfast: config != null,
        pathao: pathao != null,
        redx: redx != null,
      }}
    />
  );
}
