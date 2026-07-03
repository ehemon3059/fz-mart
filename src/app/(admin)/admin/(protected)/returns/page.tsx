import { listReturnRequests } from "@/server/orders/returns";
import ReturnRow from "./ReturnRow";

export const metadata = { title: "Return Requests — FZ-Mart Admin" };

export default async function ReturnsPage() {
  const requests = await listReturnRequests();
  const pending = requests.filter((r) => r.status === "PENDING");
  const handled = requests.filter((r) => r.status !== "PENDING");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-gray-900">Return Requests</h1>
      <p className="mt-1 text-sm text-gray-500">
        Customer-initiated returns. Approving one marks the order as Returned.
      </p>

      <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-stone-500">
        Pending ({pending.length})
      </h2>
      <div className="mt-3 space-y-3">
        {pending.length === 0 ? (
          <p className="text-stone-400">No pending requests.</p>
        ) : (
          pending.map((r) => (
            <ReturnRow
              key={r.id}
              id={r.id}
              orderNo={r.order.orderNo}
              customer={r.order.customerName}
              phone={r.order.customerPhone}
              total={r.order.total}
              reason={r.reason}
              photoUrl={r.photoUrl}
              status={r.status}
              adminNote={r.adminNote}
              createdAt={r.createdAt.toLocaleString("en-BD")}
            />
          ))
        )}
      </div>

      {handled.length > 0 && (
        <>
          <h2 className="mt-8 text-sm font-semibold uppercase tracking-wide text-stone-500">
            Handled
          </h2>
          <div className="mt-3 space-y-3">
            {handled.map((r) => (
              <ReturnRow
                key={r.id}
                id={r.id}
                orderNo={r.order.orderNo}
                customer={r.order.customerName}
                phone={r.order.customerPhone}
                total={r.order.total}
                reason={r.reason}
                photoUrl={r.photoUrl}
                status={r.status}
                adminNote={r.adminNote}
                createdAt={r.createdAt.toLocaleString("en-BD")}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
