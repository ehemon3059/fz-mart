"use client";

import { CarouselBanner } from "@/components/ui/CarouselBanner";
import { CountdownTimer } from "@/components/ui/CountdownTimer";
import { TruckIcon, CheckCircleIcon } from "@/components/icons";

const heroSlides = [
  {
    id: 1,
    title: "Eid Mega Sale Now Live",
    subtitle: "Up to 50% off on thousands of products",
    cta: "Shop Now",
    gradient: "linear-gradient(135deg, #c026d3 0%, #a21caf 100%)",
  },
  {
    id: 2,
    title: "Fresh Groceries Delivered",
    subtitle: "Get organic produce in 2 hours. Free above ৳499",
    cta: "Order Fresh",
    gradient: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  },
  {
    id: 3,
    title: "Tech Week Special",
    subtitle: "Huge discounts on electronics & gadgets",
    cta: "Explore Tech",
    gradient: "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
  },
];

const eidDate = new Date();
eidDate.setDate(eidDate.getDate() + 7); // 7 days from now

export function HeroSection() {
  return (
    <div style={{ marginBottom: "40px" }}>
      {/* Mobile & Tablet: Single Carousel */}
      <div
        style={{
          marginBottom: "24px",
        }}
        className="lg:hidden"
      >
        <CarouselBanner slides={heroSlides} autoRotateInterval={5000} />
      </div>

      {/* Desktop: Split Layout */}
      <div
        style={{
          display: "none",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
        }}
        className="lg:grid"
      >
        {/* Left: Main banner */}
        <div
          style={{
            position: "relative",
            backgroundColor: "#f5f5f4",
            borderRadius: "14px",
            overflow: "hidden",
            paddingBottom: "100%",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "linear-gradient(135deg, #c026d3 0%, #a21caf 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              padding: "40px",
              color: "#ffffff",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: "600",
                marginBottom: "16px",
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                padding: "6px 12px",
                borderRadius: "20px",
                display: "inline-block",
              }}
            >
              SUMMER COLLECTION
            </div>
            <h2
              style={{
                fontSize: "36px",
                fontWeight: "700",
                marginBottom: "12px",
                lineHeight: "1.2",
              }}
            >
              Up to 50% Off
            </h2>
            <p
              style={{
                fontSize: "16px",
                marginBottom: "24px",
                opacity: 0.95,
              }}
            >
              Premium products at unbeatable prices. Limited time only.
            </p>
            <button
              style={{
                padding: "12px 28px",
                backgroundColor: "#e11d48",
                color: "#ffffff",
                border: "none",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background-color 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#be123c";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#e11d48";
              }}
            >
              Shop Now
            </button>
          </div>
        </div>

        {/* Right: Two stacked promo cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          {/* Card 1: New Season Fashion */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #ecebe8",
              borderRadius: "14px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              minHeight: "140px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#c026d3",
                  marginBottom: "8px",
                }}
              >
                NEW ARRIVALS
              </div>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#23211e",
                  marginBottom: "8px",
                }}
              >
                Summer Fashion Drops
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#5c5852",
                }}
              >
                Trendy outfits for the season
              </p>
            </div>
            <a
              href="#"
              style={{
                color: "#c026d3",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
                marginTop: "12px",
              }}
            >
              Explore →
            </a>
          </div>

          {/* Card 2: Daily Groceries */}
          <div
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #ecebe8",
              borderRadius: "14px",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              flex: 1,
              minHeight: "140px",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "#c026d3",
                  marginBottom: "8px",
                }}
              >
                DAILY DEALS
              </div>
              <h3
                style={{
                  fontSize: "20px",
                  fontWeight: "700",
                  color: "#23211e",
                  marginBottom: "8px",
                }}
              >
                Groceries Under ৳499
              </h3>
              <p
                style={{
                  fontSize: "14px",
                  color: "#5c5852",
                }}
              >
                Fresh produce delivered daily
              </p>
            </div>
            <a
              href="#"
              style={{
                color: "#c026d3",
                textDecoration: "none",
                fontWeight: "600",
                fontSize: "14px",
                marginTop: "12px",
              }}
            >
              Shop Fresh →
            </a>
          </div>
        </div>
      </div>

      {/* Trust & Urgency Chips */}
      <div
        style={{
          marginTop: "20px",
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "12px",
        }}
        className="sm:grid-cols-4"
      >
        <div
          style={{
            backgroundColor: "#fbe9fe",
            border: "1px solid #f3c4f9",
            borderRadius: "10px",
            padding: "12px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: "600",
            color: "#a21caf",
          }}
        >
          💳 Cash on Delivery
        </div>
        <div
          style={{
            backgroundColor: "#fbe9fe",
            border: "1px solid #f3c4f9",
            borderRadius: "10px",
            padding: "12px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: "600",
            color: "#a21caf",
          }}
        >
          🚚 Free above ৳499
        </div>
        <div
          style={{
            backgroundColor: "#fbe9fe",
            border: "1px solid #f3c4f9",
            borderRadius: "10px",
            padding: "12px",
            textAlign: "center",
            fontSize: "12px",
            fontWeight: "600",
            color: "#a21caf",
          }}
        >
          ⚡ Express Delivery
        </div>
        <div
          style={{
            backgroundColor: "#e11d48",
            borderRadius: "10px",
            padding: "12px",
            textAlign: "center",
            fontSize: "11px",
            fontWeight: "600",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <span>Eid Mega Sale</span>
          <CountdownTimer targetDate={eidDate} />
        </div>
      </div>
    </div>
  );
}
