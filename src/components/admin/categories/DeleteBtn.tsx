"use client";

import { Icon } from "@/components/icons";

interface Props {
  /** Whether we're in the "confirm" state (second click pending) */
  confirmed: boolean;
  /** Called on the first click — caller should set confirmed=true */
  onFirst: () => void;
  /** Called on the second click — caller should execute the delete */
  onConfirm: () => void;
  /** Called when the user cancels the confirm */
  onCancel: () => void;
  /** sm = icon-only (for subcategory rows); md = icon + label (for category headers) */
  size?: "sm" | "md";
}

/**
 * Two-step delete button.
 * First click → enters "confirm" state (caller controls via confirmed prop).
 * Second click → calls onConfirm.
 * Cancel button → calls onCancel.
 */
export function DeleteBtn({ confirmed, onFirst, onConfirm, onCancel, size = "md" }: Props) {
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
          <Icon name="trash" size={13} strokeWidth={2} />
          Delete
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
      <Icon name="trash" size={size === "sm" ? 15 : 16} />
      {size === "md" && (
        <span className="hidden text-[13px] font-medium sm:inline">Delete</span>
      )}
    </button>
  );
}
