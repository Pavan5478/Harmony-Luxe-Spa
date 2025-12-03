// src/app/(public)/login/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const USER_PRESETS = [
  {
    id: "ADMIN",
    label: "Admin",
    email: "admin@example.com",
    description: "Full access – menu, billing & reports",
  },
  {
    id: "CASHIER",
    label: "Cashier",
    email: "cashier@example.com",
    description: "Front desk billing & orders",
  },
  {
    id: "ACCOUNTS",
    label: "Accounts",
    email: "accounts@example.com",
    description: "Finance & reports only",
  },
] as const;

type PresetId = (typeof USER_PRESETS)[number]["id"];

export default function LoginPage() {
  const [stage, setStage] = useState<"login" | "first">("login");

  const [selectedUser, setSelectedUser] = useState<PresetId>("CASHIER");
  const [email, setEmail] = useState("cashier@example.com");

  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [error, setError] = useState<string>("");
  const [info, setInfo] = useState<string>("");
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
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
        // first‑time password
        setStage("first");
        setNewPassword("");
        setError("");
        setInfo(
          "This user does not have a password yet. Create one to activate the account."
        );
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
      setInfo("Password set. Please sign in with the new password.");
      setNewPassword("");
    } finally {
      setSubmitting(false);
    }
  }

  const isLogin = stage === "login";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-6 text-foreground">
      <div className="w-full max-w-4xl">
        {/* Brand (mobile) */}
        <div className="mb-6 flex items-center justify-between md:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-card shadow ring-1 ring-primary/20">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden
                className="text-primary"
              >
                <path
                  d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9H4V7.5Z"
                  fill="currentColor"
                />
                <rect
                  x="4"
                  y="9"
                  width="16"
                  height="10"
                  rx="2"
                  fill="currentColor"
                  opacity=".12"
                />
              </svg>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold tracking-tight">
                Harmony Luxe
              </span>
              <span className="text-[11px] text-muted">Billing Suite</span>
            </div>
          </div>
        </div>

        {/* Main card */}
        <div className="grid overflow-hidden rounded-3xl border border-border bg-card shadow-md shadow-slate-900/5 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
          {/* Left info panel (desktop) */}
          <div className="relative hidden bg-linear-to-b from-primary via-primary/90 to-sky-500 px-8 py-8 text-white md:flex md:flex-col md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                Realtime bill book dashboard
              </div>

              <h1 className="mt-4 text-2xl font-semibold tracking-tight">
                Welcome to Bill Book Admin
              </h1>
              <p className="mt-2 text-sm text-indigo-100">
                Manage menu items, generate bills, and track invoices &amp;
                reports from one clean dashboard.
              </p>
            </div>

            <div className="mt-6 space-y-3 text-xs text-indigo-100/90">
              <div className="flex items-start gap-2">
                <span className="mt-[3px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[10px]">
                  ✓
                </span>
                <p>
                  Roles: <strong>Admin</strong>, <strong>Cashier</strong>,{" "}
                  <strong>Accounts</strong> – each with a tailored workspace.
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-[3px] inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/15 text-[10px]">
                  ✓
                </span>
                <p>
                  First-time users are configured in the <strong>Users</strong>{" "}
                  sheet – the app can auto-convert plain passwords to secure
                  hashes.
                </p>
              </div>
              <p className="mt-4 text-[11px] text-indigo-100/80">
                Tip: Use the default credentials you set in your sheet, or ask
                your admin to create a user for you.
              </p>
            </div>
          </div>

          {/* Right form panel */}
          <div className="px-6 py-6 sm:px-8 sm:py-8">
            {/* Brand (desktop) */}
            <div className="mb-6 hidden items-center justify-between md:flex">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow ring-1 ring-primary/20">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    aria-hidden
                    className="text-primary"
                  >
                    <path
                      d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9H4V7.5Z"
                      fill="currentColor"
                    />
                    <rect
                      x="4"
                      y="9"
                      width="16"
                      height="10"
                      rx="2"
                      fill="currentColor"
                      opacity=".12"
                    />
                  </svg>
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-sm font-semibold tracking-tight">
                    Bill Book
                  </span>
                  <span className="text-[11px] text-muted">Billing Suite</span>
                </div>
              </div>
            </div>

            {/* Heading */}
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-foreground">
                {isLogin ? "Sign in to your workspace" : "Set your password"}
              </h2>
              <p className="mt-1 text-xs text-muted">
                {isLogin
                  ? "Choose your role and enter the staff password to access the dashboard."
                  : "Create a password to activate this user, then sign in."}
              </p>
            </div>

            {/* Shared info / error messages */}
            {info && (
              <div className="mb-3 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-primary">
                {info}
              </div>
            )}
            {error && (
              <div className="mb-3 rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                {error}
              </div>
            )}

            {isLogin ? (
              <form className="space-y-4" onSubmit={doLogin}>
                {/* Role selection – 3 fixed options */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted">
                    Sign in as
                  </label>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    {USER_PRESETS.map((preset) => {
                      const active = preset.id === selectedUser;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => setSelectedUser(preset.id)}
                          className={`flex flex-col rounded-2xl border px-3 py-2 text-left text-[11px] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            active
                              ? "border-primary bg-primary/10"
                              : "border-border bg-background hover:border-primary/50 hover:bg-background/80"
                          }`}
                        >
                          <span className="text-[12px] font-semibold">
                            {preset.label}
                          </span>
                          <span className="mt-1 text-[11px] text-muted">
                            {preset.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-muted">
                    We&apos;ll sign you in as{" "}
                    <span className="font-mono text-[11px]">
                      {email}
                    </span>
                    . Ask your admin if you need a different login.
                  </p>
                </div>

                {/* Password with show/hide */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter staff password"
                      type={showPassword ? "text" : "password"}
                      className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 pr-10 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute inset-y-0 right-3 flex items-center text-xs text-muted hover:text-foreground"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <span aria-hidden>{showPassword ? "🙈" : "👁️"}</span>
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-muted">
                      Only staff should know this password.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowForgot((v) => !v)}
                      className="text-[10px] font-medium text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                </div>

                {showForgot && (
                  <div className="rounded-lg border border-border bg-background/80 p-3 text-[11px] text-muted">
                    <p className="font-semibold text-foreground">
                      How to reset your password
                    </p>
                    <ol className="mt-1 list-inside list-decimal space-y-1">
                      <li>
                        Ask an admin to open the shared <b>Bill Book</b> Google
                        Sheet.
                      </li>
                      <li>
                        In the <b>Users</b> tab, find your row and put a{" "}
                        <b>temporary plain password</b> in{" "}
                        <code>hash_or_password</code>.
                      </li>
                      <li>
                        Try signing in here with that password once. The app
                        will convert it to a secure hash automatically.
                      </li>
                    </ol>
                  </div>
                )}

                {/* Submit */}
                <button
                  type="submit"
                  disabled={submitting || !password.trim()}
                  className={`mt-1 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition 
                    ${submitting || !password.trim()
                      ? "cursor-not-allowed opacity-70"
                      : "cursor-pointer hover:-translate-y-px hover:brightness-110 hover:shadow-md"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card`}
                >
                  {submitting ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-transparent align-middle animate-spin" />
                      Signing you in…
                    </>
                  ) : (
                    "Sign in"
                  )}
                </button>

                <p className="mt-4 rounded-lg bg-background/70 p-3 text-[11px] text-muted">
                  Users are managed in the <b>Users</b> sheet (email, role,
                  hash). If you put a plain password in column C, the app will
                  accept it once and convert it to a secure hash automatically.
                </p>
              </form>
            ) : (
              // First‑time password setup
              <form className="space-y-4" onSubmit={setFirstPassword}>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    User
                  </label>
                  <input
                    value={email}
                    readOnly
                    className="w-full cursor-not-allowed rounded-full border border-border bg-background/60 px-3.5 py-2.5 text-sm text-muted shadow-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    New password
                  </label>
                  <div className="relative">
                    <input
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Create a password"
                      type={showNewPassword ? "text" : "password"}
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
                  <p className="text-[10px] text-muted">
                    Use at least 8 characters. Avoid your shop name or phone
                    number.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={submitting || !newPassword.trim()}
                  className={`mt-1 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition 
                    ${
                      submitting || !newPassword.trim()
                        ? "cursor-not-allowed opacity-70"
                        : "cursor-pointer hover:-translate-y-px hover:brightness-110 hover:shadow-md"
                    } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card`}
                >
                  {submitting ? (
                    <>
                      <span className="mr-2 inline-block h-4 w-4 rounded-full border-2 border-white/40 border-t-transparent align-middle animate-spin" />
                      Saving…
                    </>
                  ) : (
                    "Set password"
                  )}
                </button>

                <button
                  type="button"
                  className="mt-2 inline-flex w-full items-center justify-center text-xs font-medium text-primary hover:underline"
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
          </div>
        </div>
      </div>
    </div>
  );
}