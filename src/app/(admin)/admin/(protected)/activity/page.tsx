import Link from "next/link";
import { listActivity } from "@/server/admin/audit";

export const metadata = { title: "Activity Log — FZ-Mart Admin" };

export default async function ActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, Number(pageRaw) || 1);
  const { logs, page: current, pageCount } = await listActivity(page);

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
      <p className="mt-1 text-sm text-gray-500">
        Audit trail of privileged admin actions. Append-only.
      </p>

      <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-left text-[12px] uppercase tracking-wide text-stone-500">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Admin</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                  No activity recorded yet.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-stone-500">
                    {log.createdAt.toLocaleString("en-BD")}
                  </td>
                  <td className="px-4 py-3 font-medium text-stone-800">{log.actorName}</td>
                  <td className="px-4 py-3">
                    <code className="rounded bg-stone-100 px-1.5 py-0.5 text-[12px] text-stone-600">
                      {log.action}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-stone-600">{log.detail ?? "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2 text-sm">
          {current > 1 && (
            <Link href={`/admin/activity?page=${current - 1}`} className="rounded border px-3 py-1.5 hover:border-black">
              Previous
            </Link>
          )}
          <span className="px-2 text-gray-500">Page {current} of {pageCount}</span>
          {current < pageCount && (
            <Link href={`/admin/activity?page=${current + 1}`} className="rounded border px-3 py-1.5 hover:border-black">
              Next
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
