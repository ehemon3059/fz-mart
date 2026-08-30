import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hasOrderAccess } from "@/lib/order-access";

// Where the customer lands after the gateway round-trip. Success sends them
// straight to the normal order-confirmation page; failure/abandonment
// explains that nothing was charged-and-confirmed and offers a retry.

export default async function PaymentReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ orderNo?: string; result?: string }>;
}) {
  const { orderNo, result } = await searchParams;

  // A2-03: only redirect a caller who is actually authorised for this order.
  // Without the grant check this page is a bounce: guess an orderNo, get sent
  // to the confirmation page. It cannot ISSUE a grant — a Server Component may
  // not set cookies — but it doesn't need to: checkout issued one before
  // handing off to the gateway, and the customer returns with it. If they came
  // back in a different browser (an in-app bKash webview, say) they fall
  // through to the message below and reach the order via /track, which is the
  // correct place to prove identity with a phone number.
  if (orderNo && result === "success" && (await hasOrderAccess(orderNo))) {
    // Double-check against the DB rather than the query string.
    const order = await prisma.order.findUnique({ where: { orderNo } });
    if (order && order.paidAmount > 0 && order.status !== "PENDING_PAYMENT") {
      redirect(`/order-confirmation/${orderNo}`);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="text-2xl font-bold text-gray-900">Payment not completed</h1>
      <p className="mt-3 text-sm text-gray-600">
        Your payment was cancelled or could not be verified, so the order was not
        confirmed and nothing has been reserved for you.
        {orderNo && (
          <>
            {" "}
            (Reference: <span className="font-mono">{orderNo}</span>)
          </>
        )}
      </p>
      <p className="mt-2 text-sm text-gray-600">
        If money left your account, it will be refunded by the payment provider
        automatically — or contact us with your reference number.
      </p>
      <div className="mt-6 flex justify-center gap-3">
        <Link
          href="/checkout"
          className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white"
        >
          Try again
        </Link>
        <Link href="/" className="rounded-lg border px-4 py-2 text-sm font-semibold">
          Back to shop
        </Link>
      </div>
    </div>
  );
}
