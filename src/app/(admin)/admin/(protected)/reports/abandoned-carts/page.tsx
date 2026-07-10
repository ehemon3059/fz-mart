import { getAbandonedCartReport } from "@/server/cart";
import { formatTaka } from "@/lib/money";

export const metadata = { title: "Abandoned Carts — FZ-Mart Admin" };

export default async function AbandonedCartsPage() {
  const report = await getAbandonedCartReport();

  const stats = [
    { label: "Reminders sent", value: String(report.remindersSent) },
    { label: "Carts recovered", value: String(report.recovered) },
    { label: "Recovered → ordered", value: String(report.ordered) },
    { label: "Recovery rate", value: `${report.recoveryRate}%` },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Abandoned Carts</h1>
      <p className="mt-1 text-sm text-gray-500">
        Recovery reminders and their outcomes. Configure the delay and message under Settings →
        Conversion.
      </p>

      {/* What is this? explainer */}
      <div className="mt-6 rounded-xl border border-stone-200 bg-stone-50/70 p-5">
        <h2 className="text-[15px] font-bold text-stone-900">What is Abandoned Carts?</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-stone-600">
          An <span className="font-semibold text-stone-800">abandoned cart</span> is when a shopper
          adds items and starts checkout but leaves before placing the order — a sale that was
          almost made. The store saves that cart, waits a set delay, then automatically sends the
          customer an SMS/email with a one-tap link to come back and finish. This page tracks those
          reminders and whether they turned into orders.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-stone-400">
              How it works
            </p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-[13px] text-stone-600">
              <li>Shopper enters checkout — the cart is saved with a restore link.</li>
              <li>They leave without ordering.</li>
              <li>
                After the configured delay, one reminder goes out by SMS/email with the restore
                link.
              </li>
              <li>If they return and order, it counts as recovered.</li>
            </ol>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-stone-400">
              Reading this page
            </p>
            <ul className="mt-2 space-y-1 text-[13px] text-stone-600">
              <li>
                <b>Reminders sent</b> — how many recovery messages went out.
              </li>
              <li>
                <b>Carts recovered</b> — shoppers who clicked back via the link.
              </li>
              <li>
                <b>Recovered → ordered</b> — of those, who actually placed an order.
              </li>
              <li>
                <b>Recovery rate</b> — orders ÷ reminders sent.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-stone-200 bg-white p-4">
            <p className="text-[12px] font-bold uppercase tracking-wide text-stone-400">
              Why it matters
            </p>
            <p className="mt-2 text-[13px] leading-relaxed text-stone-600">
              These are warm buyers who already chose their items — recovering even a few is
              near-free extra revenue. Tune the <b>delay</b> and <b>message</b> under{" "}
              <span className="whitespace-nowrap">Settings → Conversion</span> to lift the recovery
              rate.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-stone-200 bg-white p-4">
            <p className="text-[12px] uppercase tracking-wide text-stone-400">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-stone-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-[12px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Cart value</th>
              <th className="px-4 py-3">Reminder sent</th>
              <th className="px-4 py-3">Outcome</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {report.recent.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                  No reminders sent yet.
                </td>
              </tr>
            ) : (
              report.recent.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3 text-stone-700">{c.email ?? c.phone ?? "—"}</td>
                  <td className="px-4 py-3">{formatTaka(c.subtotal)}</td>
                  <td className="px-4 py-3 text-stone-500">
                    {c.reminderSentAt?.toLocaleString("en-BD")}
                  </td>
                  <td className="px-4 py-3">
                    {c.orderedAt ? (
                      <span className="rounded bg-green-100 px-2 py-0.5 text-[12px] font-medium text-green-700">Ordered</span>
                    ) : c.recoveredAt ? (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-[12px] font-medium text-blue-700">Returned</span>
                    ) : (
                      <span className="text-[12px] text-stone-400">No response</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
