import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { ORDER_FLOW, ORDER_STATUS_LABELS } from "@/config/order-status";
import { Icon, type IconName } from "@/components/icons";

/* ── Signature element ─────────────────────────────────────────────────
   The order lifecycle rendered as a connected flow — Pending → Confirmed →
   Shipped → Delivered — instead of six identical boxes. Each stage is a node
   on a single track; connectors carry the eye forward. Terminal exits
   (Cancelled / Returned) sit apart as muted chips, since they leave the flow.
   Purely presentational; counts come from the dashboard stats. */

const STAGE_ICON: Record<string, IconName> = {
  PENDING: "info",
  CONFIRMED: "check",
  SHIPPED: "box",
  DELIVERED: "home",
};

export function OrderPipeline({
  counts,
}: {
  counts: Record<OrderStatus, number>;
}) {
  const total = ORDER_FLOW.reduce((n, s) => n + (counts[s] ?? 0), 0);

  return (
    <section aria-label="Order pipeline">
      <div className="rounded-lg border border-stone-200 bg-white p-5 shadow-card">
        <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
          {ORDER_FLOW.map((status, i) => {
            const count = counts[status] ?? 0;
            const isLast = i === ORDER_FLOW.length - 1;
            const active = count > 0;
            return (
              <li key={status} className="flex flex-1 items-center gap-3 sm:block">
                <Link
                  href={`/admin/orders?status=${status}`}
                  className="group flex flex-1 items-center gap-3 rounded-md p-2 outline-none transition-colors hover:bg-stone-50 focus-visible:ring-2 focus-visible:ring-accent sm:w-full sm:flex-col sm:text-center"
                >
                  {/* Icon + connector on one row: the connector lives beside the
                      node (not overlapping the label below it). */}
                  <span className="relative flex w-full items-center justify-center">
                    <span
                      className={`z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        active
                          ? isLast
                            ? "border-accent bg-accent text-white"
                            : "border-accent bg-accent-soft text-accent-hover"
                          : "border-stone-200 bg-stone-50 text-stone-300"
                      }`}
                    >
                      <Icon name={STAGE_ICON[status]} size={19} />
                    </span>
                    {!isLast && (
                      <span
                        aria-hidden="true"
                        className="absolute left-1/2 right-0 top-1/2 hidden h-0.5 -translate-y-1/2 bg-stone-200 sm:block"
                        style={{ left: "calc(50% + 22px)", right: "-50%" }}
                      />
                    )}
                  </span>
                  <span className="sm:mt-2">
                    <span className="block text-2xl font-bold leading-none text-stone-900 nums group-hover:text-accent-hover">
                      {count}
                    </span>
                    <span className="mt-0.5 block text-[12px] font-medium text-stone-500">
                      {ORDER_STATUS_LABELS[status]}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ol>
        <p className="mt-4 border-t border-stone-100 pt-3 text-[12px] text-stone-400">
          {total.toLocaleString("en-BD")} order{total === 1 ? "" : "s"} moving through the pipeline.
        </p>
      </div>
    </section>
  );
}

/** Muted chips for orders that have left the happy path. */
export function TerminalChips({
  counts,
  statuses,
}: {
  counts: Record<OrderStatus, number>;
  statuses: OrderStatus[];
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {statuses.map((status) => (
        <Link
          key={status}
          href={`/admin/orders?status=${status}`}
          className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[13px] text-stone-600 transition-colors hover:border-stone-300 hover:bg-stone-50"
        >
          <span className="font-semibold text-stone-900 nums">{counts[status] ?? 0}</span>
          {ORDER_STATUS_LABELS[status]}
        </Link>
      ))}
    </div>
  );
}
