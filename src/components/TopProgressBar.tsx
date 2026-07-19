"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

/**
 * A thin YouTube/Facebook-style progress bar pinned to the very top of the
 * viewport. It fills up while a route transition is in flight and snaps to 100%
 * once the new page paints, then fades out.
 *
 * The App Router exposes no "navigation started" event, so we detect the start
 * ourselves: any in-app <a> click (left-click, same origin, no modifier) and
 * browser back/forward (popstate) arm the bar. Completion is inferred from the
 * pathname/search params changing — Next only updates those once the new route
 * has rendered. A safety timeout clears the bar if a click never leads to a
 * route change (e.g. an in-page anchor).
 */
export default function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // Serialized location the bar last completed on, so we can tell a real
  // navigation apart from an unrelated re-render.
  const settledAt = useRef<string | null>(null);
  const [progress, setProgress] = useState(0); // 0 = idle, 1-99 = loading, 100 = done
  const [visible, setVisible] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const creepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    if (creepTimer.current) {
      clearInterval(creepTimer.current);
      creepTimer.current = null;
    }
  };

  // ── Arm the bar on navigation start ────────────────────────────────────────
  useEffect(() => {
    const start = () => {
      clearTimers();
      setVisible(true);
      setProgress(12);
      // Creep towards ~90% while we wait — never reaching 100 until the route
      // actually resolves, mimicking nprogress-style trickle.
      creepTimer.current = setInterval(() => {
        setProgress((p) => {
          if (p >= 90) return p;
          // Ease out: smaller steps the closer we get to 90.
          const step = Math.max(0.5, (90 - p) * 0.08);
          return Math.min(90, p + step);
        });
      }, 180);
      // Fail-safe: if no route change lands (in-page anchor, blocked nav),
      // finish the bar so it doesn't hang.
      timers.current.push(setTimeout(finish, 8000));
    };

    const finish = () => {
      clearTimers();
      setProgress(100);
      timers.current.push(
        setTimeout(() => {
          setVisible(false);
          // Reset width after the fade so the next run starts clean.
          timers.current.push(setTimeout(() => setProgress(0), 200));
        }, 200),
      );
    };

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const anchor = (e.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      const target = anchor.getAttribute("target");
      if (
        !href ||
        href.startsWith("#") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        (target && target !== "_self") ||
        anchor.hasAttribute("download")
      ) {
        return;
      }
      // Only same-origin, different-location navigations should show the bar.
      let dest: URL;
      try {
        dest = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (dest.origin !== window.location.origin) return;
      if (dest.pathname === window.location.pathname && dest.search === window.location.search) {
        return;
      }
      start();
    };

    document.addEventListener("click", onClick, { capture: true });
    // Back/forward navigation.
    window.addEventListener("popstate", start);

    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      window.removeEventListener("popstate", start);
      clearTimers();
    };
    // Intentionally run once — start/finish close over refs/setters only.
  }, []);

  // ── Finish the bar when the route actually changes ─────────────────────────
  useEffect(() => {
    const key = `${pathname}?${searchParams?.toString() ?? ""}`;
    // Skip the initial mount (nothing was loading).
    if (settledAt.current === null) {
      settledAt.current = key;
      return;
    }
    if (settledAt.current === key) return;
    settledAt.current = key;
    // A new route rendered — complete and fade.
    clearTimers();
    setProgress(100);
    timers.current.push(
      setTimeout(() => {
        setVisible(false);
        timers.current.push(setTimeout(() => setProgress(0), 200));
      }, 200),
    );
  }, [pathname, searchParams]);

  return (
    <>
      <div
        className="topbar-progress"
        role="progressbar"
        aria-hidden={!visible}
        aria-label="Page loading"
        style={{
          transform: `scaleX(${progress / 100})`,
          opacity: visible ? 1 : 0,
        }}
      />
      <style>{`
        .topbar-progress {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          z-index: 2147483647;
          transform-origin: 0 50%;
          transform: scaleX(0);
          background: linear-gradient(
            90deg,
            var(--brand, #c026d3),
            var(--brand-dark, #a21caf)
          );
          box-shadow: 0 0 8px var(--brand, #c026d3), 0 0 3px var(--brand, #c026d3);
          transition: transform 0.2s ease, opacity 0.2s ease 0.1s;
          pointer-events: none;
        }
        @media (prefers-reduced-motion: reduce) {
          .topbar-progress { transition: opacity 0.2s ease; }
        }
      `}</style>
    </>
  );
}
