"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Lets the buy box tell the gallery which photo to show. The two live in
 * separate columns of the product hero and neither owns the other, so the
 * selected variant's image is shared through context rather than props.
 *
 * Two channels, because the colour strip previews on hover before anything is
 * chosen:
 *   committed — what the shopper actually picked (a click).
 *   preview   — what they are hovering right now; cleared on mouse-out.
 *
 * `url` is what the gallery renders: the preview when there is one, otherwise
 * the committed pick, otherwise null (the gallery behaves normally, rotating
 * through the product's own photos).
 */
interface VariantImageValue {
  /** What to show: preview ?? committed. */
  url: string | null;
  /** The clicked selection, ignoring any hover. */
  committed: string | null;
  /** The hovered photo, or null. */
  preview: string | null;
  /** Commit a selection (null clears it). Named `setUrl` since callers have
   *  always used it to mean "this is the chosen option's photo". */
  setUrl: (url: string | null) => void;
  setPreview: (url: string | null) => void;
}

const VariantImageContext = createContext<VariantImageValue>({
  url: null,
  committed: null,
  preview: null,
  setUrl: () => {},
  setPreview: () => {},
});

export function VariantImageProvider({ children }: { children: React.ReactNode }) {
  const [committed, setCommitted] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const value = useMemo(
    () => ({
      url: preview ?? committed,
      committed,
      preview,
      setUrl: setCommitted,
      setPreview,
    }),
    [committed, preview],
  );
  return <VariantImageContext.Provider value={value}>{children}</VariantImageContext.Provider>;
}

export function useVariantImage() {
  return useContext(VariantImageContext);
}
