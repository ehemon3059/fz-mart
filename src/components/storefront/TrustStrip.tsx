/**
 * Trust cards shown above the newsletter on the homepage.
 *
 * The artwork is four full-colour illustrations in /public/trust. They are NOT
 * the monochrome glyphs from `./icons` that this section used to render, so
 * nothing here tints them from the brand palette — the theme only colours the
 * card, the halo behind the icon and the copy.
 */

const ITEMS = [
  {
    src: "/trust/cash-on-delivery.svg",
    title: "Cash on Delivery",
    sub: "Pay when it arrives",
  },
  {
    src: "/trust/fast-delivery.svg",
    title: "Fast Delivery",
    sub: "Dhaka within 24 hours",
  },
  {
    src: "/trust/easy-return.svg",
    title: "7 Days Easy Return",
    sub: "Easy & hassle-free",
  },
  {
    src: "/trust/official-warranty.svg",
    title: "Official Warranty",
    sub: "Genuine products only",
  },
];

export default function TrustStrip() {
  return (
    <section className="trust" aria-label="Why shop with FZ Mart">
      <ul className="trust-grid">
        {ITEMS.map(({ src, title, sub }) => (
          <li className="trust-item" key={title}>
            <span className="trust-ic">
              {/* Plain <img>: next/image has nothing to optimise on a <20 KB
                  vector, and these are decorative — the adjacent title already
                  carries the meaning, so alt stays empty. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" width={50} height={50} loading="lazy" decoding="async" />
            </span>
            <div className="trust-copy">
              <b>{title}</b>
              {/* Explicit class: a bare `span` selector would also match the
                  icon wrapper above and override its styling. */}
              <span className="trust-sub">{sub}</span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
