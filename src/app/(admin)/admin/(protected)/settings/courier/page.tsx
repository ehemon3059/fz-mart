import { getCourierConfig } from "@/server/settings/courier";
import { Icon } from "@/components/icons";
import CourierForm from "./CourierForm";

export const metadata = { title: "Courier API — FZ-Mart Admin" };

const INFO_CARDS = [
  {
    icon: "warn" as const,
    title: "Why need Courier API?",
    body: "It connects your store directly to a delivery company so orders are pushed to them automatically — no manual data entry — and their status updates (picked up, in transit, delivered, returned) flow back into your order page in real time.",
  },
  {
    icon: "globe" as const,
    title: "Where to get one?",
    body: "Local BD courier services like Steadfast, Pathao Courier, RedX, eCourier, or Paperfly all offer a merchant API. Sign up for a business account, complete KYC, and they'll issue an API URL and API key from their merchant dashboard.",
  },
  {
    icon: "settings" as const,
    title: "How to setup?",
    body: "Enter the provider name, API URL, and API key below. Set the webhook secret they give you to verify delivery-status callbacks, and point their webhook setting to /api/webhooks/courier. Leave the API URL blank during development to log requests instead of sending them.",
  },
];

export default async function CourierSettingsPage() {
  const config = await getCourierConfig();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            Courier API
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
            {config ? `${config.provider || "Provider"} connected — consignments go live.` : "No provider configured — consignments are logged to console."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
        <CourierForm config={config} />
      </div>
    </div>
  );
}
