"use client";

import { useRef, useState, useTransition } from "react";
import { changeUsernameAction, changePasswordAction } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none focus:border-stone-900";
const labelClass = "block text-sm font-medium text-stone-700";

type Msg = { type: "ok" | "err"; text: string } | null;

function Notice({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return (
    <p
      className={`rounded-lg border px-4 py-2.5 text-sm ${
        msg.type === "ok"
          ? "border-green-200 bg-green-50 text-green-700"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
    >
      {msg.text}
    </p>
  );
}

export default function CredentialsPanel({ username }: { username: string }) {
  const [usernameMsg, setUsernameMsg] = useState<Msg>(null);
  const [passwordMsg, setPasswordMsg] = useState<Msg>(null);
  const [usernamePending, startUsernameTransition] = useTransition();
  const [passwordPending, startPasswordTransition] = useTransition();
  const passwordFormRef = useRef<HTMLFormElement>(null);

  function submitUsername(formData: FormData) {
    setUsernameMsg(null);
    startUsernameTransition(async () => {
      const res = await changeUsernameAction(formData);
      if (res.error) setUsernameMsg({ type: "err", text: res.error });
      else setUsernameMsg({ type: "ok", text: res.success ?? "Updated." });
    });
  }

  function submitPassword(formData: FormData) {
    setPasswordMsg(null);
    startPasswordTransition(async () => {
      const res = await changePasswordAction(formData);
      if (res.error) setPasswordMsg({ type: "err", text: res.error });
      else {
        setPasswordMsg({ type: "ok", text: res.success ?? "Updated." });
        passwordFormRef.current?.reset();
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* ── Username ─────────────────────────────────────────── */}
      <form action={submitUsername} className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Username</h3>
          <p className="mt-1 text-sm text-stone-500">
            You sign in with this name (your email also works). Confirm the change with your current
            password.
          </p>
        </div>

        <Notice msg={usernameMsg} />

        <div className="space-y-1.5">
          <label htmlFor="username" className={labelClass}>
            New username
          </label>
          <input
            id="username"
            name="username"
            defaultValue={username}
            required
            minLength={3}
            maxLength={32}
            autoComplete="username"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="username-current-password" className={labelClass}>
            Current password
          </label>
          <input
            id="username-current-password"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={fieldClass}
          />
        </div>

        <button
          type="submit"
          disabled={usernamePending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {usernamePending ? "Saving…" : "Update username"}
        </button>
      </form>

      {/* ── Password ─────────────────────────────────────────── */}
      <form
        ref={passwordFormRef}
        action={submitPassword}
        className="space-y-4 border-t border-stone-200 pt-8"
      >
        <div>
          <h3 className="text-sm font-semibold text-stone-800">Password</h3>
          <p className="mt-1 text-sm text-stone-500">
            Choose a new password of at least 8 characters.
          </p>
        </div>

        <Notice msg={passwordMsg} />

        <div className="space-y-1.5">
          <label htmlFor="password-current" className={labelClass}>
            Current password
          </label>
          <input
            id="password-current"
            name="currentPassword"
            type="password"
            required
            autoComplete="current-password"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password-new" className={labelClass}>
            New password
          </label>
          <input
            id="password-new"
            name="newPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={fieldClass}
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password-confirm" className={labelClass}>
            Confirm new password
          </label>
          <input
            id="password-confirm"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={fieldClass}
          />
        </div>

        <button
          type="submit"
          disabled={passwordPending}
          className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-semibold text-white hover:bg-stone-800 disabled:opacity-50"
        >
          {passwordPending ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
