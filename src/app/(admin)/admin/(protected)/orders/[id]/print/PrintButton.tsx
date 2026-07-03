"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden bg-black text-white rounded px-4 py-2 text-sm font-medium"
    >
      Print
    </button>
  );
}
