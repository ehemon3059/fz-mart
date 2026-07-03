"use client";

import { useState, useTransition } from "react";
import { cancelOrderAction, requestReturnAction } from "@/app/(storefront)/order-confirmation/[orderNo]/self-service-actions";

// Self-service controls shown on a customer's order view. The phone on the
// order authorises the action (the customer confirms it), matching the guest
// order-tracking model.
export default function CustomerOrderActions({
  orderNo,
  phone,
  status,
  returnWindowOpen,
}: {
  orderNo: string;
  phone: string;
  status: string;
  returnWindowOpen: boolean;
}) {
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [showReturn, setShowReturn] = useState(false);
  const [pending, startTransition] = useTransition();

  const canCancel = status === "PENDING";
  const canReturn = status === "DELIVERED" && returnWindowOpen;
  if (!canCancel && !canReturn) return null;

  function cancel() {
    if (!window.confirm("Cancel this order? This can't be undone.")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await cancelOrderAction(orderNo, phone);
      setMsg(res.error ? { type: "err", text: res.error } : { type: "ok", text: res.success! });
    });
  }

  function submitReturn(formData: FormData) {
    setMsg(null);
    startTransition(async () => {
      const res = await requestReturnAction(orderNo, phone, formData);
      if (res.error) setMsg({ type: "err", text: res.error });
      else {
        setMsg({ type: "ok", text: res.success! });
        setShowReturn(false);
      }
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-gray-200 p-4">
      <h3 className="font-semibold text-gray-900">Need to make a change?</h3>

      {msg && (
        <p className={`mt-2 text-sm ${msg.type === "ok" ? "text-green-700" : "text-red-600"}`}>
          {msg.text}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {canCancel && (
          <button
            type="button"
            onClick={cancel}
            disabled={pending}
            className="rounded border px-3 py-1.5 text-sm font-medium hover:border-black disabled:opacity-50"
          >
            Cancel order
          </button>
        )}
        {canReturn && !showReturn && (
          <button
            type="button"
            onClick={() => setShowReturn(true)}
            className="rounded border px-3 py-1.5 text-sm font-medium hover:border-black"
          >
            Request a return
          </button>
        )}
      </div>

      {canReturn && showReturn && (
        <form action={submitReturn} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Reason for return</label>
            <textarea
              name="reason"
              required
              rows={3}
              placeholder="Tell us what went wrong…"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Photo URL (optional)</label>
            <input
              name="photoUrl"
              placeholder="https://…"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm outline-none focus:border-black"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={pending}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Submit request
            </button>
            <button
              type="button"
              onClick={() => setShowReturn(false)}
              className="rounded border px-4 py-2 text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
