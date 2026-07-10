import { getCapiConfig } from "@/server/settings/tracking";
import PixelPageClient from "./PixelPageClient";

export const metadata = { title: "Pixel Manager — FZ-Mart Admin" };

export default async function PixelSettingsPage() {
  const { pixelId, accessToken, testEventCode } = await getCapiConfig();

  return (
    // Never ship the raw access token to the browser — only whether one is
    // set, so the field can show a "saved" placeholder.
    <PixelPageClient
      initialPixelId={pixelId}
      hasAccessToken={Boolean(accessToken)}
      initialTestEventCode={testEventCode ?? ""}
    />
  );
}
