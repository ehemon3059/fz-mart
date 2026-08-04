'use client';

import { useRef } from 'react';

export default function CategoryShowcase() {
  const trackRef = useRef(null);

  const scrollCat = (direction) => {
    if (trackRef.current) {
      trackRef.current.scrollBy({ left: direction * 300, behavior: 'smooth' });
    }
  };

  // All 22 categories from your original HTML
  const categories = [
    { name: 'Baby Items', svg: './Baby%20Items.svg' },
    { name: 'Bags', svg: './Bags.svg' },
    { name: 'Bathroom Counter Storage', svg: './Bathroom%20Counter%20Storage.svg' },
    { name: 'Beauty', svg: './Beauty.svg' },
    { name: 'Bedding Accessories', svg: './Bedding%20Accessories.svg' },
    { name: 'Eyewear', svg: './Eyewear.svg' },
    { name: 'Gadgets', svg: './Gadgets.svg' },
    { name: 'Gifts & Craft', svg: './Gifts%20%26%20Craft.svg' },
    { name: 'Groceries', svg: './move-item/Groceries.svg' },
    { name: 'Health', svg: './move-item/Health.svg' },
    { name: 'Home Decoration', svg: './move-item/Home%20Decoration.svg' },
    { name: 'Jewelry', svg: './move-item/Jewelry.svg' },
    { name: 'Kitchen Accessories', svg: './Kitchen%20Accessories.svg' },
    { name: "Men's & Boy's Fashion", svg: "./Men's%20&%20Boy's%20Fashion.svg" },
    { name: 'Mens Wear', svg: './Mens%20Wear.svg' },
    { name: 'Mother & Baby', svg: './Mother%20%26%20Baby.svg' },
    { name: 'Shoes', svg: './Shoes.svg' },
    { name: 'Tools & Hardware', svg: './Tools%20%26%20Hardware.svg' },
    { name: 'Toys', svg: './Toys.svg' },
    { name: 'Watches', svg: './Watches.svg' },
    { name: 'Women Wear', svg: './Women%20Wear.svg' },
    { name: "Women's & Girl's Fashion", svg: "./Women's%20&%20Girl's%20Fashion.svg" },
  ];

  return (
    <>
      {/* ─── Exact same CSS ─── */}
      <style jsx global>{`
        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
          font-family: 'Poppins', sans-serif;
        }

        body {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 40px 0;
          background: #f3f4f6;
        }

        .all-card {
          display: grid;
          grid-template-columns: repeat(4, minmax(200px, 1fr));
          grid-gap: 25px;
          width: 100%;
          max-width: 1300px;
          padding: 0 20px;
        }

        .card {
          width: 220px;
          background: #ffffff;
          border-radius: 16px;
          padding: 16px;
          text-align: center;
          box-shadow: 0 12px 35px rgba(0, 0, 0, 0.12);
          transition: 0.35s ease;
          overflow: hidden;
        }

        .card:hover {
          transform: translateY(-10px);
          box-shadow: 0 18px 45px rgba(0, 0, 0, 0.18);
        }

        .icon-wrapper {
          width: 110px;
          height: 110px;
          margin: 0 auto 14px;
          animation: floating 3s ease-in-out infinite;
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
        }

        .icon-wrapper svg {
          width: 100%;
          height: 100%;
          transition: transform 0.4s ease;
        }

        .card:hover .icon-wrapper svg {
          transform: scale(1.08) rotate(-4deg);
        }

        h2 {
          font-size: 17px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 6px;
        }

        p {
          font-size: 13px;
          color: #6b7280;
          margin-bottom: 14px;
        }

        .btn {
          position: relative;
          display: inline-block;
          padding: 9px 18px;
          font-size: 14px;
          font-weight: 500;
          border-radius: 8px;
          border: 1.5px solid #E54D73;
          background: transparent;
          color: #E54D73;
          text-decoration: none;
          overflow: hidden;
          isolation: isolate;
          transition: color 0.4s ease;
        }

        .btn span {
          position: relative;
          z-index: 1;
        }

        .btn::after {
          content: "";
          position: absolute;
          z-index: -1;
          top: 0;
          right: 0;
          bottom: 0;
          left: 0;
          width: 120%;
          height: 100%;
          background-color: #E54D73;
          backface-visibility: hidden;
          will-change: transform;
          transform: rotate3d(0, 0, 1, 10deg) translate3d(-1.2em, 110%, 0);
          transform-origin: 0% 100%;
          transition: transform 0.45s ease;
        }

        .btn:hover {
          color: #ffffff;
        }

        .btn:hover::after {
          transform: rotate3d(0, 0, 1, 0deg) translate3d(0, 0, 0);
        }

        @keyframes floating {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        /* ---- Category slider ---- */
        .cat-section {
          width: 100%;
          max-width: 1300px;
          margin: 60px auto 0;
          padding: 0 20px;
        }

        .cat-section h3 {
          font-size: 20px;
          font-weight: 600;
          color: #111827;
          margin-bottom: 18px;
        }

        .cat-slider {
          position: relative;
          display: flex;
          align-items: center;
        }

        .cat-track {
          display: flex;
          gap: 16px;
          overflow-x: auto;
          scroll-behavior: smooth;
          padding: 8px 4px 16px;
          scrollbar-width: none;
        }

        .cat-track::-webkit-scrollbar {
          display: none;
        }

        .cat-card {
          flex: 0 0 auto;
          width: 130px;
          background: #ffffff;
          border-radius: 14px;
          padding: 18px 12px;
          text-align: center;
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.08);
          transition: 0.3s ease;
          cursor: pointer;
        }

        .cat-card:hover {
          transform: translateY(-6px);
          box-shadow: 0 10px 24px rgba(0, 0, 0, 0.14);
        }

        .cat-icon {
          width: 60px;
          height: 60px;
          margin: 0 auto 10px;
          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
        }

        .cat-card span {
          display: block;
          font-size: 13px;
          font-weight: 500;
          color: #111827;
        }

        .cat-arrow {
          flex: 0 0 auto;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: none;
          background: #1f2937;
          color: #fff;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: 0.2s;
          z-index: 2;
        }

        .cat-arrow:hover {
          background: #111827;
        }

        .cat-arrow.prev {
          margin-right: 12px;
        }

        .cat-arrow.next {
          margin-left: 12px;
        }

        /* ---- Responsive ---- */
        @media (max-width: 1024px) {
          .all-card {
            grid-template-columns: repeat(3, minmax(160px, 1fr));
            width: 100%;
            padding: 0 20px;
          }
        }

        @media (max-width: 768px) {
          body {
            padding: 24px 0;
          }

          .all-card {
            grid-template-columns: repeat(2, minmax(140px, 1fr));
            gap: 12px;
            padding: 0 16px;
          }

          .card {
            width: 100%;
            padding: 12px;
          }

          .icon-wrapper {
            width: 90px;
            height: 90px;
          }

          .cat-section {
            margin-top: 40px;
            padding: 0 16px;
          }

          .cat-card {
            width: 105px;
            padding: 14px 8px;
          }

          .cat-icon {
            width: 48px;
            height: 48px;
          }

          .cat-arrow {
            width: 34px;
            height: 34px;
            font-size: 14px;
          }
        }

        @media (max-width: 480px) {
          .all-card {
            grid-template-columns: repeat(2, minmax(120px, 1fr));
            gap: 20px;
          }

          h2 {
            font-size: 15px;
          }

          p {
            font-size: 12px;
            margin-bottom: 10px;
          }

          .btn {
            padding: 8px 14px;
            font-size: 13px;
          }

          .cat-section h3 {
            font-size: 18px;
          }

          .cat-card {
            width: 90px;
            padding: 12px 6px;
          }

          .cat-icon {
            width: 42px;
            height: 42px;
          }

          .cat-card span {
            font-size: 11px;
          }

          .cat-arrow.prev {
            margin-right: 6px;
          }

          .cat-arrow.next {
            margin-left: 6px;
          }
        }
      `}</style>

      {/* ─── Product Grid ─── */}
      <div className="all-card">
        {categories.map((item, index) => (
          <div className="card" key={index}>
            <div
              className="icon-wrapper"
              style={{ backgroundImage: `url(${item.svg})` }}
            ></div>
            <h2>{item.name}</h2>
            <a href="#" className="btn">
              <span>Shop Now</span>
            </a>
          </div>
        ))}
      </div>

      {/* ─── Category Slider ─── */}
      <section className="cat-section">
        <h3>Shop by Category</h3>
        <div className="cat-slider">
          <button className="cat-arrow prev" onClick={() => scrollCat(-1)}>
            &#10094;
          </button>

          <div className="cat-track" ref={trackRef}>
            {categories.map((item, index) => (
              <div className="cat-card" key={index}>
                <div
                  className="cat-icon"
                  style={{ backgroundImage: `url(${item.svg})` }}
                ></div>
                <span>{item.name}</span>
              </div>
            ))}
          </div>

          <button className="cat-arrow next" onClick={() => scrollCat(1)}>
            &#10095;
          </button>
        </div>
      </section>
    </>
  );
}