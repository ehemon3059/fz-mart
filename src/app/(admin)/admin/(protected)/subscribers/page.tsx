import { requirePermission } from "@/server/admin/guard";
import { listSubscribers } from "@/server/newsletter";
import { getNewsletterCopy } from "@/server/settings/newsletter";
import NewsletterCopyForm from "./NewsletterCopyForm";

export const metadata = { title: "Subscribers — FZ-Mart Admin" };

export default async function SubscribersPage() {
  await requirePermission("reports");
  const [subscribers, copy] = await Promise.all([listSubscribers(), getNewsletterCopy()]);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Newsletter Subscribers</h1>
          <p className="mt-1 text-sm text-gray-500">
            Emails collected from the storefront “Get ৳150 off” signup box.
          </p>
        </div>
        <a
          href="/admin/subscribers/export"
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800"
        >
          Export CSV
        </a>
      </div>

      <NewsletterCopyForm initialTitle={copy.title} initialSubtitle={copy.subtitle} />

      <div className="mt-6 inline-block rounded-xl border border-stone-200 bg-white px-4 py-3">
        <p className="text-[12px] uppercase tracking-wide text-stone-400">Total subscribers</p>
        <p className="mt-0.5 text-2xl font-bold text-stone-900">{subscribers.length}</p>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-[12px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Subscribed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-stone-400">
                  No subscribers yet.
                </td>
              </tr>
            ) : (
              subscribers.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3 text-stone-700">
                    {s.name ?? <span className="text-stone-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-stone-700">{s.email}</td>
                  <td className="px-4 py-3 text-stone-500">
                    {s.createdAt.toLocaleString("en-BD")}
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
