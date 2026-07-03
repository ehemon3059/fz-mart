"use client";

import { useRef, useState, useTransition } from "react";
import { createOrderNote } from "../actions";

interface Note {
  id: number;
  body: string;
  author: string;
  createdAt: Date;
}

export default function OrderNotes({
  orderId,
  notes,
}: {
  orderId: number;
  notes: Note[];
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = textareaRef.current?.value ?? "";
    if (!body.trim()) {
      setError("Note cannot be empty.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createOrderNote(orderId, body);
      if (result?.error) {
        setError(result.error);
      } else if (textareaRef.current) {
        textareaRef.current.value = "";
      }
    });
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          ref={textareaRef}
          rows={2}
          placeholder="Add an internal note (e.g. called customer, confirmed address)…"
          className="w-full border rounded px-3 py-2 text-sm resize-y"
          disabled={pending}
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-black text-white rounded px-4 py-1.5 text-sm font-medium disabled:opacity-50"
          >
            {pending ? "Adding…" : "Add note"}
          </button>
          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-gray-400">No notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id} className="border rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-sm whitespace-pre-line text-gray-800">{note.body}</p>
              <p className="text-xs text-gray-400 mt-1">
                {note.author} · {new Date(note.createdAt).toLocaleString("en-BD")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
