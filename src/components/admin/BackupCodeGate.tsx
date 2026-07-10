import Link from "next/link";
import { logout } from "@/app/(admin)/admin/login/actions";

// Blocking screen shown in place of any admin page (except the account page
// itself) when the signed-in admin has 2FA enabled but ≤1 unused backup code
// left. Forces them to generate a fresh set before continuing — losing the
// last code with no authenticator means a full lockout, so we stop that here.
export default function BackupCodeGate({ remaining }: { remaining: number }) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-amber-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-2xl">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-stone-900">
          {remaining === 0 ? "You have no backup codes left" : "Only 1 backup code remaining"}
        </h1>
        <p className="mt-2 text-sm text-stone-600">
          Backup codes let you sign in if you lose access to your authenticator app. You&apos;re
          about to run out — generate a fresh set now to avoid being locked out of your account.
        </p>
        <p className="mt-2 text-sm text-stone-600">
          You can&apos;t use the rest of the admin panel until you do.
        </p>

        <Link
          href="/admin/account"
          className="mt-6 inline-block w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-500"
        >
          Generate new backup codes
        </Link>

        <form action={logout} className="mt-3">
          <button
            type="submit"
            className="text-[13px] font-medium text-stone-500 underline hover:text-stone-700"
          >
            Sign out instead
          </button>
        </form>
      </div>
    </div>
  );
}
