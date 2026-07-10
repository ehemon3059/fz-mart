import { getSmtpConfig } from "@/server/settings/smtp";
import SmtpPageClient from "./SmtpPageClient";

export const metadata = { title: "SMTP (Mail) — FZ-Mart Admin" };

export default async function SmtpSettingsPage() {
  const config = await getSmtpConfig();
  return <SmtpPageClient config={config} />;
}
