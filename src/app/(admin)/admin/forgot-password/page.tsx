import Link from "next/link";
import AuthShell from "@/components/admin/AuthShell";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = { title: "Forgot Password — FZ-Mart Admin" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter the email on your admin account and we'll send you a secure link to reset your password."
      footer={
        <>
          Remembered it?{" "}
          <Link href="/admin/login" className="font-semibold text-brand-400 hover:text-brand-300">
            Sign in
          </Link>
        </>
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
