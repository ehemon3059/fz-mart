import { requireOwner } from "@/server/admin/guard";
import { listAdmins } from "@/server/admin/manage";
import type { AdminRole } from "@/lib/permissions";
import AdminsClient from "./AdminsClient";

export const metadata = { title: "Admin Users — FZ-Mart Admin" };

export default async function AdminsPage() {
  // Belt-and-braces: the area layout already gates this, but the page reads
  // the acting admin's id (to disable self-mutation in the UI).
  const current = await requireOwner();
  const admins = await listAdmins();

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
      <p className="mt-1 text-sm text-gray-500">
        Invite teammates, set their role, and deactivate or delete accounts. Only owners can manage
        admins.
      </p>

      <div className="mt-6">
        <AdminsClient
          currentAdminId={current.id}
          admins={admins.map((a) => ({
            id: a.id,
            username: a.username,
            email: a.email,
            role: a.role as AdminRole,
            isActive: a.isActive,
            twoFactorEnabled: a.twoFactorEnabled,
            createdAt: a.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
