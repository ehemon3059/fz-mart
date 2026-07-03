import { notFound } from "next/navigation";
import { getPaymentsConfig } from "@/server/settings/payments";
import { formatTaka } from "@/lib/money";

// Fake gateway page for the mock provider (e2e/dev only — 404s unless the
// admin setting payments.mockEnabled is on). Posts to the mock provider's
// return route, which runs the exact same verification + settlement pipeline
// as the real gateways.

export default async function MockGatewayPage({
  searchParams,
}: {
  searchParams: Promise<{ paymentId?: string; amount?: string; orderNo?: string }>;
}) {
  const config = await getPaymentsConfig();
  if (!config.mock.enabled) notFound();

  const { paymentId, amount, orderNo } = await searchParams;
  const amountPaisa = Number(amount ?? 0);
  if (!paymentId || !Number.isFinite(amountPaisa)) notFound();

  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-gray-900">Test Payment Gateway</h1>
      <p className="mt-2 text-sm text-gray-600">
        Order <span className="font-mono">{orderNo}</span>
      </p>
      <p className="mt-1 text-3xl font-bold">{formatTaka(amountPaisa)}</p>

      <form method="POST" action="/api/payments/mock/return" className="mt-8 space-y-3">
        <input type="hidden" name="paymentId" value={paymentId} />
        <input type="hidden" name="amount" value={amountPaisa} />
        <button
          type="submit"
          name="outcome"
          value="success"
          className="w-full rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Pay {formatTaka(amountPaisa)}
        </button>
        <button
          type="submit"
          name="outcome"
          value="failed"
          className="w-full rounded-lg border border-red-300 px-4 py-2.5 text-sm font-semibold text-red-600"
        >
          Fail payment
        </button>
      </form>
    </div>
  );
}
