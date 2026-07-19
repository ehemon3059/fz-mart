import { requireAdminUser } from "@/server/admin/guard";
import { ROLE_LABELS, type AdminRole } from "@/lib/permissions";
import { backupCodeStats } from "@/server/admin/twofactor";
import TwoFactorPanel from "./TwoFactorPanel";
import CredentialsPanel from "./CredentialsPanel";

export const metadata = { title: "My Account — FZ-Mart Admin" };

// Per-admin account page — available to every active admin (no area
// permission), since managing your own security shouldn't require elevated
// rights.
export default async function AccountPage() {
  const admin = await requireAdminUser();
  const stats = admin.twoFactorEnabled
    ? await backupCodeStats(admin.id)
    : { total: 0, used: 0, unused: 0, usedCodes: [] };
  const unusedBackupCodes = stats.unused;

  const lowBackupCodes = admin.twoFactorEnabled && unusedBackupCodes <= 1;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
        <p className="mt-1 text-sm text-gray-500">
          {admin.username} · {ROLE_LABELS[admin.role as AdminRole]}
        </p>
      </div>

      {lowBackupCodes && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <strong>
            {unusedBackupCodes === 0
              ? "You have no backup codes left."
              : "You have just 1 backup code remaining."}
          </strong>{" "}
          Generate a new set below to keep access to the rest of the admin panel — the other pages
          are locked until you do.
        </div>
      )}

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Login credentials</h2>
        <CredentialsPanel username={admin.username} />
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6">
        <h2 className="mb-4 font-semibold text-gray-900">Two-factor authentication</h2>
        <TwoFactorPanel
          enabled={admin.twoFactorEnabled}
          unusedBackupCodes={unusedBackupCodes}
          usedBackupCodes={stats.used}
          totalBackupCodes={stats.total}
          usedBackupCodeList={stats.usedCodes.map((c) => ({
            code: c.code,
            usedAt: c.usedAt.toISOString(),
          }))}
        />
      </div>
    </div>
  );
}
