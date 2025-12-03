﻿// src/components/layout/Sidebar.tsx
"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

type Role = "ADMIN" | "CASHIER" | "ACCOUNTS" | null;

type LinkItem = {
  href: string;
  label: string;
  icon: ReactNode;
};

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState("");

  // fetch identity
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = r.ok ? await r.json() : {};
        setRole((j?.role as Role) ?? null);
        setEmail(j?.email || "");
      } catch {
        // ignore
      }
    })();
  }, []);

  const icon = {
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
  };

  const links: LinkItem[] = useMemo(() => {
    if (role === "ADMIN") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: icon.dashboard },
        { href: "/menu", label: "Menu", icon: icon.menu },
        { href: "/billing", label: "Billing", icon: icon.billing },
        { href: "/invoices", label: "Invoices", icon: icon.invoices },
        { href: "/expenses", label: "Expenses", icon: icon.reports }, // or make a new icon.money
        { href: "/reports", label: "Reports", icon: icon.reports },
        { href: "/settings", label: "Settings", icon: icon.settings },
      ];
    }
    if (role === "ACCOUNTS") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: icon.dashboard },
        { href: "/invoices", label: "Invoices", icon: icon.invoices },
        { href: "/expenses", label: "Expenses", icon: icon.reports },
        { href: "/reports", label: "Reports", icon: icon.reports },
        { href: "/settings", label: "Settings", icon: icon.settings },
      ];
    }
    // CASHIER / unknown
    return [
      { href: "/dashboard", label: "Dashboard", icon: icon.dashboard },
      { href: "/billing", label: "Billing", icon: icon.billing },
      { href: "/invoices", label: "Invoices", icon: icon.invoices },
      { href: "/settings", label: "Settings", icon: icon.settings },
    ];
  }, [role]);

  return (
    <aside
      className="
        no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col
        border-r border-border bg-card/95 shadow-sm backdrop-blur
        lg:flex
      "
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow ring-1 ring-primary/20">
          <span className="text-xs font-semibold text-primary">XS</span>
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold text-foreground">
            Harmony Luxe
          </span>
          <span className="text-[11px] text-muted">
            Billing &amp; reports
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2 py-3">
        {links.map((link) => {
          const active =
            pathname === link.href ||
            (pathname || "").startsWith(link.href + "/");

          return (
            <a
              key={link.href}
              href={link.href}
              className={[
                "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                active
                  ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                  : "text-muted hover:bg-background hover:text-foreground",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-lg text-[13px]",
                  active ? "bg-primary/10 text-primary" : "bg-background",
                ].join(" ")}
              >
                {link.icon}
              </span>
              <span className="truncate">{link.label}</span>
            </a>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border bg-card/95 p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-white shadow">
            {(email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm text-foreground">
              {email || "—"}
            </div>
            <div className="text-[11px] text-muted">
              {role || "—"}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}