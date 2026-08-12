/**
 * Whether a stored image URL points at vector artwork.
 *
 * Vectors and photos want opposite fits: an illustration has its own padding and
 * must be contained so nothing is clipped, while a photo should cover its tile.
 * Uploaded keys end in `.svg` (the storage layer picks the extension, so this is
 * not a user-controlled string); a query string may follow on a CDN URL.
 */
export function isSvgUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  return /\.svg(?:[?#]|$)/i.test(url);
}
