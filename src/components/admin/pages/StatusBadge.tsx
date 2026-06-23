interface Props {
  status: "PUBLISHED" | "DRAFT";
}

export function StatusBadge({ status }: Props) {
  const isPublished = status === "PUBLISHED";
  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        isPublished
          ? "bg-brand-50 text-brand-700"
          : "bg-stone-100 text-stone-500",
      ].join(" ")}
    >
      <span
        className={[
          "h-1.5 w-1.5 rounded-full",
          isPublished ? "bg-brand-500" : "bg-stone-400",
        ].join(" ")}
      />
      {isPublished ? "Published" : "Draft"}
    </span>
  );
}
