"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BoltIcon } from "./icons";

type Banner = { id: number; imageUrl: string; link: string | null; slot: string };

// Designed fallback slides shown only when an admin hasn't uploaded a big
// banner yet, so the homepage never looks empty.
const FALLBACK_SLIDES = [
  {
    kicker: "Mega Eid Sale · Limited time",
    title: (<>Up to <em>60% off</em> on everything you love</>),
    text: "Thousands of deals across electronics, fashion & home. Pay cash on delivery.",
    cta: "Shop the sale",
    href: "/products",
  },
  {
    kicker: "Fresh & fast",
    title: (<>Daily grocery, <em>delivered</em> in hours</>),
    text: "Stock up on everyday essentials at unbeatable prices. Free shipping over ৳499.",
    cta: "Order fresh",
    href: "/products",
  },
] as const;

const ROTATE_MS = 5000;

// The hero has three slot-based areas:
//   • MAIN          → big left banner, a carousel of every MAIN image
//   • RIGHT_TOP     → upper right card
//   • RIGHT_BOTTOM  → lower right card
export default function Hero({ banners = [] }: { banners?: Banner[] }) {
  const mainBanners = banners.filter((b) => b.slot === "MAIN");
  const rightTop = banners.find((b) => b.slot === "RIGHT_TOP");
  const rightBottom = banners.find((b) => b.slot === "RIGHT_BOTTOM");

  const slideCount = mainBanners.length > 0 ? mainBanners.length : FALLBACK_SLIDES.length;
  const [idx, setIdx] = useState(0);

  // Keep the index valid if the banner set changes, then auto-rotate.
  useEffect(() => {
    setIdx((i) => (i >= slideCount ? 0 : i));
  }, [slideCount]);
  useEffect(() => {
    if (slideCount <= 1) return;
    const id = setInterval(() => setIdx((i) => (i + 1) % slideCount), ROTATE_MS);
    return () => clearInterval(id);
  }, [slideCount]);

  const go = (n: number) => setIdx((i) => (i + n + slideCount) % slideCount);

  return (
    <section className="hero">
      <div className="hero-grid">
        {mainBanners.length > 0 ? (
          <div className="banner has-img">
            {mainBanners.map((b, i) => (
              <BannerSlide key={b.id} banner={b} on={i === idx} />
            ))}
            {mainBanners.length > 1 && (
              <>
                <button type="button" className="hero-nav prev" aria-label="Previous" onClick={() => go(-1)}>
                  <ArrowRight size={18} style={{ transform: "rotate(180deg)" }} />
                </button>
                <button type="button" className="hero-nav next" aria-label="Next" onClick={() => go(1)}>
                  <ArrowRight size={18} />
                </button>
                <Dots count={mainBanners.length} idx={idx} onPick={setIdx} />
              </>
            )}
          </div>
        ) : (
          <div className="banner">
            {FALLBACK_SLIDES.map((s, i) => (
              <div key={i} className={`hero-slide${i === idx ? " is-on" : ""}`}>
                <div className="b-copy">
                  <span className="b-kicker"><BoltIcon size={13} /> {s.kicker}</span>
                  <h1>{s.title}</h1>
                  <p>{s.text}</p>
                  <Link href={s.href} className="b-cta">{s.cta} <ArrowRight size={17} /></Link>
                </div>
              </div>
            ))}
            <Dots count={FALLBACK_SLIDES.length} idx={idx} onPick={setIdx} />
          </div>
        )}

        <div className="promo-col">
          <SidePromo
            banner={rightTop}
            cls="p1"
            kicker="New season"
            title={<>Fashion week<br />drops are here</>}
            cta="Explore now"
            artTint="#f6e4cd"
          />
          <SidePromo
            banner={rightBottom}
            cls="p2"
            kicker="Free shipping"
            title={<>Daily grocery<br />under ৳499</>}
            cta="Stock up"
            artTint="var(--brand-tint-2)"
          />
        </div>
      </div>
    </section>
  );
}

function BannerSlide({ banner, on }: { banner: Banner; on: boolean }) {
  const img = (
    <div className="b-fill">
      <Image
        src={banner.imageUrl}
        alt="Promotional banner"
        fill
        priority
        sizes="(max-width: 768px) 100vw, 66vw"
        style={{ objectFit: "cover" }}
      />
    </div>
  );
  return (
    <div className={`hero-slide${on ? " is-on" : ""}`}>
      {banner.link ? <Link href={banner.link}>{img}</Link> : img}
    </div>
  );
}

function Dots({ count, idx, onPick }: { count: number; idx: number; onPick: (i: number) => void }) {
  return (
    <div className="dots">
      {Array.from({ length: count }).map((_, i) => (
        <i
          key={i}
          className={i === idx ? "on" : ""}
          role="button"
          aria-label={`Go to slide ${i + 1}`}
          onClick={() => onPick(i)}
        />
      ))}
    </div>
  );
}

function SidePromo({
  banner, cls, kicker, title, cta, artTint,
}: {
  banner?: Banner;
  cls: string;
  kicker: string;
  title: React.ReactNode;
  cta: string;
  artTint: string;
}) {
  if (banner) {
    const inner = (
      <div className="promo" style={{ padding: 0 }}>
        <div className="b-fill">
          <Image
            src={banner.imageUrl}
            alt="Promotional banner"
            fill
            sizes="(max-width: 768px) 100vw, 34vw"
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
    );
    return banner.link ? <Link href={banner.link} style={{ display: "flex", flex: 1 }}>{inner}</Link> : inner;
  }
  return (
    <div className={`promo ${cls}`}>
      <div><small>{kicker}</small><h3>{title}</h3></div>
      <span className="p-link">{cta} <ArrowRight size={14} /></span>
      <div className="p-art ph" style={{ "--ph-bg": artTint } as React.CSSProperties} />
    </div>
  );
}
