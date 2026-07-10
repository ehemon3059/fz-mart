import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCustomer } from "@/lib/customer-session";
import { listCartEvents } from "@/server/customer-cart";
import { formatTaka } from "@/lib/money";

export const metadata = { title: "Cart History", robots: { index: false } };

const PAGE_SIZE = 50;

export default async function AccountCartHistoryPage() {
  const session = await getCurrentCustomer();
  if (!session) redirect("/login?next=/account/cart-history");

  const events = await listCartEvents(session.customerId, PAGE_SIZE);

  if (events.length === 0) {
    return (
      <p className="text-gray-500">
        You haven&apos;t added anything to your cart yet.{" "}
        <Link href="/products" className="underline">
          Browse products
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
      {events.map((event) => {
        const image = event.product.images[0]?.url ?? null;
        const price = event.product.discountPrice ?? event.product.price;
        return (
          <Link
            key={event.id}
            href={`/products/${event.product.slug}`}
            className="flex items-center gap-3 p-3 transition hover:bg-gray-50"
          >
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt={event.product.name} className="h-12 w-12 rounded-md object-cover" />
            ) : (
              <div className="h-12 w-12 rounded-md bg-gray-100" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{event.product.name}</p>
              <p className="text-xs text-gray-500">
                Added {event.quantity} × {formatTaka(price)} ·{" "}
                {event.createdAt.toLocaleDateString("en-BD", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            </div>
            {event.product.status !== "ACTIVE" && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                Unavailable
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
