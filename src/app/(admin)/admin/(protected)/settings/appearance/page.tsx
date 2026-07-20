import { getBrandPalette, getThemeLayout } from "@/server/settings/theme";
import { getConversionConfig } from "@/server/settings/conversion";
import { getLogoUrl } from "@/server/settings/branding";
import { getCompanyInfo } from "@/server/settings/company";
import { getSiteUrlSetting, primeSiteUrl } from "@/server/settings/site";
import { siteUrl } from "@/lib/seo";
import AppearanceForm from "./AppearanceForm";
import LayoutForm from "./LayoutForm";
import ChatSettingsForm from "./ChatSettingsForm";
import CompanyInfoForm from "./CompanyInfoForm";
import LogoForm from "./LogoForm";
import SiteUrlForm from "./SiteUrlForm";

export const metadata = { title: "Appearance — FZ-Mart Admin" };

export default async function AppearanceSettingsPage() {
  await primeSiteUrl();
  const [palette, layout, conversion, logoUrl, configuredUrl, companyInfo] = await Promise.all([
    getBrandPalette(),
    getThemeLayout(),
    getConversionConfig(),
    getLogoUrl(),
    getSiteUrlSetting(),
    getCompanyInfo(),
  ]);
  const effectiveUrl = siteUrl();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-12 sm:px-7 sm:py-8">
      <h1 className="text-[26px] font-extrabold tracking-tight text-stone-900">Appearance</h1>
      <p className="mt-1 max-w-xl text-[14.5px] text-stone-500">
        Choose the storefront brand colour. Pick a preset or set any custom colour — it applies to every page
        instantly after saving.
      </p>

      <div className="mt-6">
        <SiteUrlForm initialValue={configuredUrl} effectiveUrl={effectiveUrl} />
      </div>

      <div className="mt-6">
        <LogoForm initialLogoUrl={logoUrl} />
      </div>

      <div className="mt-6">
        <AppearanceForm initial={palette} />
      </div>

      <div className="mt-6">
        <LayoutForm initial={layout} />
      </div>

      <div className="mt-8">
        <ChatSettingsForm
          whatsappNumber={conversion.whatsappNumber}
          messengerUrl={conversion.messengerUrl}
        />
      </div>

      <div className="mt-8">
        <CompanyInfoForm initial={companyInfo} />
      </div>
    </div>
  );
}
