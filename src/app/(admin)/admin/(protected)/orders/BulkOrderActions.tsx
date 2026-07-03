"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { bulkAdvanceStatus } from "./actions";

// Wraps the server-rendered orders table in a <form>. Selection lives in the
// DOM (checkboxes named "orderId"), so the table — including the server-only
// RiskBadge — stays a Server Component and nothing extra crosses the boundary.
export default function BulkOrderActions({ children }: { children: React.ReactNode }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
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

  return (
    <form ref={formRef} onChange={handleChange}>
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
        {message && <span className="text-sm text-gray-600">{message}</span>}
      </div>
      {children}
    </form>
  );
}
