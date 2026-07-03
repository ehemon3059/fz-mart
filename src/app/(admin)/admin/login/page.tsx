import Link from "next/link";
import AuthShell from "@/components/admin/AuthShell";
import LoginForm from "./LoginForm";

export const metadata = { title: "Sign In — FZ-Mart Admin" };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reset?: string }>;
}) {
  const { reset } = await searchParams;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to manage your store."
      footer={
        <>
          Trouble signing in?{" "}
          <Link href="/admin/forgot-password" className="font-semibold text-brand-400 hover:text-brand-300">
            Reset your password
          </Link>
        </>
      }
    >
      {reset === "1" && (
        <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5">
          <p className="text-[13px] font-medium text-emerald-300">
            Password updated. Sign in with your new password.
          </p>
        </div>
      )}
      <LoginForm />
    </AuthShell>
  );
}
