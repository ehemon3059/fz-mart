import Link from "next/link";
import type { ReactNode } from "react";

// Shared visual shell for the admin auth screens (login / forgot / reset), so
// they read as one branded, modern surface. Server-safe — no client hooks.

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-stone-950 px-4 py-10 font-manrope">
      {/* Ambient brand glow — subtle, non-distracting */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-brand-600/25 blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-[-160px] right-[-120px] h-[420px] w-[420px] rounded-full bg-indigo-600/15 blur-[120px]"
      />

      <div className="relative w-full max-w-[400px]">
        {/* Brand mark */}
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-lg font-black text-white shadow-lg shadow-brand-600/30">
            fz
          </span>
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-stone-400">
            fz-mart admin
          </p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-7 shadow-2xl backdrop-blur-xl sm:p-8">
          <div className="mb-6">
            <h1 className="text-[22px] font-extrabold tracking-tight text-white">{title}</h1>
            {subtitle && <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-400">{subtitle}</p>}
          </div>

          {children}
        </div>

        {footer && <div className="mt-6 text-center text-[13px] text-stone-400">{footer}</div>}

        <p className="mt-8 text-center text-[12px] text-stone-600">
          <Link href="/" className="hover:text-stone-400">
            &larr; Back to store
          </Link>
        </p>
      </div>
    </div>
  );
}
