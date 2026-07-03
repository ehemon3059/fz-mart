import { getLocalizationConfig } from "@/server/settings/localization";
import LocalizationForm from "./LocalizationForm";

export const metadata = { title: "Localization — FZ-Mart Admin" };

export default async function LocalizationSettingsPage() {
  const config = await getLocalizationConfig();
  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          Localization
        </h1>
        <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
          Storefront language default and Bangla number formatting. Product content is shown exactly
          as you enter it.
        </p>
      </div>
      <div className="mt-6">
        <LocalizationForm config={config} />
      </div>
    </div>
  );
}
