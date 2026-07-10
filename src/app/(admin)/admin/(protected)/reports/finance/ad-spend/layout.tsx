import { requirePermission } from "@/server/admin/guard";

// Area guard: every page under reports/finance/ad-spend/ requires the "expenses"
// permission (ad spend is owner-level finance entry, same as manual expenses).
export default async function AreaLayout({ children }: { children: React.ReactNode }) {
  await requirePermission("expenses");
  return <>{children}</>;
}
