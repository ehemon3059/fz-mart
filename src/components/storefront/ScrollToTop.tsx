"use client";

import { useEffect, useState } from "react";

// Floating "scroll to top" button for the storefront. Sits above the chat FAB
// (bottom-right) and appears once the user has scrolled past a threshold.
//
// The circular indicator around the arrow encodes scroll position: it is FULLY
// coloured at the top of the page and drains as the user scrolls down, so the
// ring is restored to full colour when they return to the top. Progress is the
// fraction of the page STILL ABOVE the bottom — i.e. how much "up" is left.

// SVG geometry — a 44px button with a stroke ring inset from the edge.
const SIZE = 44;
const STROKE = 3;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Show the button only after this much vertical scroll (px).
const SHOW_AFTER = 240;

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  // remaining = 1 at the very top, → 0 at the very bottom.
  const [remaining, setRemaining] = useState(1);

  useEffect(() => {
    // rAF-throttle scroll work so we compute geometry at most once per frame.
    let frame = 0;

    function update() {
      frame = 0;
      const scrollTop = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? scrollTop / max : 0; // 0 at top, 1 at bottom
      setRemaining(1 - Math.min(1, Math.max(0, progress)));
      setVisible(scrollTop > SHOW_AFTER);
    }

    function onScroll() {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    }

    update(); // initialise on mount (e.g. restored scroll position)
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  function scrollUp() {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
  }

  // Full ring at the top, shrinking toward empty as you scroll down.
  const dashOffset = CIRCUMFERENCE * (1 - remaining);

  return (
    <button
      type="button"
      onClick={scrollUp}
      aria-label="Scroll to top"
      className={`scroll-top-fab${visible ? " is-visible" : ""}`}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        aria-hidden
        className="scroll-top-ring"
      >
        {/* Track — faint full circle behind the progress ring. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          opacity={0.2}
        />
        {/* Progress ring — coloured; length tracks how much page is above. */}
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashOffset}
          // Start the ring at 12 o'clock and fill clockwise.
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
        />
      </svg>
      {/* Up-chevron arrow, centred over the ring. */}
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="scroll-top-arrow"
      >
        <path d="M18 15l-6-6-6 6" />
      </svg>
    </button>
  );
}
