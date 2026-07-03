import { getFraudConfig } from "@/server/settings/fraud";
import { Icon } from "@/components/icons";
import FraudForm from "./FraudForm";

export const metadata = { title: "Fraud Check API — FZ-Mart Admin" };

const INFO_CARDS = [
  {
    icon: "shield" as const,
    title: "What is Fraud Check API?",
    body: "A service that scores a customer's phone number against known fraud/return patterns — fake orders, chronic COD refusers, abusive return history — and returns a risk level you can see before the order ships.",
  },
  {
    icon: "warn" as const,
    title: "Why need Fraud Check API?",
    body: "COD stores lose money to fake orders and repeat refusers. A risk score on the order list lets staff call to confirm or hold high-risk orders before dispatch, instead of finding out after the courier is already on the way.",
  },
  {
    icon: "globe" as const,
    title: "Where to get one?",
    body: "BD-focused options include Cloud Fraud Check, ShareTrip's Fraud Checker, or general SMS/courier providers (Steadfast, Pathao) that also expose a phone-risk lookup endpoint. Sign up for a merchant account to get an API URL and key.",
  },
  {
    icon: "settings" as const,
    title: "How to setup?",
    body: "Paste the provider's API URL and key below. The check runs once per customer phone at checkout, is cached, and never blocks an order — it only adds a risk indicator on the order list and detail pages for staff to review.",
  },
];

export default async function FraudSettingsPage() {
  const config = await getFraudConfig();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            Fraud Check API
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
            {config ? "Provider configured — checks run live." : "No provider configured — checks return a neutral, zero-risk result."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
        <FraudForm config={config} />
      </div>
    </div>
  );
}
