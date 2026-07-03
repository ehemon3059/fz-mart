export function CountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center rounded-full bg-stone-100 px-2.5 py-0.5 text-[11.5px] font-semibold text-stone-500">
      {count} {count === 1 ? "subcategory" : "subcategories"}
    </span>
  );
}
