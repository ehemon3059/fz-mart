import { getSmtpConfig } from "@/server/settings/smtp";
import SmtpForm from "./SmtpForm";

export default async function SmtpSettingsPage() {
  const config = await getSmtpConfig();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">SMTP (Mail)</h1>
      <SmtpForm config={config} />
    </div>
  );
}
