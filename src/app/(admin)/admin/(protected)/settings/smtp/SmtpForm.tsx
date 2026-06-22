"use client";

import { useState, useTransition } from "react";
import { saveSmtpSettings } from "./actions";

interface Props {
  config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    fromAddress: string;
    fromName: string;
  } | null;
}

export default function SmtpForm({ config }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await saveSmtpSettings(formData);
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
        <label className="block text-sm font-medium mb-1">SMTP Host</label>
        <input
          name="host"
          required
          defaultValue={config?.host}
          placeholder="smtp.example.com"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Port</label>
          <input
            name="port"
            type="number"
            required
            defaultValue={config?.port ?? 587}
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <label className="flex items-center gap-2 text-sm self-end pb-2">
          <input name="secure" type="checkbox" defaultChecked={config?.secure ?? false} />
          Use TLS (port 465)
        </label>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Username</label>
        <input
          name="user"
          defaultValue={config?.user}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Password</label>
        <input
          name="password"
          type="password"
          placeholder={config ? "Leave blank to keep current password" : ""}
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">From Address</label>
        <input
          name="fromAddress"
          required
          type="email"
          defaultValue={config?.fromAddress}
          placeholder="orders@fz-mart.example"
          className="w-full border rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">From Name</label>
        <input
          name="fromName"
          defaultValue={config?.fromName ?? "fz-mart"}
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
