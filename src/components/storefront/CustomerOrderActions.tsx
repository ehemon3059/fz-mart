"use client";

import { useState, useTransition } from "react";
import { cancelOrderAction, requestReturnAction } from "@/app/(storefront)/order-confirmation/[orderNo]/self-service-actions";

// The four most common cancellation reasons for a COD store, plus a free-text
// "Other". Kept here (not the server) so copy edits don't need a redeploy of
// the action; the chosen value is stored verbatim on the order status log.
const CANCEL_REASONS = [
  "Ordered by mistake",
  "Found a better price elsewhere",
  "Delivery is taking too long",
  "No longer need the item",
] as const;

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
  const [showCancel, setShowCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState<string | null>(null);
  const [otherReason, setOtherReason] = useState("");
  const [pending, startTransition] = useTransition();

  const canCancel = status === "PENDING";
  const canReturn = status === "DELIVERED" && returnWindowOpen;
  if (!canCancel && !canReturn) return null;

  const isOther = cancelReason === "Other";
  const canSubmitCancel = cancelReason !== null && (!isOther || otherReason.trim().length > 0);

  function confirmCancel() {
    if (!canSubmitCancel) return;
    const reason = isOther ? otherReason.trim() : cancelReason!;
    setMsg(null);
    startTransition(async () => {
      const res = await cancelOrderAction(orderNo, phone, reason);
      if (res.error) setMsg({ type: "err", text: res.error });
      else {
        setMsg({ type: "ok", text: res.success! });
        setShowCancel(false);
      }
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
            onClick={() => {
              setCancelReason(null);
              setOtherReason("");
              setShowCancel(true);
            }}
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

      {canCancel && showCancel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
        >
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => !pending && setShowCancel(false)}
            className="absolute inset-0 bg-black/50"
          />

          {/* Dialog */}
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 id="cancel-title" className="text-lg font-bold text-gray-900">
              Cancel this order?
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Please tell us why you&apos;re cancelling. This can&apos;t be undone.
            </p>

            <div className="mt-4 space-y-2">
              {CANCEL_REASONS.map((reason) => {
                const selected = cancelReason === reason;
                return (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setCancelReason(reason)}
                    className="flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition"
                    style={{
                      borderColor: selected ? "var(--brand)" : "#e5e7eb",
                      background: selected ? "var(--brand-tint)" : "#fff",
                      color: selected ? "var(--brand-dark)" : "#374151",
                    }}
                  >
                    <span
                      className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border"
                      style={{ borderColor: selected ? "var(--brand)" : "#d1d5db" }}
                    >
                      {selected && (
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: "var(--brand)" }}
                        />
                      )}
                    </span>
                    {reason}
                  </button>
                );
              })}

              {/* Other */}
              <button
                type="button"
                onClick={() => setCancelReason("Other")}
                className="flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-sm font-medium transition"
                style={{
                  borderColor: isOther ? "var(--brand)" : "#e5e7eb",
                  background: isOther ? "var(--brand-tint)" : "#fff",
                  color: isOther ? "var(--brand-dark)" : "#374151",
                }}
              >
                <span
                  className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full border"
                  style={{ borderColor: isOther ? "var(--brand)" : "#d1d5db" }}
                >
                  {isOther && (
                    <span className="h-2 w-2 rounded-full" style={{ background: "var(--brand)" }} />
                  )}
                </span>
                Other reason
              </button>

              {isOther && (
                <textarea
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  rows={3}
                  autoFocus
                  maxLength={500}
                  placeholder="Tell us more…"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-500"
                />
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={confirmCancel}
                disabled={pending || !canSubmitCancel}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pending ? "Cancelling…" : "Confirm cancellation"}
              </button>
              <button
                type="button"
                onClick={() => setShowCancel(false)}
                disabled={pending}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
              >
                Keep order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
