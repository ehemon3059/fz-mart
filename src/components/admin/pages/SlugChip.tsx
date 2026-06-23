interface Props {
  slug: string;
}

export function SlugChip({ slug }: Props) {
  return (
    <span className="inline-block rounded-md bg-stone-100 px-2 py-0.5 font-mono text-[12.5px] text-stone-500">
      /{slug}
    </span>
  );
}
