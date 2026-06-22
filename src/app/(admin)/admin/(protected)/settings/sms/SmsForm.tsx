"use client";

import { useState, useTransition } from "react";
import { saveSmsSettings } from "./actions";

interface Props {
  config: { apiUrl: string; senderId: string } | null;
}

export default function SmsForm({ config }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveSmsSettings(formData);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">
          Provider API URL
        </label>
        <input
          name="apiUrl"
          defaultValue={config?.apiUrl}
          placeholder="https://api.smsprovider.com/send (leave blank to stub-log instead of sending)"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">API Key</label>
        <input
          name="apiKey"
          type="password"
          placeholder={config ? "Leave blank to keep current key" : ""}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Sender ID</label>
        <input
          name="senderId"
          defaultValue={config?.senderId}
          placeholder="fz-mart"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      {success && <p className="text-green-700 text-sm">Saved.</p>}
      <button
        type="submit"
        disabled={pending}
        className="bg-black text-white px-4 py-2 rounded font-medium disabled:opacity-50"
      >
        {pending ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
