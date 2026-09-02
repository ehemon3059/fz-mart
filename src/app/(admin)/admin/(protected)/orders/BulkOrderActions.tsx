"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/admin/ui/ConfirmDialog";
import { bulkAdvanceStatus, deleteOrdersAction } from "./actions";

// Wraps the server-rendered orders table in a <form>. Selection lives in the
// DOM (checkboxes named "orderId"), so the table — including the server-only
// RiskBadge — stays a Server Component and nothing extra crosses the boundary.
export default function BulkOrderActions({
  children,
  /** Owner-only: deleting orders is not front-line order work. See actions.ts. */
  canDelete = false,
}: {
  children: React.ReactNode;
  canDelete?: boolean;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  // The ids being confirmed for deletion — snapshotted when the dialog opens.
  const [confirming, setConfirming] = useState<number[] | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function checkboxes(): HTMLInputElement[] {
    return Array.from(
      formRef.current?.querySelectorAll<HTMLInputElement>('input[name="orderId"]') ?? [],
    );
  }

  function selectedIds(): number[] {
    return checkboxes()
      .filter((el) => el.checked)
      .map((el) => Number(el.value));
  }

  // The table is a server-rendered child, so it can be replaced under us — by a
  // router.refresh() after a single-row delete, or by navigation. Re-sync the
  // label from the DOM when that happens, or it keeps counting rows that are no
  // longer on the page.
  useEffect(() => {
    setCount(selectedIds().length);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children]);

  function handleChange(e: React.ChangeEvent<HTMLFormElement>) {
    const target = e.target;
    if (target instanceof HTMLInputElement && target.name === "selectAll") {
      checkboxes().forEach((el) => (el.checked = target.checked));
    }
    setCount(selectedIds().length);
    setMessage(null);
  }

  function clearSelection() {
    checkboxes().forEach((el) => (el.checked = false));
    const all = formRef.current?.querySelector<HTMLInputElement>('input[name="selectAll"]');
    if (all) all.checked = false;
    setCount(0);
  }

  function handleBulk(newStatus: "CONFIRMED" | "SHIPPED") {
    const ids = selectedIds();
    if (ids.length === 0) return;
    setMessage(null);
    startTransition(async () => {
      const result = await bulkAdvanceStatus(ids, newStatus);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      const skippedNote = result.skipped
        ? `, ${result.skipped} skipped (not applicable)`
        : "";
      setMessage(`${result.updated} order(s) updated${skippedNote}.`);
      clearSelection();
      router.refresh();
    });
  }

  function handleDelete(ids: number[]) {
    setMessage(null);
    startTransition(async () => {
      const result = await deleteOrdersAction(ids);
      // Closed either way: the outcome renders in the toolbar, and leaving the
      // modal up would hide it behind the overlay.
      setConfirming(null);
      if (result.error) {
        setMessage(result.error);
        return;
      }
      // Protected orders are named individually — "2 skipped" would leave the
      // admin guessing which two, and why.
      const kept = result.blocked ?? [];
      const keptNote = kept.length
        ? ` Kept ${kept.length}: ${kept.map((b) => `${b.orderNo} (${b.reason})`).join("; ")}.`
        : "";
      setMessage(`${result.deleted} order(s) deleted.${keptNote}`);
      clearSelection();
      router.refresh();
    });
  }

  return (
    <form
      ref={formRef}
      onChange={handleChange}
      // The form is a selection container, never something to submit: it has no
      // action, and a stray submit would navigate away with the checked ids in
      // the querystring, losing the admin's filters. Nested buttons default to
      // type="submit" (the shared Button in ConfirmDialog included), so the
      // guard lives here rather than depending on every child being declared
      // type="button" correctly.
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="flex flex-wrap items-center gap-3 mb-3 min-h-[34px]">
        <span className="text-sm text-gray-500">
          {count > 0 ? `${count} selected` : "Select orders for bulk actions"}
        </span>
        <button
          type="button"
          onClick={() => handleBulk("CONFIRMED")}
          disabled={count === 0 || pending}
          className="border rounded px-3 py-1.5 text-sm font-medium hover:border-black disabled:opacity-40"
        >
          Mark Confirmed
        </button>
        <button
          type="button"
          onClick={() => handleBulk("SHIPPED")}
          disabled={count === 0 || pending}
          className="border rounded px-3 py-1.5 text-sm font-medium hover:border-black disabled:opacity-40"
        >
          Mark Shipped
        </button>
        {canDelete && (
          <button
            type="button"
            onClick={() => setConfirming(selectedIds())}
            disabled={count === 0 || pending}
            className="border border-red-500 text-red-600 rounded px-3 py-1.5 text-sm font-medium hover:bg-red-50 disabled:opacity-40"
          >
            Delete
          </button>
        )}
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
      {children}

      <ConfirmDialog
        open={confirming !== null}
        title={`Delete ${confirming?.length ?? 0} order${confirming?.length === 1 ? "" : "s"}?`}
        message={
          "Their items, notes and status history go with them, and any stock they are " +
          "still holding goes back on the shelf. An order that took an online payment, " +
          "or that already has a courier consignment, is kept and listed afterwards. " +
          "This cannot be undone."
        }
        confirmLabel="Delete orders"
        loading={pending}
        onConfirm={() => confirming && handleDelete(confirming)}
        onCancel={() => {
          if (pending) return;
          setConfirming(null);
        }}
      />
    </form>
  );
}
