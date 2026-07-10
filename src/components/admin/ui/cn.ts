/** Tiny className joiner — filters falsy values. Keeps the UI components free
 *  of a clsx/tailwind-merge dependency (no new packages for a CSS refactor). */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
