import { listBlockedIps } from "@/server/settings/ipBlock";
import { Icon } from "@/components/icons";
import AddIpForm from "./AddIpForm";
import { BlockedIpList } from "./BlockedIpList";

export const metadata = { title: "IP Block — FZ-Mart Admin" };

const INFO_CARDS = [
  {
    icon: "shield" as const,
    title: "What is IP Block?",
    body: "A list of IP addresses that are denied access to your storefront and admin endpoints. Any request from a blocked address is rejected immediately, before it reaches your app logic or database.",
  },
  {
    icon: "warn" as const,
    title: "Why we need this?",
    body: "It stops abusive traffic at the door — fake orders, credential stuffing, scraping, spam form submissions, and repeated failed logins — without you having to chase it down after the fact.",
  },
  {
    icon: "globe" as const,
    title: "How it protects you?",
    body: "Block the source IP behind suspicious activity (e.g. from order or login logs) and it's denied on every future request. Combine with rate limiting and strong auth for layered protection — IP blocking alone won't stop attackers using rotating IPs or VPNs.",
  },
];

export default async function IpBlockPage() {
  const blocked = await listBlockedIps();
  const rows = blocked.map((row) => ({
    id: row.id,
    ip: row.ip,
    reason: row.reason ?? null,
    createdAt: row.createdAt.toLocaleDateString("en-BD"),
  }));

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-8 pb-28 sm:px-7 lg:pb-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold tracking-tight text-stone-900 sm:text-[26px]">
            IP Block
          </h1>
          <p className="mt-1 text-[13.5px] text-stone-500 sm:text-[14.5px]">
            {blocked.length} address{blocked.length === 1 ? "" : "es"} currently blocked.
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
        <AddIpForm />
      </div>

      <div className="mt-6">
        <BlockedIpList initialRows={rows} />
      </div>
    </div>
  );
}
