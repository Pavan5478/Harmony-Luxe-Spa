﻿// src/components/layout/Sidebar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";

type Role = "ADMIN" | "CASHIER" | "ACCOUNTS" | null;

type LinkItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

const ICONS = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 12h7V4H4v8Zm9 8h7v-6h-7v6Zm0-8h7V4h-7v8ZM4 20h7v-4H4v4Z"
        fill="currentColor"
      />
    </svg>
  ),
  menu: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M4 7h16M4 12h10M4 17h7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  ),
  billing: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M6 4h12a2 2 0 0 1 2 2v11l-3-2-3 2-3-2-3 2-3-2V6a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  invoices: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M7 4h10a2 2 0 0 1 2 2v12l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  reports: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M5 19V5h14v14H5Zm3-3.5 2.8-3.3 2.4 2.4L16 11"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
      <path
        d="M4 12c0-.5.07-1 .2-1.5L3 9l2-3 1.5.4A7.5 7.5 0 0 1 12 5c.9 0 1.8.14 2.6.4L16 5l2 3-1.2 1.5c.13.5.2 1 .2 1.5s-.07 1-.2 1.5L18 15l-2 3-1.4-.4A7.5 7.5 0 0 1 12 19a7.5 7.5 0 0 1-2.6-.4L8 18 6 15l1.2-1.5A6.9 6.9 0 0 1 4 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ),
  expenses: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 2v20M17 6.5c0-2-1.9-3.5-5-3.5S7 4 7 6.5 9 10 12 10s5 1.5 5 3.5S15.1 17 12 17s-5-1.5-5-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  ),
} as const;

function isActivePath(pathname: string, href: string) {
  if (!pathname) return false;
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

function buildLinks(role: Role): LinkItem[] {
  if (role === "ADMIN") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
      { href: "/menu", label: "Menu", icon: ICONS.menu },
      { href: "/billing", label: "Billing", icon: ICONS.billing },
      { href: "/invoices", label: "Invoices", icon: ICONS.invoices },
      { href: "/expenses", label: "Expenses", icon: ICONS.expenses },
      { href: "/reports", label: "Reports", icon: ICONS.reports },
      { href: "/settings", label: "Settings", icon: ICONS.settings },
    ];
  }

  if (role === "ACCOUNTS") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
      { href: "/invoices", label: "Invoices", icon: ICONS.invoices },
      { href: "/expenses", label: "Expenses", icon: ICONS.expenses },
      { href: "/reports", label: "Reports", icon: ICONS.reports },
      { href: "/settings", label: "Settings", icon: ICONS.settings },
    ];
  }

  // CASHIER / unknown
  return [
    { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { href: "/billing", label: "Billing", icon: ICONS.billing },
    { href: "/invoices", label: "Invoices", icon: ICONS.invoices },
    { href: "/settings", label: "Settings", icon: ICONS.settings },
  ];
}

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState("");

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store", signal: ac.signal });
        const j = r.ok ? await r.json() : {};
        setRole((j?.role as Role) ?? null);
        setEmail(j?.email || "");
      } catch {
        // ignore
      }
    })();

    return () => ac.abort();
  }, []);

  const links = useMemo(() => buildLinks(role), [role]);

  return (
    <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card/95 shadow-sm backdrop-blur lg:flex">
      {/* Brand */}
      <div className="flex h-16 items-center gap-3 border-b border-border px-4">
        <Link
          href="/dashboard"
          className="flex min-w-0 items-center gap-3"
          aria-label="Go to Dashboard"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow ring-1 ring-primary/20">
            <span className="text-xs font-semibold text-primary">XS</span>
          </div>

          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-sm font-semibold text-foreground">
              Harmony Luxe
            </span>
            <span className="truncate text-[11px] text-muted">
              Billing &amp; reports
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3">
        <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
          Workspace
        </div>

        <div className="space-y-1">
          {links.map((link) => {
            const active = isActivePath(pathname ?? "", link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "group flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition",
                  active
                    ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                    : "text-muted hover:bg-background hover:text-foreground",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-8 w-8 items-center justify-center rounded-xl ring-1 transition",
                    active
                      ? "bg-primary/10 text-primary ring-primary/20"
                      : "bg-background text-foreground/80 ring-border group-hover:text-foreground",
                  ].join(" ")}
                >
                  {link.icon}
                </span>

                <span className="truncate">{link.label}</span>

                <span
                  className={[
                    "ml-auto h-1.5 w-1.5 rounded-full transition",
                    active ? "bg-primary" : "bg-transparent group-hover:bg-border",
                  ].join(" ")}
                  aria-hidden
                />
              </Link>
            );
          })}
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-border bg-card/95 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-extrabold uppercase text-primary-foreground shadow">
            {(email || "U").charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-foreground">
              {email || "—"}
            </div>
            <div className="text-[11px] font-semibold text-muted">
              {role || "—"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}