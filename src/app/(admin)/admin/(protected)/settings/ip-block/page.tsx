import { listBlockedIps } from "@/server/settings/ipBlock";
import DeleteButton from "@/components/admin/DeleteButton";
import AddIpForm from "./AddIpForm";
import { removeBlockedIp } from "./actions";

export default async function IpBlockPage() {
  const blocked = await listBlockedIps();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">IP Block</h1>

      <AddIpForm />

      <div className="border rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">IP Address</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Blocked Since</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {blocked.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-2 font-mono">{row.ip}</td>
                <td className="px-4 py-2 text-gray-500">{row.reason ?? "—"}</td>
                <td className="px-4 py-2 text-gray-500">
                  {row.createdAt.toLocaleDateString("en-BD")}
                </td>
                <td className="px-4 py-2">
                  <DeleteButton action={removeBlockedIp} id={row.ip} label="block" />
                </td>
              </tr>
            ))}
            {blocked.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  No blocked IPs.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
