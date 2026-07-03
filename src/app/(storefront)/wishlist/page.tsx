import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { listWishlist } from "@/server/wishlist";
import ProductCard from "@/components/storefront/ProductCard";

export const metadata = { title: "My Wishlist", robots: { index: false } };

export default async function WishlistPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const products = await listWishlist(customer.customerId);

  return (
    <div className="font-manrope mx-auto w-full max-w-[1200px] px-5 py-8">
      <h1 className="text-2xl font-bold text-gray-900">My Wishlist</h1>

      {products.length === 0 ? (
        <p className="mt-4 text-gray-500">
          Your wishlist is empty.{" "}
          <Link href="/products" className="underline">
            Browse products
          </Link>
          .
        </p>
      ) : (
        <div className="pgrid mt-6">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
