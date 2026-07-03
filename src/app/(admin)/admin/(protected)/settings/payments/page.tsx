import { getPaymentsConfig } from "@/server/settings/payments";
import PaymentsForm from "./PaymentsForm";

export const metadata = { title: "Payments — FZ-Mart Admin" };

export default async function PaymentsSettingsPage() {
  const config = await getPaymentsConfig();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div>
        <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
          Payments
        </h1>
        <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
          {config.onlineEnabled
            ? "Online payment is live at checkout."
            : "Online payment is off — checkout is COD only."}
        </p>
      </div>

      <div className="mt-6">
        {/* Secrets never reach the client — only whether one is stored. */}
        <PaymentsForm
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
      </div>
    </div>
  );
}
