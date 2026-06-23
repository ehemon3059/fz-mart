"use client";

import { useState } from "react";

export default function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);

  return (
    <section className="news">
      <div>
        <h3>{done ? "You're in! 🎉" : "Get ৳150 off your first order"}</h3>
        <p>
          {done
            ? "Check your inbox for your welcome code."
            : "Subscribe for exclusive deals, new arrivals and early access to flash sales."}
        </p>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (email.trim()) setDone(true);
        }}
      >
        <input
          type="email"
          required
          placeholder="Enter your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="n-btn" type="submit">Subscribe</button>
      </form>
    </section>
  );
}
