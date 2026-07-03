import { requirePermission } from "@/server/admin/guard";

export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("returns");
  return <>{children}</>;
}
