"use client";

/**
 * Crash protection for the product form.
 *
 * A full product — options matrix, accordion sections, SEO — is twenty minutes
 * of typing, and until now a closed tab or a stray reload threw all of it away.
 * This hook mirrors the form state into localStorage as the admin types, and
 * offers it back on the next visit.
 *
 * Deliberate choices:
 *
 *  • A found draft is OFFERED, never auto-applied. Silently overwriting an edit
 *    form would hide whatever the product actually holds in the database, so
 *    the admin gets a banner and decides.
 *  • Nothing is written while an offer is unanswered. Otherwise the blank form
 *    the admin is looking at would overwrite the very draft being offered
 *    before they could click Restore.
 *  • Drafts are keyed per product ("new" or the product id), so a draft for one
 *    product can never surface on another.
 *  • Writing is suspended on submit and the key removed. A successful save
 *    redirects away and the draft is already gone; a rejected save resumes and
 *    immediately re-writes, so a validation error never costs the work.
 *
 * The state is plain JSON (photos are uploaded URLs by this point, not File
 * objects), so a structured clone is never needed.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** Bump when FormState changes shape — old drafts are then ignored, not crashed on. */
const VERSION = 1;
/** Drafts older than this are stale enough to be noise rather than a rescue. */
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Quiet period after the last keystroke before writing. */
const DEBOUNCE_MS = 700;

interface Envelope<T> {
  v: number;
  savedAt: number;
  state: T;
}

export function draftKey(productId: number | null) {
  return `fzmart:product-draft:${productId ?? "new"}`;
}

interface Options<T> {
  /** localStorage key — see draftKey(). */
  key: string;
  /** Live form state, mirrored as it changes. */
  state: T;
  /** The pristine state this form opened with; an untouched form saves nothing. */
  baseline: T;
  /** Applies a restored draft to the form. */
  onRestore: (state: T) => void;
}

export interface DraftAutosave<T> {
  /** A draft was found and is waiting on the admin. Null once answered. */
  offer: { savedAt: number; state: T } | null;
  restore: () => void;
  discard: () => void;
  /** When the last mirror was written; null = nothing stored yet. */
  savedAt: number | null;
  /** State differs from the baseline — drives the close-tab warning. */
  dirty: boolean;
  /** Call as the save starts: stops mirroring and drops the stored draft. */
  suspend: () => void;
  /** Call if that save came back rejected: re-mirrors immediately. */
  resume: () => void;
}

export function useDraftAutosave<T>({ key, state, baseline, onRestore }: Options<T>): DraftAutosave<T> {
  const [offer, setOffer] = useState<{ savedAt: number; state: T } | null>(null);
  /** False only while an offer sits unanswered — see the header note. */
  const [answered, setAnswered] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const suspended = useRef(false);

  const baselineJson = useMemo(() => JSON.stringify(baseline), [baseline]);
  const stateJson = JSON.stringify(state);
  const dirty = stateJson !== baselineJson;

  const write = useCallback(
    (json: string) => {
      const envelope = `{"v":${VERSION},"savedAt":${Date.now()},"state":${json}}`;
      try {
        window.localStorage.setItem(key, envelope);
        setSavedAt(Date.now());
      } catch {
        // Quota exceeded or storage disabled (private window, locked-down
        // policy). Autosave is a safety net, never a blocker — the form still
        // works exactly as it did before.
      }
    },
    [key],
  );

  const drop = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* see write() */
    }
    setSavedAt(null);
  }, [key]);

  /* ── on mount: is there something to rescue? ── */
  useEffect(() => {
    let found: { savedAt: number; state: T } | null = null;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw) as Envelope<T>;
        const fresh = Date.now() - parsed.savedAt < MAX_AGE_MS;
        // A draft identical to the baseline is nothing to offer back.
        if (parsed.v === VERSION && fresh && JSON.stringify(parsed.state) !== baselineJson) {
          found = { savedAt: parsed.savedAt, state: parsed.state };
        } else {
          window.localStorage.removeItem(key);
        }
      }
    } catch {
      // Corrupt or unreadable — treat as no draft rather than breaking the form.
      try {
        window.localStorage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
    setOffer(found);
    setAnswered(!found);
    // Mount-only: re-running would re-offer a draft the admin already dismissed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  /* ── mirror as they type ── */
  useEffect(() => {
    if (!answered || suspended.current) return;
    if (stateJson === baselineJson) return; // nothing typed yet
    const t = setTimeout(() => write(stateJson), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [answered, stateJson, baselineJson, write]);

  /* ── last-moment flush + close-tab warning ── */
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      // Flush synchronously: the debounce may still be pending, and this is the
      // last chance to run before the tab goes.
      if (answered && !suspended.current) write(stateJson);
      if (suspended.current) return; // a save is in flight; let it go
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty, answered, stateJson, write]);

  const restore = useCallback(() => {
    if (offer) onRestore(offer.state);
    setOffer(null);
    setAnswered(true);
  }, [offer, onRestore]);

  const discard = useCallback(() => {
    drop();
    setOffer(null);
    setAnswered(true);
  }, [drop]);

  const suspend = useCallback(() => {
    suspended.current = true;
    drop();
  }, [drop]);

  const resume = useCallback(() => {
    suspended.current = false;
    if (answered && stateJson !== baselineJson) write(stateJson);
  }, [answered, stateJson, baselineJson, write]);

  return { offer, restore, discard, savedAt, dirty, suspend, resume };
}
