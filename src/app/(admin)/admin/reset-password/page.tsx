import Link from "next/link";
import AuthShell from "@/components/admin/AuthShell";
import { findValidResetToken } from "@/server/admin/password-reset";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = { title: "Reset Password — FZ-Mart Admin" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? await findValidResetToken(token) : null;

  if (!valid) {
    return (
      <AuthShell
        title="Link expired"
        subtitle="This password-reset link is invalid, has already been used, or has expired."
      >
        <Link
          href="/admin/forgot-password"
          className="block w-full rounded-xl bg-brand-600 py-2.5 text-center text-[14.5px] font-semibold text-white transition hover:bg-brand-500"
        >
          Request a new link
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Pick a strong password you don't use anywhere else. You'll use it to sign in from now on."
      footer={
        <Link href="/admin/login" className="font-semibold text-brand-400 hover:text-brand-300">
          Back to sign in
        </Link>
      }
    >
      <ResetPasswordForm token={token!} />
    </AuthShell>
  );
}
