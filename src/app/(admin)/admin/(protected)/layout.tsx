import { redirect } from "next/navigation";
import { getCurrentAdmin } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Authoritative check: middleware only verified a cookie exists; this is
  // where the session id is actually validated against Redis. Runs on every
  // admin page since they all nest under this layout.
  const admin = await getCurrentAdmin();
  if (!admin) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminSidebar username={admin.username} />
      <main className="flex-1 bg-gray-50 p-4 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
