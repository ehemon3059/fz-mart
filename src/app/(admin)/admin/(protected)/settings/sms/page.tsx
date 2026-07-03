import { getSmsConfig } from "@/server/settings/sms";
import { Icon } from "@/components/icons";
import SmsForm from "./SmsForm";

export const metadata = { title: "SMS Gateway — FZ-Mart Admin" };

const INFO_CARDS = [
  {
    icon: "info" as const,
    title: "What is SMS Gateway?",
    body: "A service that lets your store send text messages — order confirmations, OTPs, delivery updates — straight to a customer's phone via an API, instead of through an app like WhatsApp.",
  },
  {
    icon: "warn" as const,
    title: "Why need SMS Gateway?",
    body: "Most customers in BD don't watch email, but they always see SMS. It confirms orders instantly, reduces fake/cancelled COD orders, and builds trust without needing the customer to install anything.",
  },
  {
    icon: "globe" as const,
    title: "Where to get one?",
    body: "Local BD providers like SSL Wireless, Alpha SMS, BulkSMSBD, REVE Systems, or Banglalink/Grameenphone's masking SMS API. Sign up, complete KYC, and you'll get an API URL, API key, and a sender ID (mask).",
  },
  {
    icon: "settings" as const,
    title: "How to setup?",
    body: "Paste the provider's send-SMS API URL, your API key, and approved sender ID below. Leave the API URL blank during development — sends will be logged to the console instead of actually going out.",
  },
];

export default async function SmsSettingsPage() {
  const config = await getSmsConfig();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            SMS Gateway
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
            {config ? "Gateway configured — sends go live." : "No provider configured — sends are logged to console."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {INFO_CARDS.map((card) => (
          <div key={card.title} className="rounded-xl border border-stone-200 bg-white p-4 shadow-soft sm:p-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
              <Icon name={card.icon} size={18} />
            </div>
            <h3 className="mt-3 text-[14.5px] font-bold text-stone-800">{card.title}</h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-stone-500">{card.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <SmsForm config={config} />
      </div>
    </div>
  );
}
