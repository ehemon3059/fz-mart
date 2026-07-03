"use client";

import { Icon } from "@/components/icons";

interface Props {
  confirmed: boolean;
  onFirst: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  size?: "sm" | "md";
}

export function DeleteBtn({ confirmed, onFirst, onConfirm, onCancel, size = "sm" }: Props) {
  if (confirmed) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md px-2.5 py-1.5 text-[12px] font-medium text-stone-400 transition hover:bg-stone-100 hover:text-stone-600"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex items-center gap-1 rounded-md bg-red-500 px-2.5 py-1.5 text-[12px] font-semibold text-white transition hover:bg-red-600"
        >
          <Icon name="trash" size={13} strokeWidth={2} /> Delete
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      title="Delete"
      onClick={onFirst}
      className={[
        "flex items-center gap-1 rounded-md text-stone-400 transition hover:bg-red-50 hover:text-red-500",
        size === "sm" ? "p-1.5" : "px-2.5 py-1.5",
      ].join(" ")}
    >
      <Icon name="trash" size={15} />
      {size === "md" && <span className="hidden text-[13px] font-medium sm:inline">Delete</span>}
    </button>
  );
}
