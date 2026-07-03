import LoginForm from "./LoginForm";
import { safeRedirectPath } from "@/lib/safe-redirect";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const redirectTo = safeRedirectPath(next) ?? "/";

  return (
    <div className="font-manrope mx-auto flex w-full max-w-[440px] flex-col px-5 py-12 sm:py-16">
      {/* Brand mark */}
      <div className="mb-7 flex justify-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-soft">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
            <path d="M3 6h18" />
            <path d="M16 10a4 4 0 0 1-8 0" />
          </svg>
        </span>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-soft sm:p-8">
        <LoginForm next={redirectTo} />
      </div>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-center text-[12px] text-stone-400">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="11" width="18" height="11" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        Secure passwordless sign-in. We&apos;ll never share your email.
      </p>
    </div>
  );
}
