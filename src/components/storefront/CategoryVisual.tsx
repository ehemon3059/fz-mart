import { CategoryIcon as KeywordIcon, categoryVisual } from "@/components/storefront/icons";
import { CategoryIcon as PickedIcon, CATEGORY_ICONS } from "@/lib/category-icons";
import { categoryArt } from "@/lib/category-art";

/**
 * The single place that decides how a category is depicted, in precedence
 * order: uploaded picture → bundled department illustration → admin-chosen
 * icon → icon guessed from the name.
 *
 * The last step is the pre-existing keyword matcher in storefront/icons.tsx,
 * kept as the floor so every category still renders something recognisable
 * with no admin action — the others just override the guess.
 *
 * The illustration step needs `slug`, so a caller that omits it (or a category
 * with no art file) simply falls through to the icon behaviour as before.
 */
export function CategoryVisual({
  name,
  slug,
  imageUrl,
  iconKey,
  imgClassName,
  iconClassName,
  iconSize = 28,
}: {
  name: string;
  slug?: string | null;
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

  // Same illustration the home page shows for this department, so a category
  // looks identical wherever it appears. Rendered into the icon slot (not the
  // image one) because it is art on a tinted tile, not a photo.
  const art = slug ? categoryArt(slug) : null;
  if (art) {
    return (
      <span className={iconClassName}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={art}
          alt=""
          style={{ width: iconSize, height: iconSize, objectFit: "contain" }}
        />
      </span>
    );
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
