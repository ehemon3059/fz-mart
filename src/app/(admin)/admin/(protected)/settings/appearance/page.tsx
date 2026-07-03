import Link from "next/link";
import { getBrandPalette } from "@/server/settings/theme";
import { getConversionConfig } from "@/server/settings/conversion";
import { Icon } from "@/components/icons";
import AppearanceForm from "./AppearanceForm";
import ChatSettingsForm from "./ChatSettingsForm";

export const metadata = { title: "Appearance — FZ-Mart Admin" };

export default async function AppearanceSettingsPage() {
  const [palette, conversion] = await Promise.all([getBrandPalette(), getConversionConfig()]);

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-12 sm:px-7 sm:py-8">
      <Link
        href="/admin/settings/shipping"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Settings
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">Appearance</h1>
      <p className="mt-1 max-w-xl text-[14.5px] text-stone-500">
        Choose the storefront brand colour. Pick a preset or set any custom colour — it applies to every page
        instantly after saving.
      </p>

      <div className="mt-6">
        <AppearanceForm initial={palette} />
      </div>

      <div className="mt-8">
        <ChatSettingsForm
          whatsappNumber={conversion.whatsappNumber}
          messengerUrl={conversion.messengerUrl}
        />
      </div>
    </div>
  );
}
