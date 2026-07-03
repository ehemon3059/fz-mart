import { requirePermission } from "@/server/admin/guard";

// Area guard: every page under banners/ requires the "banners" permission.
// Centralised here so individual pages carry no ad-hoc role checks.
export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("banners");
  return <>{children}</>;
}
