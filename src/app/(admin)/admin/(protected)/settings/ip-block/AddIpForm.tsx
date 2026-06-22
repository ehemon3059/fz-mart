"use client";

import { useState, useTransition } from "react";
import { addBlockedIp } from "./actions";

export default function AddIpForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await addBlockedIp(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setIp("");
        setReason("");
      }
    });
  }

  return (
    <form action={handleSubmit} className="flex gap-2 items-start max-w-lg">
      <input
        name="ip"
        required
        value={ip}
        onChange={(e) => setIp(e.target.value)}
        placeholder="203.0.113.5"
        className="border rounded px-3 py-2 flex-1"
      />
      <input
        name="reason"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Reason (optional)"
        className="border rounded px-3 py-2 flex-1"
      />
      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white px-4 py-2 rounded font-medium disabled:opacity-50 whitespace-nowrap"
      >
        {pending ? "Blocking..." : "Block IP"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
