"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Icon } from "@/components/icons";
import { cn } from "./cn";

type ToastTone = "success" | "error";
interface ToastItem {
  id: number;
  msg: string;
  tone: ToastTone;
}

interface ToastApi {
  success: (msg: string) => void;
  error: (msg: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Wrap an admin area (or a client subtree) to enable useToast(). Renders the
 *  stack in a fixed, aria-live region so create/update/delete feedback is
 *  announced and visually consistent. */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((msg: string, tone: ToastTone) => {
    const id = ++idRef.current;
    setItems((prev) => [...prev, { id, msg, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  const api: ToastApi = {
    success: (m) => push(m, "success"),
    error: (m) => push(m, "error"),
  };

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 left-1/2 z-[70] flex -translate-x-1/2 flex-col items-center gap-2 lg:bottom-6"
        role="status"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-2.5 rounded-lg bg-ink px-4 py-3 text-[14px] font-medium text-white shadow-pop"
            style={{ animation: "fz-pop .2s ease" }}
          >
            <span
              className={cn(
                "flex h-5 w-5 items-center justify-center rounded-full text-white",
                t.tone === "success" ? "bg-accent" : "bg-danger",
              )}
            >
              <Icon name={t.tone === "success" ? "check" : "x"} size={13} strokeWidth={2.6} />
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}
