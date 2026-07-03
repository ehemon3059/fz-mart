import { requireAdminUser } from "@/server/admin/guard";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative base check: middleware only verified a cookie exists; this
  // validates the session against Redis AND confirms the admin is still active
  // (re-read from the DB). Per-AREA permission checks live in each section's
  // own layout (orders/, settings/, …) via requirePermission.
  const admin = await requireAdminUser();

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminSidebar username={admin.username} role={admin.role} />
      <main className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
