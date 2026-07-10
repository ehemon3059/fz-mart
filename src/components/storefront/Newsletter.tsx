"use client";

import { useState, useTransition } from "react";
import { subscribeNewsletter } from "@/app/(storefront)/newsletter-actions";

export default function Newsletter({
  title = "Get ৳150 off your first order",
  subtitle = "Subscribe for exclusive deals, new arrivals and early access to flash sales.",
}: {
  title?: string;
  subtitle?: string;
} = {}) {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const value = email.trim();
    if (!value) return;

    const formData = new FormData();
    formData.append("email", value);
    startTransition(async () => {
      const res = await subscribeNewsletter(formData);
      if (res.error) setError(res.error);
      else setDone(true);
    });
  }

  return (
    <section className="news">
      <div>
        <h3>{done ? "You're in! 🎉" : title}</h3>
        <p>
          {done
            ? "Thanks for subscribing — check your inbox for your welcome code."
            : subtitle}
        </p>
      </div>

      {done ? (
        <div className="news-thanks" role="status" aria-live="polite">
          <span className="tick" aria-hidden>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
          <span className="tt">
            <b>Subscribed!</b>
            <span>Your ৳150 welcome code is on its way.</span>
          </span>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <input
            type="email"
            required
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={pending}
          />
          <button className="n-btn" type="submit" disabled={pending}>
            {pending ? "Subscribing…" : "Subscribe"}
          </button>
          {error && <p className="n-err">{error}</p>}
        </form>
      )}
    </section>
  );
}
