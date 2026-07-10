import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { prisma } from "@/lib/prisma";
import AccountNav from "@/components/storefront/AccountNav";

export const metadata = { robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account");

  const customer = await prisma.customer.findUnique({ where: { id: session.customerId } });
  if (!customer) redirect("/login?next=/account");

  return (
    <div className="font-manrope mx-auto w-full max-w-[1200px] px-5 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Account</h1>
          <p className="text-sm text-gray-500">
            {customer.name ?? customer.email} · <span className="font-mono">{customer.id}</span>
          </p>
        </div>
        <Link href="/" className="text-sm text-gray-500 underline">
          Continue shopping
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[200px_1fr]">
        <AccountNav />
        <div>{children}</div>
      </div>
    </div>
  );
}
