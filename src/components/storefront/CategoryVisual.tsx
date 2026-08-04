import { CategoryIcon as KeywordIcon, categoryVisual } from "@/components/storefront/icons";
import { CategoryIcon as PickedIcon, CATEGORY_ICONS } from "@/lib/category-icons";

/**
 * The single place that decides how a category is depicted, in precedence
 * order: uploaded picture → admin-chosen icon → icon guessed from the name.
 *
 * The last step is the pre-existing keyword matcher in storefront/icons.tsx,
 * kept as the floor so every category still renders something recognisable
 * with no admin action — the other two just override the guess.
 */
export function CategoryVisual({
  name,
  imageUrl,
  iconKey,
  imgClassName,
  iconClassName,
  iconSize = 28,
}: {
  name: string;
  imageUrl?: string | null;
  iconKey?: string | null;
  imgClassName?: string;
  iconClassName?: string;
  iconSize?: number;
}) {
  if (imageUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt="" className={imgClassName} />;
  }

  // Colour pair comes from the keyword matcher either way, so an icon still
  // gets a tinted tile consistent with the rest of the grid.
  const v = categoryVisual(name);
  const style = { "--ct-bg": v.bg, "--ct-fg": v.fg } as React.CSSProperties;

  const valid = iconKey && iconKey in CATEGORY_ICONS;

  return (
    <span className={iconClassName} style={style}>
      {valid ? (
        <PickedIcon name={iconKey!} size={iconSize} />
      ) : (
        <KeywordIcon name={name} size={iconSize} />
      )}
    </span>
  );
}
