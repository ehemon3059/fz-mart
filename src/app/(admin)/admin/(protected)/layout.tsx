import { headers } from "next/headers";
import { requireAdminUser } from "@/server/admin/guard";
import { countUnusedBackupCodes } from "@/server/admin/twofactor";
import AdminSidebar from "@/components/admin/AdminSidebar";
import BackupCodeGate from "@/components/admin/BackupCodeGate";

// The account page is exempt from the backup-code gate — it's where the admin
// generates the codes that clear the gate, so it must stay reachable.
const GATE_EXEMPT_PREFIX = "/admin/account";
const LOW_BACKUP_CODE_THRESHOLD = 1;

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

  // Low-backup-code gate: an admin with 2FA on but ≤1 unused code is one step
  // from a full lockout. Block every page but the account page until they
  // generate a fresh set. Admins without 2FA have no codes to run out of.
  if (admin.twoFactorEnabled) {
    const pathname = (await headers()).get("x-pathname") ?? "";
    if (!pathname.startsWith(GATE_EXEMPT_PREFIX)) {
      const remaining = await countUnusedBackupCodes(admin.id);
      if (remaining <= LOW_BACKUP_CODE_THRESHOLD) {
        return (
          <div className="min-h-screen flex flex-col md:flex-row">
            <AdminSidebar username={admin.username} role={admin.role} />
            <main className="flex-1 bg-stone-50 p-4 md:p-8 overflow-y-auto">
              <BackupCodeGate remaining={remaining} />
            </main>
          </div>
        );
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      <AdminSidebar username={admin.username} role={admin.role} />
      <main className="flex-1 bg-stone-50 p-4 md:p-8 overflow-y-auto print:p-0 print:bg-white print:overflow-visible">
        {children}
      </main>
    </div>
  );
}
