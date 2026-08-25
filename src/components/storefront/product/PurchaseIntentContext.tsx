"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Lets the sticky mobile buy bar act on the buy box's current selection.
 *
 * The bar lives outside the hero (it is fixed to the viewport for the whole
 * page), so it cannot see whether a colour/size has been chosen. Without that
 * it can only scroll to the buy box — which, once the shopper has already
 * picked their options, looks like a dead button: it yanks them back to a form
 * they have finished filling in and nothing else happens.
 *
 * So the buy box publishes a `buy` callback here whenever a complete, in-stock
 * selection exists (and clears it when one doesn't). The bar calls it when set,
 * and falls back to scrolling when it isn't — which is still the right thing
 * for a product whose options are untouched.
 *
 * A ref holds the callback so re-publishing on every selection change does not
 * re-render the bar; `ready` is the only piece of state the bar reacts to.
 */
interface PurchaseIntentValue {
  /** True when the buy box has a complete, in-stock selection. */
  ready: boolean;
  /** Run the buy box's own Buy Now. No-op when nothing is published. */
  buy: () => void;
  /** Buy box → context. Pass null when the selection is incomplete. */
  publish: (fn: (() => void) | null) => void;
}

const PurchaseIntentContext = createContext<PurchaseIntentValue>({
  ready: false,
  buy: () => {},
  publish: () => {},
});

export function PurchaseIntentProvider({ children }: { children: React.ReactNode }) {
  const fnRef = useRef<(() => void) | null>(null);
  const [ready, setReady] = useState(false);

  const publish = useCallback((fn: (() => void) | null) => {
    fnRef.current = fn;
    // Only a change in readiness re-renders; swapping one callback for another
    // (a different size picked, say) is invisible to consumers.
    setReady((was) => (was === !!fn ? was : !!fn));
  }, []);

  const buy = useCallback(() => {
    fnRef.current?.();
  }, []);

  const value = useMemo(() => ({ ready, buy, publish }), [ready, buy, publish]);
  return <PurchaseIntentContext.Provider value={value}>{children}</PurchaseIntentContext.Provider>;
}

export function usePurchaseIntent() {
  return useContext(PurchaseIntentContext);
}
