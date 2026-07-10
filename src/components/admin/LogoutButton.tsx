"use client";

import { logout } from "@/app/(admin)/admin/login/actions";
import { Icon } from "@/components/icons";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-sm text-stone-400 transition-colors hover:bg-white/5 hover:text-white outline-none focus-visible:ring-2 focus-visible:ring-brand-400"
      >
        <Icon name="externalLink" size={17} className="text-stone-500" />
        Log out
      </button>
    </form>
  );
}
