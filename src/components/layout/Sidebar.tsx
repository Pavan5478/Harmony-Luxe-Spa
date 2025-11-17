// src/components/layout/Sidebar.tsx
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

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = r.ok ? await r.json() : {};
        setRole((j?.role as Role) ?? null);
        setEmail(j?.email || "");
      } catch {}
    })();
  }, []);

  const icon = {
    dashboard: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        aria-hidden
        className="text-indigo-500"
      >
        <path
          d="M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8V12h-8v9Zm0-19v7h8V3h-8Z"
          fill="currentColor"
        />
      </svg>
    ),
    menu: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        className="text-fuchsia-500"
      >
        <path
          d="M4 6h16M4 12h16M4 18h16"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
    billing: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        className="text-emerald-500"
      >
        <path
          d="M4 7h16M4 12h16M4 17h10"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
    invoices: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        className="text-sky-500"
      >
        <path
          d="M6 4h12v16H6z"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
        />
        <path
          d="M8 8h8M8 12h8M8 16h5"
          stroke="currentColor"
          strokeWidth="1.8"
          fill="none"
        />
      </svg>
    ),
    reports: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        className="text-amber-500"
      >
        <path
          d="M4 19V5m0 14h16M8 19V9m4 10V7m4 12V12"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
        />
      </svg>
    ),
    settings: (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        className="text-slate-500"
      >
        <path
          d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
          fill="currentColor"
          opacity=".9"
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
        { href: "/reports", label: "Reports", icon: icon.reports },
        { href: "/settings", label: "Settings", icon: icon.settings },
      ];
    }
    if (role === "CASHIER") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: icon.dashboard },
        { href: "/billing", label: "Billing", icon: icon.billing },
        { href: "/invoices", label: "Invoices", icon: icon.invoices },
        { href: "/settings", label: "Settings", icon: icon.settings },
      ];
    }
    if (role === "ACCOUNTS") {
      return [
        { href: "/dashboard", label: "Dashboard", icon: icon.dashboard },
        { href: "/invoices", label: "Invoices", icon: icon.invoices },
        { href: "/reports", label: "Reports", icon: icon.reports },
        { href: "/settings", label: "Settings", icon: icon.settings },
      ];
    }
    return [];
  }, [role]);

  return (
    <aside
      className="
        no-print fixed left-0 top-0 z-30 flex h-full w-64 flex-col
        border-r border-border bg-card
      "
    >
      {/* Brand */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow ring-1 ring-indigo-100/70">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            aria-hidden
            className="text-indigo-500"
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
          <div className="text-sm font-semibold tracking-tight text-foreground">
            Bill Book
          </div>
          <div className="text-[11px] text-muted">Billing Suite</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-2">
        {links.map((l) => {
          const active =
            pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <a
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition ${
                active
                  ? "bg-primary/5 text-foreground ring-1 ring-inset ring-primary/20"
                  : "text-muted hover:bg-background/70"
              }`}
            >
              <span className="shrink-0">{l.icon}</span>
              <span className="truncate">{l.label}</span>
              {active && (
                <span
                  className="ml-auto h-2 w-2 rounded-full bg-primary shadow-[0_0_0_3px_rgba(99,102,241,.25)]"
                  aria-hidden
                />
              )}
            </a>
          );
        })}
      </nav>

      {/* User footer */}
      <div className="border-t border-border bg-card/95 p-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold uppercase text-white shadow">
            {(email || "U").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm text-foreground">
              {email || "—"}
            </div>
            <div className="text-[11px] text-muted">{role || "—"}</div>
          </div>
        </div>
      </div>
    </aside>
  );
}