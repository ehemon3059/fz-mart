export function SlugChip({ slug }: { slug: string }) {
  return (
    <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 font-mono text-[12px] text-stone-500">
      /{slug}
    </span>
  );
}
