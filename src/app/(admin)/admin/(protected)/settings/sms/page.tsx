import { getSmsConfig } from "@/server/settings/sms";
import SmsPageClient from "./SmsPageClient";

export const metadata = { title: "SMS Gateway — FZ-Mart Admin" };

export default async function SmsSettingsPage() {
  const config = await getSmsConfig();
  return <SmsPageClient config={config} />;
}
