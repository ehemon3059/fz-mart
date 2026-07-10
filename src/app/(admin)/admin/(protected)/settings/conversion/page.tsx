import { getConversionConfig } from "@/server/settings/conversion";
import ConversionPageClient from "./ConversionPageClient";

export const metadata = { title: "Conversion — FZ-Mart Admin" };

export default async function ConversionSettingsPage() {
  const config = await getConversionConfig();

  return (
    <ConversionPageClient
      config={{
        otpEnabled: config.otpEnabled,
        returnWindowDays: config.returnWindowDays,
        abandonedCartEnabled: config.abandonedCartEnabled,
        abandonedCartDelayHours: config.abandonedCartDelayHours,
        abandonedCartMessage: config.abandonedCartMessage,
      }}
    />
  );
}
