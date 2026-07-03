import { requireAdminUser } from "@/server/admin/guard";
import { ROLE_LABELS, type AdminRole } from "@/lib/permissions";
import TwoFactorPanel from "./TwoFactorPanel";

export const metadata = { title: "My Account — FZ-Mart Admin" };

// Per-admin account page — available to every active admin (no area
// permission), since managing your own security shouldn't require elevated
// rights.
export default async function AccountPage() {
  const admin = await requireAdminUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          {admin.username} · {ROLE_LABELS[admin.role as AdminRole]}
        </p>
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Two-factor authentication</h2>
        <TwoFactorPanel enabled={admin.twoFactorEnabled} />
      </div>
    </div>
  );
}
