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
