"use client";

import { useEffect, useRef } from "react";
import animationData from "./success-animation.json";

/**
 * Plays the order-success Lottie animation once (green tick + burst).
 * `lottie_light` (SVG renderer only) is imported dynamically so it stays out of
 * the initial bundle and never runs during SSR.
 */
export default function SuccessAnimation({ size = 120 }: { size?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let anim: { destroy: () => void } | null = null;
    let cancelled = false;

    import("lottie-web/build/player/lottie_light").then(({ default: lottie }) => {
      if (cancelled || !containerRef.current) return;
      anim = lottie.loadAnimation({
        container: containerRef.current,
        renderer: "svg",
        loop: false,
        autoplay: true,
        animationData,
      });
    });

    return () => {
      cancelled = true;
      anim?.destroy();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Order placed successfully"
      style={{ width: size, height: size }}
      className="mx-auto"
    />
  );
}
