// src/components/layout/Topbar.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

type Role = "ADMIN" | "CASHIER" | "ACCOUNTS" | null;

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const menuRef = useRef<HTMLDivElement | null>(null);

  // fetch identity
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store" });
        const j = r.ok ? await r.json() : {};
        setEmail(j?.email || "");
        setRole((j?.role as Role) ?? null);
      } catch {}
    })();
  }, []);

  // init theme from localStorage / system
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("bb.theme");
    const prefersDark = window.matchMedia?.(
      "(prefers-color-scheme: dark)"
    ).matches;
    const next =
      stored === "dark" || (!stored && prefersDark) ? "dark" : "light";

    document.documentElement.classList.toggle(
      "theme-dark",
      next === "dark"
    );
    setTheme(next);
  }, []);

  function toggleTheme() {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      if (typeof window !== "undefined") {
        document.documentElement.classList.toggle(
          "theme-dark",
          next === "dark"
        );
        window.localStorage.setItem("bb.theme", next);
      }
      return next;
    });
  }

  // close on click outside / Esc
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    if (menuOpen) {
      document.addEventListener("mousedown", onDocClick);
      document.addEventListener("keydown", onEsc);
    }
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [menuOpen]);

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1)
      router.back();
    else router.push("/dashboard");
  }

  const crumbs = useMemo(() => {
    const parts = (pathname || "/").split("/").filter(Boolean);
    const list: { href: string; label: string }[] = [];
    let acc = "";
    for (const p of parts) {
      acc += `/${p}`;
      list.push({
        href: acc,
        label: p
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (s) => s.toUpperCase()),
      });
    }
    return list;
  }, [pathname]);

  const roleChip =
    role === "ADMIN"
      ? "bg-rose-50 text-rose-700 border border-rose-200"
      : role === "CASHIER"
      ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
      : role === "ACCOUNTS"
      ? "bg-amber-50 text-amber-800 border border-amber-200"
      : "bg-slate-100 text-slate-700 border border-slate-200";

  async function doLogout() {
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {}
    try {
      if (typeof window !== "undefined")
        localStorage.removeItem("bb.email");
    } catch {}
    router.replace("/login");
  }

  return (
    <header className="no-print sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-3 sm:px-4 lg:px-0">
        {/* Left: Back + Breadcrumbs */}
        <div className="min-w-0 flex items-center gap-3">
          <button
            onClick={goBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm hover:bg-slate-50"
            aria-label="Back"
            title="Back"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path
                d="M15 5l-7 7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </button>

          <nav
            aria-label="Breadcrumb"
            className="hidden items-center gap-1 text-sm text-slate-600 sm:flex"
          >
            <a href="/dashboard" className="hover:text-slate-900">
              Dashboard
            </a>
            {crumbs.map((c, i) => (
              <span key={c.href} className="flex items-center gap-1">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  className="text-slate-400"
                >
                  <path
                    d="M9 18l6-6-6-6"
                    stroke="currentColor"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                <a
                  href={c.href}
                  className={`max-w-[14ch] truncate hover:text-slate-900 ${
                    i === crumbs.length - 1
                      ? "font-medium text-slate-900"
                      : ""
                  }`}
                >
                  {c.label}
                </a>
              </span>
            ))}
          </nav>
        </div>

        {/* Right: theme toggle + user */}
        <div className="flex items-center gap-2">
          {/* theme button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
            aria-pressed={theme === "dark"}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
          >
            {theme === "dark" ? (
              // sun icon
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <circle cx="12" cy="12" r="4" fill="currentColor" />
                <path
                  d="M12 3v2.5M12 18.5V21M4.22 4.22L5.9 5.9M18.1 18.1l1.68 1.68M3 12h2.5M18.5 12H21M4.22 19.78 5.9 18.1M18.1 5.9 19.78 4.22"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            ) : (
              // moon icon
              <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
                <path
                  d="M20 14.5A7.5 7.5 0 0 1 10.5 5 6 6 0 1 0 20 14.5Z"
                  fill="currentColor"
                />
              </svg>
            )}
          </button>

          {/* user button + dropdown */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-sm hover:bg-slate-50"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              title={email || "User"}
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-600 text-xs font-semibold uppercase text-white shadow">
                {(email || "U").charAt(0).toUpperCase()}
              </div>
              <div className="hidden flex-col items-start leading-tight md:flex">
                <span className="max-w-[220px] truncate text-xs">
                  {email || "—"}
                </span>
                <span
                  className={`mt-0.5 rounded px-1.5 py-0.5 text-[11px] ${roleChip}`}
                >
                  {role || "USER"}
                </span>
              </div>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="text-slate-500"
              >
                <path
                  d="M7 10l5 5 5-5"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Dropdown */}
            <div
              role="menu"
              data-open={menuOpen ? "true" : "false"}
              className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-100 bg-white p-2 text-sm shadow-xl transition-all duration-150 data-[open=false]:pointer-events-none data-[open=false]:-translate-y-1 data-[open=false]:opacity-0"
            >
              <div className="px-2 pb-2 text-xs text-slate-500">
                Signed in as
                <div className="truncate font-medium text-slate-900">
                  {email || "—"}
                </div>
              </div>
              <a
                href="/settings"
                className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                    fill="currentColor"
                    opacity=".9"
                  />
                </svg>
                Settings
              </a>
              <a
                href="/invoices"
                className="flex items-center gap-2 rounded-xl px-2 py-2 hover:bg-slate-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
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
                Invoices
              </a>
              <button
                onClick={doLogout}
                className="flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-red-600 hover:bg-red-50"
              >
                <svg width="16" height="16" viewBox="0 0 24 24">
                  <path
                    d="M15 17l5-5-5-5M20 12H9M12 20H7a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    fill="none"
                    strokeLinecap="round"
                  />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}