import Link from "next/link";
import { getPixelId } from "@/server/settings/tracking";
import { Icon } from "@/components/icons";
import PixelForm from "./PixelForm";

export const metadata = { title: "Pixel Manager — FZ-Mart Admin" };

export default async function PixelSettingsPage() {
  const pixelId = await getPixelId();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-12 sm:px-7 sm:py-8">
      <Link
        href="/admin/settings/shipping"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Settings
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">Pixel Manager</h1>
      <p className="mt-1 max-w-xl text-[14.5px] text-stone-500">
        Connect your Meta (Facebook) Pixel to track conversions and power your Facebook &amp; Instagram ads.
      </p>

      <div className="mt-6">
        <PixelForm initialPixelId={pixelId} />
      </div>
    </div>
  );
}
