import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import AccountNav from "@/components/storefront/AccountNav";
import { ArrowLeftIcon } from "@/components/storefront/account-icons";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account");

  const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
  if (!customer) redirect("/login?next=/account");

  const displayName = customer.name ?? customer.email;
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";

  return (
    <div className="font-manrope min-h-screen bg-gradient-to-b from-brand-50/40 to-transparent">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-8">
        <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-lg font-bold text-white shadow-sm">
              {initial}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Account</h1>
              <p className="truncate text-sm text-gray-500">
                {displayName} · <span className="font-mono text-xs">{customer.id}</span>
              </p>
            </div>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:border-brand-300 hover:text-brand-700"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            Continue shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[220px_1fr]">
          <AccountNav />
          <div>{children}</div>
        </div>
      </div>
    </div>
  );
}
