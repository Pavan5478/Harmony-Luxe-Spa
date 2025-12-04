// src/app/(public)/login/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const APP_NAME = "Bill Book";
const APP_SUBTITLE = "Admin dashboard";
// Put your logo file in /public and update this path
const LOGO_SRC: string | null = "/harmony_luxe.png";

const USER_PRESETS = [
  {
    id: "ADMIN",
    label: "Admin",
    email: "admin@example.com",
    description: "Full access to all settings, menu, and reports.",
  },
  {
    id: "CASHIER",
    label: "Cashier",
    email: "cashier@example.com",
    description: "Front desk billing & orders only.",
  },
  {
    id: "ACCOUNTS",
    label: "Accounts",
    email: "accounts@example.com",
    description: "Finance & reports – no menu edits.",
  },
] as const;

type PresetId = (typeof USER_PRESETS)[number]["id"];

export default function LoginPage() {
  const [stage, setStage] = useState<"login" | "first">("login");

  const [selectedUser, setSelectedUser] = useState<PresetId>("CASHIER");
  const [email, setEmail] = useState("cashier@example.com");

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const router = useRouter();

  // theme on login page
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("bb.theme");
    const prefersDark =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next =
      stored === "dark" || (!stored && prefersDark) ? "dark" : "light";

    document.documentElement.classList.toggle("theme-dark", next === "dark");
  }, []);

  // whenever user preset changes, update the internal email used for auth
  useEffect(() => {
    const preset = USER_PRESETS.find((p) => p.id === selectedUser);
    if (preset) setEmail(preset.email);
  }, [selectedUser]);

  async function doLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setInfo("");
    setSubmitting(true);

    try {
      const r = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (r.ok) {
        try {
          localStorage.setItem("bb.email", email);
        } catch {
          // ignore
        }
        router.push("/dashboard");
        return;
      }

      const j = await r.json().catch(() => ({} as any));

      if (r.status === 409 && (j as any)?.requirePasswordSetup) {
        // first-time password
        setStage("first");
        setNewPassword("");
        setError("");
        setInfo("Create a password for this user.");
        return;
      }

      setError((j as any)?.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function setFirstPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;

    setError("");
    setInfo("");
    setSubmitting(true);

    try {
      const r = await fetch("/api/auth/set-first-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, newPassword }),
      });

      const j = await r.json().catch(() => ({} as any));

      if (!r.ok) {
        setError((j as any)?.error || "Could not set password");
        return;
      }

      setPassword(newPassword);
      setStage("login");
      setInfo("Password saved. Sign in with the new password.");
      setNewPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = stage === "login";
  const selectedPreset = USER_PRESETS.find((p) => p.id === selectedUser);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-background/90 px-4 text-foreground">
      <div className="w-full max-w-md">
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-card/95 shadow-[0_18px_60px_rgba(0,0,0,0.6)] backdrop-blur">
          {/* Brand header – big logo only */}
<header className="border-b border-border/60 bg-background/60 px-8 py-6">
  <div className="flex justify-center">
    <div className="flex h-24 w-24 items-center justify-center overflow-hidden">
      {LOGO_SRC ? (
        <img
          src={LOGO_SRC}
          alt={`${APP_NAME} logo`}
          className="h-full w-full object-contain"
        />
      ) : (
        <span
          aria-hidden
          className="text-2xl font-semibold tracking-widest"
        >
          {APP_NAME.split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase()}
        </span>
      )}
    </div>
  </div>
</header>


          {/* Card body */}
          <main className="px-8 pb-7 pt-5">

            {/* Info / error */}
            {info && (
              <div
                className="mt-4 rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-xs text-primary"
                role="status"
                aria-live="polite"
              >
                {info}
              </div>
            )}
            {error && (
              <div
                className="mt-4 rounded-md border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger"
                role="alert"
                aria-live="assertive"
              >
                {error}
              </div>
            )}

            {isLogin ? (
              <form className="mt-5 space-y-4" onSubmit={doLogin}>
                {/* Role */}
                <div>
                  <label
                    htmlFor="role"
                    className="text-xs font-medium text-muted"
                  >
                    Role
                  </label>
                  <select
                    id="role"
                    value={selectedUser}
                    onChange={(e) =>
                      setSelectedUser(e.target.value as PresetId)
                    }
                    className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {USER_PRESETS.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>

                  {/* Fixed-height area so no layout jump when text changes */}
                  <div className="mt-1 min-h-[2.75rem] text-[11px] text-muted">
                    <p>{selectedPreset?.description}</p>
                    <p className="mt-0.5 text-[10px]">
                      Signing in as{" "}
                      <span className="font-mono text-[10px]">{email}</span>
                    </p>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label
                    htmlFor="password"
                    className="text-xs font-medium text-muted"
                  >
                    Password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter staff password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 pr-10 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-xs text-muted hover:text-foreground"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      <span aria-hidden>{showPassword ? "🙈" : "👁️"}</span>
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !password.trim()}
                  className={`mt-3 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition
                    ${
                      submitting || !password.trim()
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer hover:-translate-y-[1px] hover:brightness-110"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card`}
                >
                  {submitting ? "Signing in..." : "Sign in"}
                </button>
              </form>
            ) : (
              // First-time password setup
              <form className="mt-5 space-y-4" onSubmit={setFirstPassword}>
                <div>
                  <label
                    htmlFor="user-email"
                    className="text-xs font-medium text-muted"
                  >
                    User
                  </label>
                  <input
                    id="user-email"
                    value={email}
                    readOnly
                    className="mt-1 w-full cursor-not-allowed rounded-full border border-border bg-background/60 px-3.5 py-2.5 text-sm text-muted shadow-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="new-password"
                    className="text-xs font-medium text-muted"
                  >
                    New password
                  </label>
                  <div className="mt-1 relative">
                    <input
                      id="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create a password"
                      type={showNewPassword ? "text" : "password"}
                      autoComplete="new-password"
                      className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 pr-10 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-xs text-muted hover:text-foreground"
                      aria-label={
                        showNewPassword ? "Hide password" : "Show password"
                      }
                    >
                      <span aria-hidden>{showNewPassword ? "🙈" : "👁️"}</span>
                    </button>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    Use at least 8 characters. Avoid your shop name or phone
                    number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newPassword.trim()}
                  className={`mt-3 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-primary to-primary/80 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/25 transition
                    ${
                      submitting || !newPassword.trim()
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer hover:-translate-y-[1px] hover:brightness-110"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card`}
                >
                  {submitting ? "Saving..." : "Set password"}
                </button>

                <button
                  type="button"
                  className="w-full text-center text-xs font-medium text-primary hover:underline"
                  onClick={() => {
                    setStage("login");
                    setInfo("");
                    setError("");
                  }}
                >
                  Back to sign in
                </button>
              </form>
            )}
          </main>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted">
          Forgot password? Ask your admin to reset it.
        </p>
      </div>
    </div>
  );
}