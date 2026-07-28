"use client";

import { useEffect } from "react";

/**
 * Keeps `<meta name="theme-color">` in sync with a CSS custom property that is
 * only known on the client.
 *
 * NOTE — you probably do not need this component. The storefront's utility-bar
 * colour is read from the DB during SSR (see `generateViewport` in
 * `app/(storefront)/layout.tsx`), so the meta tag is already correct in the
 * initial HTML. Reading it back out of the DOM here would be a round trip to
 * recover a value the server already had, and it would repaint the URL bar one
 * frame late.
 *
 * Reach for this only when the colour genuinely originates on the client — a
 * user-toggled dark mode, a live theme preview in the admin panel, or a colour
 * that JS injects after hydration. In those cases mount it inside `.fz` (the
 * variables are set on that wrapper, not on :root, so a computed-style read
 * from `document.documentElement` would come back empty).
 */
export default function ThemeColorSync({
  /** Custom property to read, in cascade order — first non-empty value wins. */
  cssVars = ["--util-bg", "--nav-bg"],
  /** Used when every variable resolves empty (e.g. before styles apply). */
  fallback = "#0d0625",
}: {
  cssVars?: string[];
  fallback?: string;
}) {
  useEffect(() => {
    // The variables live on `.fz`, so resolve against that element and fall
    // back to <html> for callers that set them globally.
    const host =
      document.querySelector<HTMLElement>(".fz") ?? document.documentElement;

    const read = () => {
      const styles = getComputedStyle(host);
      for (const name of cssVars) {
        const value = styles.getPropertyValue(name).trim();
        if (value) return value;
      }
      return fallback;
    };

    const apply = () => {
      const color = read();

      // A media-scoped tag (e.g. prefers-color-scheme) would only apply
      // conditionally, so target the unscoped one and create it if absent.
      let tag = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]:not([media])',
      );
      if (!tag) {
        tag = document.createElement("meta");
        tag.name = "theme-color";
        document.head.appendChild(tag);
      }
      if (tag.content !== color) tag.content = color;
    };

    apply();

    // Re-read when the inline style on the host changes — that's how a live
    // theme preview would swap the variables after mount.
    const observer = new MutationObserver(apply);
    observer.observe(host, { attributes: true, attributeFilter: ["style", "class"] });

    // Safari/iOS reads the tag when returning from the back-forward cache.
    const onPageShow = () => apply();
    window.addEventListener("pageshow", onPageShow);

    return () => {
      observer.disconnect();
      window.removeEventListener("pageshow", onPageShow);
    };
    // cssVars is a literal default; join it so a fresh array identity on each
    // render doesn't re-run the effect every time.
  }, [cssVars.join(","), fallback]); // eslint-disable-line react-hooks/exhaustive-deps

  return null;
}
