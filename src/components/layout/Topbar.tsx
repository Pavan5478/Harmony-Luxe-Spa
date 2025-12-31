﻿// src/components/layout/Topbar.tsx
"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  MouseEvent as ReactMouseEvent,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { inr } from "@/lib/format";

type Role = "ADMIN" | "CASHIER" | "ACCOUNTS" | null;

type NavLink = {
  href: string;
  label: string;
};

type InvoiceStats = {
  todayCount: number;
  todayAmount: number;
  yesterdayCount: number;
  yesterdayAmount: number;
  weekCount: number;
  weekAmount: number;
  draftCount: number;
  draftAmount: number;
};

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();

  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // default = DARK (black + gold). Toggle can switch to LIGHT.
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  const [todayLabel, setTodayLabel] = useState("");
  const [invoiceStats, setInvoiceStats] = useState<InvoiceStats | null>(null);
  const [statsOpen, setStatsOpen] = useState(false);

  const menuRef = useRef<HTMLDivElement | null>(null);
  const statsRef = useRef<HTMLDivElement | null>(null);

  // fetch identity
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = r.ok ? await r.json() : {};
        setEmail(j?.email || "");
        setRole((j?.role as Role) ?? null);
      } catch {
        // ignore
      }
    })();
  }, []);

  // fetch recent invoices for topbar stats
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/invoices/recent", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        const items = (j.items ?? []) as {
          billNo?: string;
          id?: string;
          dateISO?: string;
          grandTotal?: number;
        }[];

        const now = new Date();
        const startToday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );
        const startTomorrow = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() + 1
        );
        const startYesterday = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 1
        );
        const startWeek = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6
        ); // last 7 days including today

        let todayCount = 0;
        let todayAmount = 0;
        let yesterdayCount = 0;
        let yesterdayAmount = 0;
        let weekCount = 0;
        let weekAmount = 0;
        let draftCount = 0;
        let draftAmount = 0;

        for (const it of items) {
          if (!it.dateISO) continue;
          const d = new Date(it.dateISO);
          if (Number.isNaN(d.getTime())) continue;

          const amount = Number(it.grandTotal ?? 0) || 0;
          const isDraft = !it.billNo && !!it.id;

          if (isDraft) {
            draftCount += 1;
            draftAmount += amount;
          }

          if (d >= startToday && d < startTomorrow) {
            todayCount += 1;
            todayAmount += amount;
          } else if (d >= startYesterday && d < startToday) {
            yesterdayCount += 1;
            yesterdayAmount += amount;
          }

          if (d >= startWeek && d < startTomorrow) {
            weekCount += 1;
            weekAmount += amount;
          }
        }

        setInvoiceStats({
          todayCount,
          todayAmount,
          yesterdayCount,
          yesterdayAmount,
          weekCount,
          weekAmount,
          draftCount,
          draftAmount,
        });
      } catch {
        // ignore – topbar still works without stats
      }
    })();
  }, []);

  // today label
  useEffect(() => {
    const d = new Date();
    setTodayLabel(
      d.toLocaleDateString(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
      })
    );
  }, []);

  // init theme from localStorage (default to dark)
  useEffect(() => {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  setTheme(root.classList.contains("theme-dark") ? "dark" : "light");
}, []);

  function toggleTheme() {
  setTheme((prev) => {
    const next = prev === "light" ? "dark" : "light";
    if (typeof window !== "undefined") {
      const root = window.document.documentElement;

      if (next === "dark") root.classList.add("theme-dark");
      else root.classList.remove("theme-dark");

      // localStorage (optional)
      window.localStorage.setItem("bb.theme", next);

      // ✅ cookie (this is what fixes SSR hydration)
      document.cookie = `bb.theme=${next}; path=/; max-age=31536000; samesite=lax`;
    }
    return next;
  });
}

  async function doLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    try {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("bb.email");
      }
    } catch {}
    router.replace("/login");
  }

  function onMenuBackgroundClick(e: ReactMouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      setMenuOpen(false);
    }
  }

  // close stats popover when clicking outside
  useEffect(() => {
    if (!statsOpen) return;

    function handleClick(e: MouseEvent) {
      if (!statsRef.current) return;
      if (!statsRef.current.contains(e.target as Node)) {
        setStatsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [statsOpen]);

  // Links for mobile menu based on role
  const navLinks: NavLink[] = useMemo(() => {
    if (role === "ADMIN") {
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/menu", label: "Menu" },
        { href: "/billing", label: "Billing" },
        { href: "/invoices", label: "Invoices" },
        { href: "/expenses", label: "Expenses" },
        { href: "/reports", label: "Reports" },
        { href: "/settings", label: "Settings" },
      ];
    }
    if (role === "ACCOUNTS") {
      return [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/invoices", label: "Invoices" },
        { href: "/expenses", label: "Expenses" },
        { href: "/reports", label: "Reports" },
        { href: "/settings", label: "Settings" },
      ];
    }
    // CASHIER / unknown
    return [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/billing", label: "Billing" },
      { href: "/invoices", label: "Invoices" },
      { href: "/settings", label: "Settings" },
    ];
  }, [role]);

  // Label under logo: basic section name
  const currentLabel = useMemo(() => {
    if (!pathname || pathname === "/dashboard" || pathname === "/") {
      return "Dashboard overview";
    }
    if (pathname.startsWith("/billing")) return "Billing";
    if (pathname.startsWith("/invoices")) return "Invoices";
    if (pathname.startsWith("/menu")) return "Menu";
    if (pathname.startsWith("/reports")) return "Reports";
    if (pathname.startsWith("/settings")) return "Settings";
    return "Workspace";
  }, [pathname]);

  const roleLabel =
    role === "ADMIN"
      ? "Admin"
      : role === "CASHIER"
      ? "Cashier"
      : role === "ACCOUNTS"
      ? "Accounts"
      : "";

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center px-3 sm:h-16 sm:px-4 lg:px-6">
        {/* Left: mobile menu + brand */}
        <div className="flex flex-1 items-center gap-2">
          {/* Mobile menu button */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground shadow-sm lg:hidden"
            aria-label="Open navigation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {/* Brand */}
          <a
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-foreground"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs text-primary shadow-sm">
              XS
            </div>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-xs font-semibold">Harmony Luxe</span>
              <span className="text-[10px] text-muted">{currentLabel}</span>
            </div>
          </a>
        </div>

        {/* Center: date + invoice pulse (desktop) */}
        <div className="hidden flex-1 items-center justify-center md:flex">
          <div
            ref={statsRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setStatsOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted shadow-sm hover:border-primary/40 hover:text-foreground"
            >
              <span className="inline-flex items-center gap-1">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="text-primary"
                >
                  <path
                    d="M4 5h16M5 3v4M19 3v4M5 21h14a1 1 0 0 0 1-1V8H4v12a1 1 0 0 0 1 1Z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="font-medium text-foreground">
                  {todayLabel || "Today"}
                </span>
              </span>

              {invoiceStats && (
                <>
                  <span className="h-3 w-px bg-border" aria-hidden />
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    {invoiceStats.todayCount} today
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    {invoiceStats.yesterdayCount} yesterday
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    {invoiceStats.draftCount} drafts
                  </span>
                </>
              )}

              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                aria-hidden
                className={`transition-transform ${
                  statsOpen ? "rotate-180" : ""
                }`}
              >
                <path
                  d="M7 10l5 5 5-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {/* Popover with detailed stats */}
            {statsOpen && (
              <div className="absolute left-1/2 z-50 mt-2 w-80 -translate-x-1/2 rounded-2xl border border-border bg-card p-3 text-[11px] text-muted shadow-lg">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-medium text-foreground">
                    Invoice activity
                  </span>
                  <span className="text-[10px] text-muted">
                    Last 7 days snapshot
                  </span>
                </div>

                {invoiceStats ? (
                  <div className="space-y-2">
                    {/* Today / Yesterday */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="/invoices?range=today"
                        className="group rounded-xl border border-border bg-background px-2.5 py-1.5 transition hover:border-primary/40 hover:bg-card"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Today
                          </span>
                          <span className="text-[10px] text-muted">
                            {invoiceStats.todayCount} inv
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {inr(invoiceStats.todayAmount)}
                        </div>
                      </a>

                      <a
                        href="/invoices?range=yesterday"
                        className="group rounded-xl border border-border bg-background px-2.5 py-1.5 transition hover:border-primary/40 hover:bg-card"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                            Yesterday
                          </span>
                          <span className="text-[10px] text-muted">
                            {invoiceStats.yesterdayCount} inv
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {inr(invoiceStats.yesterdayAmount)}
                        </div>
                      </a>
                    </div>

                    {/* Last 7 days / Drafts */}
                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href="/invoices?range=last7"
                        className="group rounded-xl border border-border bg-background px-2.5 py-1.5 transition hover:border-primary/40 hover:bg-card"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                            Last 7 days
                          </span>
                          <span className="text-[10px] text-muted">
                            {invoiceStats.weekCount} inv
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {inr(invoiceStats.weekAmount)}
                        </div>
                      </a>

                      <a
                        href="/invoices?status=draft"
                        className="group rounded-xl border border-border bg-background px-2.5 py-1.5 transition hover:border-primary/40 hover:bg-card"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="inline-flex items-center gap-1 font-medium text-foreground">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Drafts
                          </span>
                          <span className="text-[10px] text-muted">
                            {invoiceStats.draftCount} inv
                          </span>
                        </div>
                        <div className="mt-1 text-xs font-semibold text-foreground">
                          {inr(invoiceStats.draftAmount)}
                        </div>
                      </a>
                    </div>

                    <div className="mt-1 flex items-center justify-between text-[10px] text-muted">
                      <span>
                        Click a card to open the Invoices screen with that
                        focus.
                      </span>
                      <a
                        href="/invoices"
                        className="text-[10px] font-medium text-primary hover:underline"
                      >
                        View all
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="py-3 text-[11px] text-muted">
                    Loading invoice activity…
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: theme toggle + user */}
        <div className="flex flex-1 items-center justify-end gap-2">
          {/* Theme toggle */}
          <button
            type="button"
            onClick={toggleTheme}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-card text-xs text-muted shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              // sun icon
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <circle
                  cx="12"
                  cy="12"
                  r="4"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  fill="none"
                />
                <path
                  d="M12 3v2.5M12 18.5V21M4.22 4.22l1.77 1.77M17.99 17.99l1.79 1.79M3 12h2.5M18.5 12H21M4.22 19.78l1.77-1.77M17.99 6.01l1.79-1.79"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              // moon icon
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

          {/* User info (desktop) */}
          <div className="hidden flex-col items-end leading-tight md:flex">
            <span className="max-w-[180px] truncate text-xs font-medium text-foreground">
              {email || "—"}
            </span>
            <span className="text-[10px] text-muted">
              {roleLabel || "Staff"}
            </span>
          </div>

          {/* Logout button */}
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

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={onMenuBackgroundClick}
        >
          <div
            ref={menuRef}
            className="absolute left-0 right-0 top-0 mx-auto mt-2 w-[92%] max-w-sm rounded-2xl border border-border bg-card p-3 shadow-lg"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border pb-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs text-primary">
                  XS
                </div>
                <div className="flex flex-col leading-tight">
                  <span className="text-xs font-semibold text-foreground">
                    Harmony Luxe
                  </span>
                  <span className="text-[10px] text-muted">
                    {roleLabel || "Staff"}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-background text-muted"
                aria-label="Close menu"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M6 6l12 12M18 6 6 18"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <div className="mt-2 space-y-1">
              {navLinks.map((link) => {
                const active =
                  pathname === link.href ||
                  (pathname || "").startsWith(link.href + "/");
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={[
                      "flex items-center gap-2 rounded-xl px-2.5 py-2 text-sm",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:bg-background hover:text-foreground",
                    ].join(" ")}
                  >
                    {link.label}
                  </a>
                );
              })}

              <button
                type="button"
                onClick={doLogout}
                className="mt-1 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm text-danger hover:bg-danger/10"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                  <path
                    d="M9 5H5v14h4M16 12H9m7-4 4 4-4 4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}