import Link from "next/link";
import { getCurrentCustomer } from "@/lib/customer-session";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

  const tiles = [
    { href: "/account/orders", label: "Orders placed", value: orderCount },
    { href: "/account/purchases", label: "Delivered purchases", value: purchaseCount },
    { href: "/account/wishlist", label: "Wishlist items", value: wishlistCount },
    { href: "/account/cart-history", label: "Cart activity", value: cartEventCount },
    { href: "/account/reviews", label: "Reviews written", value: reviewCount },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      {tiles.map((tile) => (
        <Link
          key={tile.href}
          href={tile.href}
          className="rounded-lg border border-gray-200 bg-white p-4 transition hover:border-brand-600"
        >
          <p className="text-2xl font-bold text-gray-900">{tile.value}</p>
          <p className="mt-1 text-sm text-gray-500">{tile.label}</p>
        </Link>
      ))}
    </div>
  );
}
