import Link from "next/link";
import TrackForm from "./TrackForm";

export const metadata = { title: "Track Your Order — FZ Mart" };

export default async function TrackPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNo?: string }>;
}) {
  const { orderNo } = await searchParams;

  return (
    <div className="font-manrope mx-auto max-w-[680px] px-6 py-12">
      {/* Breadcrumb */}
      <nav className="mb-7 flex items-center gap-1.5 text-[13px] text-stone-400">
        <Link href="/" className="font-medium text-stone-500 transition hover:text-[var(--brand-dark)]">
          Home
        </Link>
        <span>/</span>
        <span className="font-medium text-stone-700">Track Order</span>
      </nav>

      {/* Header */}
      <span className="inline-flex items-center rounded-full bg-[var(--brand-tint)] px-3 py-1 text-[12.5px] font-semibold text-[var(--brand-dark)]">
        Order Status
      </span>
      <h1 className="mt-4 text-[38px] font-extrabold leading-[1.1] tracking-tight text-stone-900">
        Track Your Order
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-stone-500">
        Enter your order number and the phone number you used at checkout to see the latest status of
        your delivery.
      </p>

      <hr className="my-9 border-stone-200" />

      <TrackForm initialOrderNo={orderNo} />
    </div>
  );
}
