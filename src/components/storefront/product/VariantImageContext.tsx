"use client";

import { createContext, useContext, useMemo, useState } from "react";

/**
 * Lets the buy box tell the gallery which photo to show. The two live in
 * separate columns of the product hero and neither owns the other, so the
 * selected variant's image is shared through context rather than props.
 *
 * Null = nothing selected; the gallery behaves normally (rotating through the
 * product's own photos).
 */
interface VariantImageValue {
  url: string | null;
  setUrl: (url: string | null) => void;
}

const VariantImageContext = createContext<VariantImageValue>({
  url: null,
  setUrl: () => {},
});

export function VariantImageProvider({ children }: { children: React.ReactNode }) {
  const [url, setUrl] = useState<string | null>(null);
  const value = useMemo(() => ({ url, setUrl }), [url]);
  return <VariantImageContext.Provider value={value}>{children}</VariantImageContext.Provider>;
}

export function useVariantImage() {
  return useContext(VariantImageContext);
}
