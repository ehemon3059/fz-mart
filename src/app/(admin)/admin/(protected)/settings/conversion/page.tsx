import { getConversionConfig } from "@/server/settings/conversion";
import ConversionForm from "./ConversionForm";

export const metadata = { title: "Conversion — FZ-Mart Admin" };

export default async function ConversionSettingsPage() {
  const config = await getConversionConfig();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          Conversion &amp; Anti-Fraud
        </h1>
        <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
          Phone OTP, returns, and abandoned-cart recovery. (Chat buttons live under Appearance.)
        </p>
      </div>

      <div className="mt-6">
        <ConversionForm
          config={{
            otpEnabled: config.otpEnabled,
            returnWindowDays: config.returnWindowDays,
            abandonedCartEnabled: config.abandonedCartEnabled,
            abandonedCartDelayHours: config.abandonedCartDelayHours,
            abandonedCartMessage: config.abandonedCartMessage,
          }}
        />
      </div>
    </div>
  );
}
