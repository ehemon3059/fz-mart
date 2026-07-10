import { listBlockedIps } from "@/server/settings/ipBlock";
import IpBlockPageClient from "./IpBlockPageClient";

export const metadata = { title: "IP Block — FZ-Mart Admin" };

export default async function IpBlockPage() {
  const blocked = await listBlockedIps();
  const rows = blocked.map((row) => ({
    id: row.id,
    ip: row.ip,
    reason: row.reason ?? null,
    createdAt: row.createdAt.toLocaleDateString("en-BD"),
  }));

  return <IpBlockPageClient rows={rows} count={blocked.length} />;
}
