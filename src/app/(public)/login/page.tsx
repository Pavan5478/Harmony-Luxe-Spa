// src/app/(public)/login/page.tsx
"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [stage, setStage] = useState<"login" | "first">("login");
  const [email, setEmail] = useState("cashier@example.com");
  const [password, setPassword] = useState("cashier123");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string>("");
  const router = useRouter();

  // Ensure theme is applied on login page too
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

  async function doLogin(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    const r = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (r.ok) {
      try {
        localStorage.setItem("bb.email", email);
      } catch {}
      router.push("/dashboard");
      return;
    }

    const j = await r.json().catch(() => ({} as any));

    if (r.status === 409 && (j as any)?.requirePasswordSetup) {
      setStage("first");
      setError("");
      return;
    }

    setError((j as any)?.message || "Login failed");
  }

  async function setFirstPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

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
    setError("Password set. Please sign in.");
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
                Bill Book
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
                  ? "Enter your email and password to access the dashboard."
                  : "Create a password to activate your account, then sign in."}
              </p>
            </div>

            {isLogin ? (
              <form className="space-y-4" onSubmit={doLogin}>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    Email
                  </label>
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    type="email"
                    className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    Password
                  </label>
                  <input
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    type="password"
                    className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
                >
                  Sign in
                </button>

                <p className="mt-4 rounded-lg bg-background/70 p-3 text-[11px] text-muted">
                  Users are managed in the <b>Users</b> sheet (email, role,
                  hash). If you put a plain password in column C, the app will
                  accept it once and convert it to a secure hash automatically.
                </p>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={setFirstPassword}>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted">
                    Email
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
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Create a password"
                    type="password"
                    className="w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>

                {error && (
                  <div className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-xs text-danger">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  className="mt-1 inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-105"
                >
                  Set password
                </button>

                <button
                  type="button"
                  className="mt-2 inline-flex w-full items-center justify-center text-xs font-medium text-primary hover:underline"
                  onClick={() => setStage("login")}
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