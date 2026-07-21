import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BagIcon, TruckIcon, HeartIcon, CartIcon, StarIcon, ArrowLeftIcon } from "@/components/storefront/account-icons";

export default async function AccountOverviewPage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account");

  const [orderCount, purchaseCount, wishlistCount, cartEventCount, reviewCount] = await Promise.all([
    prisma.order.count({ where: { customerId: session.customerId } }),
    prisma.order.count({ where: { customerId: session.customerId, status: "DELIVERED" } }),
    prisma.wishlistItem.count({ where: { customerId: session.customerId } }),
    prisma.cartEvent.count({ where: { customerId: session.customerId } }),
    prisma.productReview.count({ where: { customerId: session.customerId } }),
  ]);

  // Full class strings (not interpolated) so Tailwind's JIT keeps each colour.
  const tiles = [
    { href: "/account/orders", label: "Orders placed", value: orderCount, Icon: BagIcon, grad: "from-blue-50", chip: "bg-blue-100 text-blue-600", blob: "bg-blue-200", hover: "hover:border-blue-200" },
    { href: "/account/purchases", label: "Delivered purchases", value: purchaseCount, Icon: TruckIcon, grad: "from-emerald-50", chip: "bg-emerald-100 text-emerald-600", blob: "bg-emerald-200", hover: "hover:border-emerald-200" },
    { href: "/account/wishlist", label: "Wishlist items", value: wishlistCount, Icon: HeartIcon, grad: "from-rose-50", chip: "bg-rose-100 text-rose-600", blob: "bg-rose-200", hover: "hover:border-rose-200" },
    { href: "/account/cart-history", label: "Cart activity", value: cartEventCount, Icon: CartIcon, grad: "from-amber-50", chip: "bg-amber-100 text-amber-600", blob: "bg-amber-200", hover: "hover:border-amber-200" },
    { href: "/account/reviews", label: "Reviews written", value: reviewCount, Icon: StarIcon, grad: "from-violet-50", chip: "bg-violet-100 text-violet-600", blob: "bg-violet-200", hover: "hover:border-violet-200" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
      {tiles.map((t) => (
        <Link
          key={t.href}
          href={t.href}
          className={`group relative overflow-hidden rounded-2xl border border-gray-100 bg-gradient-to-br ${t.grad} to-white p-5 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-md ${t.hover}`}
        >
          <span className={`pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full ${t.blob} opacity-30 blur-xl`} />
          <span className={`relative mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${t.chip}`}>
            <t.Icon className="h-5 w-5" />
          </span>
          <p className="relative text-3xl font-bold leading-none text-gray-900">{t.value}</p>
          <p className="relative mt-1.5 text-sm font-medium text-gray-500">{t.label}</p>
          <span className="relative mt-3 inline-flex items-center gap-1 text-xs font-semibold text-gray-400 transition group-hover:gap-1.5 group-hover:text-gray-600">
            View
            <ArrowLeftIcon className="h-3.5 w-3.5 rotate-180" />
          </span>
        </Link>
      ))}
    </div>
  );
}
