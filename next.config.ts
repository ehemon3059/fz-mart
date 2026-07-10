import type { NextConfig } from "next";

// Security headers. The Content-Security-Policy is NOT here — it's set
// per-request in middleware.ts with a fresh nonce so we can drop
// 'unsafe-inline'/'unsafe-eval' from script-src (see the comment there). Keeping
// a second static CSP here would produce two enforced CSP headers whose
// intersection would break the nonce flow, so this list carries only the
// non-CSP headers, which are the same on every route.
const securityHeaders = [
  // Force HTTPS for two years incl. subdomains (ignored by browsers over
  // plain HTTP, so harmless in local dev).
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
];

// Derive the object-storage image host from R2_PUBLIC_BASE_URL so next/image
// will optimize/serve product & banner images uploaded to R2. Falls back to
// nothing when unset (local dev serves uploads from /public instead).
function storageRemotePattern() {
  const base = process.env.R2_PUBLIC_BASE_URL;
  if (!base) return [];
  try {
    const { protocol, hostname } = new URL(base);
    return [
      {
        protocol: protocol.replace(":", "") as "http" | "https",
        hostname,
      },
    ];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    contentDispositionType: "attachment",
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      // Seed/demo data uses placehold.co — keep it allowed.
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      ...storageRemotePattern(),
    ],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
