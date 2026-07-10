import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { listWishlist } from "@/server/wishlist";
import ProductCard from "@/components/storefront/ProductCard";

export const metadata = { title: "My Wishlist", robots: { index: false } };

export default async function AccountWishlistPage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account/wishlist");

  const products = await listWishlist(session.customerId);

  if (products.length === 0) {
    return (
      <p className="text-gray-500">
        Your wishlist is empty.{" "}
        <Link href="/products" className="underline">
          Browse products
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="pgrid">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
