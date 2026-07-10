"use client";

import { useEffect } from "react";
import { captureUtmAttribution } from "@/lib/utm-attribution";

// Records first-touch utm_* params on landing so a later order can be attributed
// to the paid channel (Google/TikTok/etc.) that drove the visit — the non-
// Facebook counterpart to the Pixel's _fbp/_fbc cookies. No-op after the first
// tagged visit and on untagged traffic; renders nothing.
export default function UtmCapture() {
  useEffect(() => {
    captureUtmAttribution();
  }, []);
  return null;
}
