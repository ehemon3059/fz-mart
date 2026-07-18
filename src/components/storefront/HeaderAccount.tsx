"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { UserIcon } from "./icons";
import { logout } from "@/app/(storefront)/login/logout";

interface Props {
  /** Display name when signed in (falls back to email local-part), or null when guest. */
  displayName: string | null;
}

export default function HeaderAccount({ displayName }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!displayName) {
    return (
      <Link href="/login" className="icon-btn" aria-label="Sign in to your account">
        <UserIcon size={22} />
        <span className="ib-txt">
          <small>Account</small>
          <b>Sign in</b>
        </span>
      </Link>
    );
  }

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="icon-btn"
        aria-label="Account menu"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <UserIcon size={22} />
        <span className="ib-txt">
          <small>Account</small>
          <b>{displayName}</b>
        </span>
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            right: 0,
            top: "calc(100% + 8px)",
            minWidth: 160,
            background: "#fff",
            border: "1px solid #e7e5e4",
            borderRadius: 10,
            boxShadow: "0 8px 24px -8px rgba(0,0,0,0.15)",
            padding: 6,
            zIndex: 50,
          }}
        >
          <Link
            href="/account"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 14,
              color: "#292524",
            }}
          >
            My Account
          </Link>
          <Link
            href="/account/orders"
            onClick={() => setOpen(false)}
            style={{
              display: "block",
              padding: "8px 10px",
              borderRadius: 6,
              fontSize: 14,
              color: "#292524",
            }}
          >
            Order History
          </Link>
          <form action={logout}>
            <button
              type="submit"
              style={{
                width: "100%",
                textAlign: "left",
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 14,
                color: "#dc2626",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
