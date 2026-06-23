import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BoltIcon } from "./icons";

type Banner = { id: number; imageUrl: string; link: string | null };

// The hero adapts to your real Banner data:
//   • banners[0]  → main banner (image if present)
//   • banners[1], banners[2] → the two stacked side cards
// With no banners at all it falls back to the designed gradient promo so the
// homepage never looks empty before an admin uploads artwork.
export default function Hero({ banners = [] }: { banners?: Banner[] }) {
  const [main, side1, side2] = banners;

  return (
    <section className="hero">
      <div className="hero-grid">
        {main ? (
          <MainBanner banner={main} />
        ) : (
          <div className="banner">
            <div className="b-copy">
              <span className="b-kicker"><BoltIcon size={13} /> Mega Eid Sale · Limited time</span>
              <h1>Up to <em>60% off</em> on everything you love</h1>
              <p>Thousands of deals across electronics, fashion &amp; home. Pay cash on delivery.</p>
              <Link href="/products" className="b-cta">Shop the sale <ArrowRight size={17} /></Link>
            </div>
            <div className="b-art ph"><span className="ph-lbl">hero product shot · 640×420</span></div>
            <div className="dots"><i className="on" /><i /><i /><i /></div>
          </div>
        )}

        <div className="promo-col">
          <SidePromo
            banner={side1}
            cls="p1"
            kicker="New season"
            title={<>Fashion week<br />drops are here</>}
            cta="Explore now"
            artTint="#f6e4cd"
          />
          <SidePromo
            banner={side2}
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

function MainBanner({ banner }: { banner: Banner }) {
  const inner = (
    <div className="banner has-img">
      <div className="b-fill">
        <Image src={banner.imageUrl} alt="Promotional banner" fill priority style={{ objectFit: "cover" }} />
      </div>
    </div>
  );
  return banner.link ? <Link href={banner.link}>{inner}</Link> : inner;
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
          <Image src={banner.imageUrl} alt="Promotional banner" fill style={{ objectFit: "cover" }} />
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
