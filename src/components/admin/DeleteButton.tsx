"use client";

import { useState, useTransition } from "react";

interface ActionResult {
  error?: string;
}

interface Props<T extends number | string> {
  id: T;
  label: string;
  action: (id: T) => Promise<ActionResult>;
}

export default function DeleteButton<T extends number | string>({
  id,
  label,
  action,
}: Props<T>) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!confirm(`Delete this ${label}? This cannot be undone.`)) return;
    setError(null);
    startTransition(async () => {
      const result = await action(id);
      if (result?.error) setError(result.error);
    });
  }

  return (
    <span>
      <button
        onClick={handleClick}
        disabled={pending}
        className="text-red-600 underline disabled:opacity-50"
      >
        {pending ? "Deleting..." : "Delete"}
      </button>
      {error && <span className="ml-2 text-xs text-red-600">{error}</span>}
    </span>
  );
}
