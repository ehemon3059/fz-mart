"use client";

import { create } from "zustand";

// Shared open/close state for the mobile slide-in menu, so both the masthead
// hamburger and the bottom tab bar's "Menu" tab drive the same drawer.
interface MobileMenuState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useMobileMenu = create<MobileMenuState>()((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
