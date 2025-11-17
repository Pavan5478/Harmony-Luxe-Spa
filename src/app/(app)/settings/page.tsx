"use client";

import { useEffect, useState } from "react";

export default function SettingsPage() {
  const [email, setEmail] = useState<string>("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [msgKind, setMsgKind] = useState<"success" | "error" | null>(
    null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        if (r.ok) {
          const j = await r.json();
          if (j?.email) {
            setEmail(j.email);
            return;
          }
        }
        // fallback to localStorage when available
        if (typeof window !== "undefined") {
          setEmail(localStorage.getItem("bb.email") || "");
        }
      } catch {
        if (typeof window !== "undefined") {
          setEmail(localStorage.getItem("bb.email") || "");
        }
      }
    })();
  }, []);

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setMsgKind(null);
    setBusy(true);
    try {
      const r = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, oldPassword, newPassword }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        throw new Error(j?.error || "Failed to change password");
      }
      setMsg("Password updated");
      setMsgKind("success");
      setOldPassword("");
      setNewPassword("");
    } catch (err: any) {
      setMsg(err?.message || "Failed");
      setMsgKind("error");
    } finally {
      setBusy(false);
    }
  }

  const disabled =
    busy ||
    !email ||
    !oldPassword.trim() ||
    !newPassword.trim();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-5 lg:gap-6">
      {/* Header card */}
      <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Settings
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Account &amp; security
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Update your password for staff login. User roles and email
              addresses are still managed in the shared sheet.
            </p>
          </div>

          <div className="rounded-xl bg-background px-3 py-2 text-[11px] text-muted sm:text-xs">
            <div className="font-medium text-foreground">
              Signed in as
            </div>
            <div className="mt-1 max-w-[220px] truncate font-mono text-[11px]">
              {email || "—"}
            </div>
            <div className="mt-1 text-[10px]">
              If this looks wrong, sign out and log in again with the
              correct account.
            </div>
          </div>
        </div>
      </section>

      {/* Password form */}
      <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <h2 className="text-sm font-semibold text-foreground sm:text-base">
          Change password
        </h2>
        <p className="mt-1 text-[11px] text-muted sm:text-xs">
          Your new password will be required the next time you sign in.
          Make sure it&apos;s something only staff knows.
        </p>

        <form
          onSubmit={changePassword}
          className="mt-4 space-y-3"
        >
          <div className="space-y-1 text-xs">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Current password
            </label>
            <input
              placeholder="Enter current password"
              type="password"
              className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          </div>

          <div className="space-y-1 text-xs">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
              New password
            </label>
            <input
              placeholder="Choose a new password"
              type="password"
              className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <p className="mt-1 text-[10px] text-muted">
              Tip: use at least 8 characters with a mix of numbers or
              symbols. Avoid using your business name or phone number.
            </p>
          </div>

          <div className="pt-1">
            <button
              className={`inline-flex items-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105 ${
                disabled ? "cursor-not-allowed opacity-60" : ""
              }`}
              disabled={disabled}
            >
              {busy ? "Updating…" : "Update password"}
            </button>
          </div>

          {msg && (
            <div
              className={`mt-2 rounded-xl px-3 py-2 text-xs sm:text-sm ${
                msgKind === "success"
                  ? "border border-success/40 bg-success/5 text-success"
                  : "border border-danger/40 bg-danger/5 text-danger"
              }`}
            >
              {msg}
            </div>
          )}
        </form>

        <div className="mt-4 border-t border-border/70 pt-3 text-[11px] text-muted sm:text-xs">
          <p>
            Forgot your current password? An admin can reset it from the
            <span className="font-semibold"> Users</span> sheet by
            temporarily entering a plain password in the hash column.
          </p>
        </div>
      </section>
    </div>
  );
}