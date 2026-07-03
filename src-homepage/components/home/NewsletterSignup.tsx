"use client";

import { useState } from "react";

export function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 3000);
    }
  };

  return (
    <div style={{ marginBottom: "40px" }}>
      <div
        style={{
          backgroundColor: "#c026d3",
          borderRadius: "14px",
          padding: "40px 20px",
          textAlign: "center",
          color: "#ffffff",
        }}
      >
        <h2
          style={{
            fontSize: "24px",
            fontWeight: "700",
            marginBottom: "8px",
          }}
        >
          Get Exclusive Deals
        </h2>
        <p
          style={{
            fontSize: "14px",
            marginBottom: "24px",
            opacity: 0.9,
          }}
        >
          Subscribe to our newsletter for the latest offers and updates
        </p>

        <form
          onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            maxWidth: "400px",
            margin: "0 auto",
          }}
          className="sm:flex-row sm:gap-8"
        >
          <input
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              flex: 1,
              padding: "12px 16px",
              border: "none",
              borderRadius: "10px",
              fontSize: "14px",
              fontFamily: "Manrope, sans-serif",
            }}
          />
          <button
            type="submit"
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
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#be123c";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#e11d48";
            }}
          >
            {subscribed ? "✓ Subscribed!" : "Subscribe"}
          </button>
        </form>

        <div
          style={{
            marginTop: "20px",
            display: "flex",
            justifyContent: "center",
            gap: "20px",
            fontSize: "12px",
          }}
        >
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked style={{ cursor: "pointer" }} />
            Email offers
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input type="checkbox" defaultChecked style={{ cursor: "pointer" }} />
            WhatsApp updates
          </label>
        </div>
      </div>
    </div>
  );
}
