import { requirePermission } from "@/server/admin/guard";

// OWNER-only area (admin management + activity log).
export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("admins");
  return <>{children}</>;
}
