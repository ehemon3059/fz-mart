import Link from "next/link";
import { getSmtpConfig } from "@/server/settings/smtp";
import { Icon } from "@/components/icons";
import SmtpForm from "./SmtpForm";

export const metadata = { title: "SMTP (Mail) — FZ-Mart Admin" };

export default async function SmtpSettingsPage() {
  const config = await getSmtpConfig();

  return (
    <div className="font-manrope mx-auto max-w-[1080px] px-4 py-6 pb-12 sm:px-7 sm:py-8">
      <Link
        href="/admin/settings/shipping"
        className="inline-flex items-center gap-1.5 text-[13.5px] font-medium text-stone-500 hover:text-stone-800"
      >
        <Icon name="arrowLeft" size={16} /> Settings
      </Link>
      <h1 className="mt-3 text-[26px] font-extrabold tracking-tight text-stone-900">SMTP (Mail)</h1>
      <p className="mt-1 max-w-xl text-[14.5px] text-stone-500">
        Set up outgoing email so your store can send order confirmations and sign-in links. Follow a guide on
        the right, then save your credentials.
      </p>

      <div className="mt-6">
        <SmtpForm config={config} />
      </div>
    </div>
  );
}
