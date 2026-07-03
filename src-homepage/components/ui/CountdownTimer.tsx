"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: Date;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const diff = targetDate.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / 1000 / 60) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div
      style={{
        display: "flex",
        gap: "12px",
        fontSize: "14px",
        fontWeight: "600",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#e11d48" }}>
          {String(timeLeft.days).padStart(2, "0")}
        </div>
        <div style={{ fontSize: "10px", color: "#5c5852" }}>Days</div>
      </div>
      <div style={{ color: "#e11d48" }}>:</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#e11d48" }}>
          {String(timeLeft.hours).padStart(2, "0")}
        </div>
        <div style={{ fontSize: "10px", color: "#5c5852" }}>Hours</div>
      </div>
      <div style={{ color: "#e11d48" }}>:</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#e11d48" }}>
          {String(timeLeft.minutes).padStart(2, "0")}
        </div>
        <div style={{ fontSize: "10px", color: "#5c5852" }}>Mins</div>
      </div>
      <div style={{ color: "#e11d48" }}>:</div>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "18px", fontWeight: "700", color: "#e11d48" }}>
          {String(timeLeft.seconds).padStart(2, "0")}
        </div>
        <div style={{ fontSize: "10px", color: "#5c5852" }}>Secs</div>
      </div>
    </div>
  );
}
