"use client";

import { useState, useEffect } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";

interface BannerSlide {
  id: number;
  title: string;
  subtitle: string;
  cta: string;
  gradient?: string;
}

interface CarouselBannerProps {
  slides: BannerSlide[];
  autoRotateInterval?: number;
}

export function CarouselBanner({ slides, autoRotateInterval = 5000 }: CarouselBannerProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, autoRotateInterval);

    return () => clearInterval(timer);
  }, [slides.length, autoRotateInterval]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const slide = slides[currentSlide];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: "56.25%", // 16:9
        backgroundColor: "#f5f5f4",
        borderRadius: "14px",
        overflow: "hidden",
      }}
    >
      {/* Slide Content */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: slide.gradient || "linear-gradient(135deg, #c026d3 0%, #a21caf 100%)",
          transition: "opacity 0.5s ease-in-out",
          opacity: 1,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.3)",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 2,
            textAlign: "center",
            color: "#ffffff",
            padding: "20px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              fontWeight: "600",
              marginBottom: "12px",
              opacity: 0.9,
            }}
          >
            FEATURED DEAL
          </div>
          <h2
            style={{
              fontSize: "28px",
              fontWeight: "700",
              marginBottom: "8px",
              lineHeight: "1.2",
            }}
          >
            {slide.title}
          </h2>
          <p
            style={{
              fontSize: "14px",
              marginBottom: "20px",
              opacity: 0.95,
            }}
          >
            {slide.subtitle}
          </p>
          <button
            style={{
              padding: "12px 24px",
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
            {slide.cta}
          </button>
        </div>
      </div>

      {/* Navigation Arrows (hidden on mobile) */}
      <button
        onClick={prevSlide}
        style={{
          position: "absolute",
          left: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 3,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          border: "none",
          borderRadius: "50%",
          padding: "8px",
          cursor: "pointer",
          display: "none",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#ffffff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
        }}
        className="hidden sm:flex"
      >
        <ChevronLeftIcon size={20} style={{ color: "#c026d3" }} />
      </button>

      <button
        onClick={nextSlide}
        style={{
          position: "absolute",
          right: "16px",
          top: "50%",
          transform: "translateY(-50%)",
          zIndex: 3,
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          border: "none",
          borderRadius: "50%",
          padding: "8px",
          cursor: "pointer",
          display: "none",
          transition: "background-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#ffffff";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.8)";
        }}
        className="hidden sm:flex"
      >
        <ChevronRightIcon size={20} style={{ color: "#c026d3" }} />
      </button>

      {/* Dot Indicators */}
      <div
        style={{
          position: "absolute",
          bottom: "16px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 3,
          display: "flex",
          gap: "8px",
        }}
      >
        {slides.map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              border: "none",
              backgroundColor: i === currentSlide ? "#ffffff" : "rgba(255, 255, 255, 0.5)",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
