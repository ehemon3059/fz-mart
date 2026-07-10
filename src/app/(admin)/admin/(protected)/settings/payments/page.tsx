import { getPaymentsConfig } from "@/server/settings/payments";
import PaymentsPageClient from "./PaymentsPageClient";

export const metadata = { title: "Payments — FZ-Mart Admin" };

export default async function PaymentsSettingsPage() {
  const config = await getPaymentsConfig();

  return (
    // Secrets never reach the client — only whether one is stored.
    <PaymentsPageClient
      config={{
        onlineEnabled: config.onlineEnabled,
        partialEnabled: config.partialEnabled,
        sslcommerz: {
          enabled: config.sslcommerz.enabled,
          sandbox: config.sslcommerz.sandbox,
          storeId: config.sslcommerz.storeId,
          feeBps: config.sslcommerz.feeBps,
          hasPassword: Boolean(config.sslcommerz.storePassword),
        },
        bkash: {
          enabled: config.bkash.enabled,
          sandbox: config.bkash.sandbox,
          appKey: config.bkash.appKey,
          username: config.bkash.username,
          feeBps: config.bkash.feeBps,
          hasSecret: Boolean(config.bkash.appSecret),
        },
        mock: { enabled: config.mock.enabled },
      }}
    />
  );
}
