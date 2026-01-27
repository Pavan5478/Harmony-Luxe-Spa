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
  customers: (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  ),
} as const;

function ChevronRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M9 18l6-6-6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronLeft() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M15 18l-6-6 6-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      { href: "/customers", label: "Customers", icon: ICONS.customers },
      { href: "/expenses", label: "Expenses", icon: ICONS.expenses },
      { href: "/reports", label: "Reports", icon: ICONS.reports },
      { href: "/settings", label: "Settings", icon: ICONS.settings },
    ];
  }

  if (role === "ACCOUNTS") {
    return [
      { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
      { href: "/invoices", label: "Invoices", icon: ICONS.invoices },
      { href: "/customers", label: "Customers", icon: ICONS.customers },
      { href: "/expenses", label: "Expenses", icon: ICONS.expenses },
      { href: "/reports", label: "Reports", icon: ICONS.reports },
      { href: "/settings", label: "Settings", icon: ICONS.settings },
    ];
  }

  return [
    { href: "/dashboard", label: "Dashboard", icon: ICONS.dashboard },
    { href: "/billing", label: "Billing", icon: ICONS.billing },
    { href: "/invoices", label: "Invoices", icon: ICONS.invoices },
    { href: "/customers", label: "Customers", icon: ICONS.customers },
    { href: "/settings", label: "Settings", icon: ICONS.settings },
  ];
}

function mobileOrder(role: Role): string[] {
  // choose what appears first on mobile (top 4 will show in bottom bar)
  if (role === "ADMIN") {
    return ["/dashboard", "/billing", "/invoices", "/menu", "/customers", "/expenses", "/reports", "/settings"];
  }
  if (role === "ACCOUNTS") {
    return ["/dashboard", "/invoices", "/expenses", "/reports", "/customers", "/settings"];
  }
  // CASHIER
  return ["/dashboard", "/billing", "/invoices", "/customers", "/settings"];
}

function orderByHref(links: LinkItem[], hrefOrder: string[]) {
  const map = new Map(links.map((l) => [l.href, l]));
  const out: LinkItem[] = [];

  for (const h of hrefOrder) {
    const item = map.get(h);
    if (item) out.push(item);
  }
  // append anything not listed (safety)
  for (const l of links) {
    if (!out.some((x) => x.href === l.href)) out.push(l);
  }
  return out;
}

export default function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<Role>(null);
  const [email, setEmail] = useState("");
  const [moreOpen, setMoreOpen] = useState(false);

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

  // close drawer on route change
  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  // close on ESC
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMoreOpen(false);
    }
    if (moreOpen) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moreOpen]);

  const links = useMemo(() => buildLinks(role), [role]);

  const orderedMobile = useMemo(() => {
    return orderByHref(links, mobileOrder(role));
  }, [links, role]);

  const primary4 = useMemo(() => orderedMobile.slice(0, 4), [orderedMobile]);
  const overflow = useMemo(() => orderedMobile.slice(4), [orderedMobile]);

  const overflowActive = useMemo(() => {
    return overflow.some((l) => isActivePath(pathname ?? "", l.href));
  }, [overflow, pathname]);

  return (
    <>
      {/* Desktop sidebar (unchanged) */}
      <aside className="no-print fixed inset-y-0 left-0 z-30 hidden w-64 flex-col overflow-x-hidden border-r border-border bg-card/95 shadow-sm backdrop-blur lg:flex">
        <div className="flex h-16 items-center gap-3 border-b border-border px-4">
  <Link
    href="/dashboard"
    prefetch={false}
    className="flex min-w-0 items-center gap-3"
    aria-label="Go to Dashboard"
  >
    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-background shadow ring-1 ring-primary/20 overflow-hidden">
      <img
        src="/harmony_luxe.png"
        alt="Harmony Luxe logo"
        className="h-6 w-6 object-contain"
      />
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

        <nav className="flex-1 overflow-y-auto px-2 py-3">
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
                  prefetch={false}
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

        <div className="border-t border-border bg-card/95 p-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-extrabold uppercase text-primary-foreground shadow">
              {(email || "U").charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-foreground">{email || "—"}</div>
              <div className="text-[11px] font-semibold text-muted">{role || "—"}</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile: bottom bar (4 items + 5th "More") */}
      <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-5 gap-1 px-2 py-2">
          {primary4.map((link) => {
            const active = isActivePath(pathname ?? "", link.href);

            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch={false}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition",
                  active ? "bg-primary/10 text-primary" : "text-muted hover:text-foreground",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-10 w-10 items-center justify-center rounded-2xl ring-1 transition",
                    active
                      ? "bg-primary/10 text-primary ring-primary/25"
                      : "bg-background text-foreground/80 ring-border",
                  ].join(" ")}
                  aria-hidden
                >
                  {link.icon}
                </span>
                <span className="max-w-[72px] truncate text-[10px] font-semibold leading-none">
                  {link.label}
                </span>
              </Link>
            );
          })}

          {/* 5th button: opens the remaining items */}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            className={[
              "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 transition",
              moreOpen || overflowActive
                ? "bg-primary/10 text-primary"
                : "text-muted hover:text-foreground",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-10 w-10 items-center justify-center rounded-2xl ring-1 transition",
                moreOpen || overflowActive
                  ? "bg-primary/10 text-primary ring-primary/25"
                  : "bg-background text-foreground/80 ring-border",
              ].join(" ")}
              aria-hidden
            >
              <ChevronRight />
            </span>
            <span className="max-w-[72px] truncate text-[10px] font-semibold leading-none">
              More
            </span>
          </button>
        </div>

        <div className="h-[env(safe-area-inset-bottom)]" />
      </nav>

      {/* Mobile drawer for remaining items */}
      {moreOpen ? (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="More menu"
        >
          {/* Backdrop */}
          <button
            type="button"
            className="absolute inset-0 bg-black/35"
            aria-label="Close menu"
            onClick={() => setMoreOpen(false)}
          />

          {/* Drawer (left) */}
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs overflow-hidden border-r border-border bg-card shadow-card">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                  Menu
                </div>
                <div className="truncate text-sm font-semibold text-foreground">
                  More options
                </div>
              </div>

              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground"
              >
                <span aria-hidden>
                  <ChevronLeft />
                </span>
                Back
              </button>
            </div>

            {/* Items (icons left, text right) */}
            <nav className="p-2">
              <div className="space-y-1">
                {overflow.map((link) => {
                  const active = isActivePath(pathname ?? "", link.href);

                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      prefetch={false}
                      aria-current={active ? "page" : undefined}
                      className={[
                        "flex items-center gap-3 rounded-2xl px-3 py-2.5 transition",
                        active
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "text-muted hover:bg-background hover:text-foreground",
                      ].join(" ")}
                    >
                      <span
                        className={[
                          "flex h-10 w-10 items-center justify-center rounded-2xl ring-1 transition",
                          active
                            ? "bg-primary/10 text-primary ring-primary/25"
                            : "bg-background text-foreground/80 ring-border",
                        ].join(" ")}
                        aria-hidden
                      >
                        {link.icon}
                      </span>

                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {link.label}
                      </span>

                      <span
                        className={[
                          "h-1.5 w-1.5 rounded-full transition",
                          active ? "bg-primary" : "bg-border",
                        ].join(" ")}
                        aria-hidden
                      />
                    </Link>
                  );
                })}

                {/* If no overflow, still show a friendly item */}
                {overflow.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-background px-3 py-4 text-center text-xs text-muted">
                    No more items
                  </div>
                ) : null}
              </div>
            </nav>

            {/* Small footer (optional) */}
            <div className="border-t border-border px-4 py-3">
              <div className="truncate text-xs font-semibold text-muted">
                {email ? `Signed in: ${email}` : " "}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}