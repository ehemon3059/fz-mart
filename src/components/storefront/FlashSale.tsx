"use client";

import { useEffect, useState } from "react";
import ProductCard from "./ProductCard";
import { FireIcon } from "./icons";
import type { ProductWithImages } from "@/server/products";

// Client component: runs a live countdown against the campaign's real
// `endsAt`, computed on mount (not during SSR) so the server and client
// markup match on first paint.
function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export default function FlashSale({
  title,
  products,
  endsAt,
}: {
  title?: string;
  products: ProductWithImages[];
  /** Campaign end time, ISO string (serializable across server/client). */
  endsAt: string;
}) {
  const [left, setLeft] = useState<{ h: string; m: string; s: string }>({
    h: "--", m: "--", s: "--",
  });

  useEffect(() => {
    const end = new Date(endsAt).getTime();
    const tick = () => {
      const diff = Math.max(0, end - Date.now());
      const total = Math.floor(diff / 1000);
      setLeft({
        h: pad(Math.floor(total / 3600)),
        m: pad(Math.floor((total % 3600) / 60)),
        s: pad(total % 60),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (products.length === 0) return null;

  return (
    <section className="flash" id="flash-sale">
      <div className="f-hd">
        <div className="f-title">
          <span className="f-fire"><FireIcon size={22} /></span>
          <div>
            <h2>{title ?? "Flash Sale"}</h2>
            <div className="f-sub">Hurry — deals refresh when the timer hits zero</div>
          </div>
        </div>
        <div className="countdown">
          <span className="cd-lbl">Ends in</span>
          <div className="cd-box"><b>{left.h}</b><small>Hrs</small></div>
          <span className="cd-sep">:</span>
          <div className="cd-box"><b>{left.m}</b><small>Min</small></div>
          <span className="cd-sep">:</span>
          <div className="cd-box"><b>{left.s}</b><small>Sec</small></div>
        </div>
      </div>

      <div className="prow">
        {products.slice(0, 5).map((p) => (
          <ProductCard key={p.id} product={p} badge="sale" />
        ))}
      </div>
    </section>
  );
}
