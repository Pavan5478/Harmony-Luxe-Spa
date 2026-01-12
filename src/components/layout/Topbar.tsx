﻿// src/components/layout/Topbar.tsx
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Role = "ADMIN" | "CASHIER" | "ACCOUNTS" | null;

export default function Topbar() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(null);
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store", signal: ac.signal });
        const j = r.ok ? await r.json() : {};
        setEmail(j?.email || "");
        setRole((j?.role as Role) ?? null);
      } catch {}
    })();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setTheme(document.documentElement.classList.contains("theme-dark") ? "dark" : "light");
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      if (next === "dark") document.documentElement.classList.add("theme-dark");
      else document.documentElement.classList.remove("theme-dark");
      try {
        window.localStorage.setItem("bb.theme", next);
      } catch {}
      document.cookie = `bb.theme=${next}; path=/; max-age=31536000; samesite=lax`;
      return next;
    });
  }

  async function doLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    try {
      window.localStorage.removeItem("bb.email");
    } catch {}
    router.replace("/login");
  }

  const roleLabel =
    role === "ADMIN"
      ? "Admin"
      : role === "CASHIER"
        ? "Cashier"
        : role === "ACCOUNTS"
          ? "Accounts"
          : "Staff";

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      {/* On desktop (lg+): hide brand completely + keep actions aligned right */}
      <div className="mx-auto flex h-14 max-w-6xl min-w-0 items-center justify-between px-3 sm:h-16 sm:px-4 lg:justify-end lg:px-6">
        {/* Brand: MOBILE ONLY */}
        <Link
          href="/dashboard"
          prefetch={false}
          className="flex min-w-0 items-center gap-2 lg:hidden"
          aria-label="Go to Dashboard"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-xs text-primary shadow-sm">
            XS
          </div>
          <div className="truncate text-sm font-semibold text-foreground">Harmony Luxe</div>
        </Link>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-xs text-muted shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.8" fill="none" />
                <path
                  d="M12 3v2.5M12 18.5V21M4.22 4.22l1.77 1.77M17.99 17.99l1.79 1.79M3 12h2.5M18.5 12H21M4.22 19.78l1.77-1.77M17.99 6.01l1.79-1.79"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M19 14.5A7.5 7.5 0 0 1 10.5 6 6 6 0 1 0 19 14.5Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </button>

          <div className="hidden min-w-0 flex-col items-end leading-tight sm:flex">
            <span className="max-w-[220px] truncate text-xs font-medium text-foreground">
              {email || "—"}
            </span>
            <span className="text-[10px] text-muted">{roleLabel}</span>
          </div>

          <button
            type="button"
            onClick={doLogout}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-[11px] text-danger shadow-sm hover:bg-danger/10"
            aria-label="Logout"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M9 5H5v14h4M16 12H9m7-4 4 4-4 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}