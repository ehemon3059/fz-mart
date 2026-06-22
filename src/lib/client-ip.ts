import { headers } from "next/headers";

// NextRequest has no stable `.ip` property in the App Router; the documented
// approach is reading the X-Forwarded-For header set by the platform/proxy in
// front of Node (Vercel, nginx, etc). Returns null if absent — e.g. plain
// local dev with no reverse proxy — callers should fail open in that case.
export async function getClientIp(): Promise<string | null> {
  const headerList = await headers();
  const forwardedFor = headerList.get("x-forwarded-for");
  if (!forwardedFor) return null;
  return forwardedFor.split(",")[0].trim();
}
