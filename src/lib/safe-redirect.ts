// Only ever redirect to a path within this app — an unvalidated `next` param
// is an open-redirect vector (e.g. /login?next=https://evil.example).
export function safeRedirectPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}
