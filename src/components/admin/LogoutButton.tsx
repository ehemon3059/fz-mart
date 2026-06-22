"use client";

import { logout } from "@/app/(admin)/admin/login/actions";

export default function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit" className="text-gray-400 hover:text-white underline">
        Log out
      </button>
    </form>
  );
}
