import type { OrderStatus } from "@prisma/client";
import { ORDER_STATUS_LABELS } from "@/config/order-status";

interface LogEntry {
  id: number;
  fromStatus: OrderStatus | null;
  toStatus: OrderStatus;
  changedBy: string | null;
  note: string | null;
  createdAt: Date;
}

export default function StatusTimeline({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0) {
    return <p className="text-sm text-gray-400">No status history recorded.</p>;
  }

  return (
    <ol className="space-y-4">
      {logs.map((log, i) => {
        const isLatest = i === logs.length - 1;
        return (
          <li key={log.id} className="flex gap-3">
            {/* Marker + connecting line */}
            <div className="flex flex-col items-center">
              <span
                className={`mt-1 h-2.5 w-2.5 rounded-full ${
                  isLatest ? "bg-blue-500 ring-4 ring-blue-100" : "bg-gray-300"
                }`}
              />
              {i < logs.length - 1 && <span className="flex-1 w-px bg-gray-200" />}
            </div>
            <div className="pb-1">
              <p className="text-sm font-medium text-gray-900">
                {log.fromStatus
                  ? `${ORDER_STATUS_LABELS[log.fromStatus]} → ${ORDER_STATUS_LABELS[log.toStatus]}`
                  : `Order placed (${ORDER_STATUS_LABELS[log.toStatus]})`}
              </p>
              <p className="text-xs text-gray-500">
                {log.createdAt.toLocaleString("en-BD")}
                {log.changedBy ? ` · by ${log.changedBy}` : " · system"}
              </p>
              {log.note && (
                <p className="mt-1 rounded bg-gray-50 px-2 py-1 text-xs italic text-gray-600">
                  “{log.note}”
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
