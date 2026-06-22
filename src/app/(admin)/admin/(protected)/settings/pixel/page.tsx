import { getPixelId } from "@/server/settings/tracking";
import PixelForm from "./PixelForm";

export default async function PixelSettingsPage() {
  const pixelId = await getPixelId();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Pixel Manager</h1>
      <PixelForm initialPixelId={pixelId} />
    </div>
  );
}
