// src/components/expenses/ExpensesClient.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Expense } from "@/types/expenses";
import { inr } from "@/lib/format";
import useDebouncedValue from "@/components/expenses/useDebouncedValue";

type Props = {
  initialExpenses: Expense[];
};

type Role = "ADMIN" | "ACCOUNTS" | "CASHIER" | null;

// Base categories you commonly use
const BASE_CATEGORIES = ["Rent", "Staff", "Products", "Utilities", "Marketing", "Misc"] as const;

// Filter dropdown: All + base + Other (for custom categories)
const FILTER_CATEGORIES = ["All", ...BASE_CATEGORIES, "Other"] as const;

const PAYMENT_MODES: Expense["paymentMode"][] = ["CASH", "CARD", "UPI", "BANK", "OTHER"];

function sortNewestFirst(list: Expense[]) {
  return [...list].sort((a, b) => new Date(b.dateISO).getTime() - new Date(a.dateISO).getTime());
}

// --- notes meta helpers (NO SHEET CHANGE REQUIRED)
function parseMetaFromNotes(rawNotes: string) {
  const lines = String(rawNotes || "").split(/\r?\n/);
  let vendor = "";
  let receipt = "";
  const rest: string[] = [];

  for (const line of lines) {
    const t = line.trim();
    const lower = t.toLowerCase();
    if (lower.startsWith("vendor:")) {
      vendor = t.slice(7).trim();
      continue;
    }
    if (lower.startsWith("receipt:")) {
      receipt = t.slice(8).trim();
      continue;
    }
    if (t) rest.push(line);
  }

  return { vendor, receipt, notes: rest.join("\n").trim() };
}

function buildNotes(vendor: string, receipt: string, notes: string) {
  const out: string[] = [];
  const v = vendor.trim();
  const r = receipt.trim();
  const n = notes.trim();

  if (v) out.push(`Vendor: ${v}`);
  if (r) out.push(`Receipt: ${r}`);
  if (n) out.push(n);

  return out.join("\n");
}

function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** ===== Billing-style calendar utils ===== */
function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYMDLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseYMDLocal(ymdStr: string) {
  return new Date(`${ymdStr}T00:00:00`);
}
function sameYMD(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function CalendarIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        d="M7 3v3M17 3v3M4.5 8.5h15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M7.5 12h3M13.5 12h3M7.5 16h3M13.5 16h3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronLeftIcon() {
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
function ChevronRightIcon() {
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

/** Compact Billing-style date picker pill (for From/To + modal date) */
function DatePillPicker({
  label,
  value,
  onChange,
  allowClear,
}: {
  label: string;
  value: string;
  onChange: (next: string) => void;
  allowClear?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const popRef = useRef<HTMLDivElement | null>(null);

  const selected = useMemo(() => {
    try {
      return value ? parseYMDLocal(value) : new Date();
    } catch {
      return new Date();
    }
  }, [value]);

  const [view, setView] = useState(() => new Date(selected.getFullYear(), selected.getMonth(), 1));

  useEffect(() => {
    setView(new Date(selected.getFullYear(), selected.getMonth(), 1));
  }, [selected]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node | null;
      if (!t) return;
      if (popRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const human = useMemo(() => {
    if (!value) return "";
    try {
      const f = new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
      return f.format(selected);
    } catch {
      return value;
    }
  }, [value, selected]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(view);
  }, [view]);

  const today = useMemo(() => new Date(), []);

  const startWeekday = useMemo(() => {
    const firstDay = new Date(view.getFullYear(), view.getMonth(), 1);
    return firstDay.getDay();
  }, [view]);

  const cells = useMemo(() => {
    const arr: { date: Date; inMonth: boolean }[] = [];
    const gridStart = new Date(view.getFullYear(), view.getMonth(), 1 - startWeekday);
    for (let i = 0; i < 42; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      arr.push({ date: d, inMonth: d.getMonth() === view.getMonth() });
    }
    return arr;
  }, [view, startWeekday]);

  function pick(d: Date) {
    onChange(toYMDLocal(d));
    setOpen(false);
  }

  const pillBase =
    "inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 text-sm font-medium text-foreground shadow-sm hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40";

  return (
    <div className="relative" ref={anchorRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={pillBase}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-background/60">
          <CalendarIcon className="text-muted" />
        </span>

        <span className="truncate text-[12px] text-muted">
          {label}
          {value ? <span className="text-foreground"> • {human}</span> : null}
        </span>

        <span className="ml-1 text-[11px] text-muted">▾</span>
      </button>

      {open ? (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`Select ${label} date`}
          className="absolute right-0 top-full z-50 mt-2 w-[340px] max-w-[92vw] overflow-hidden rounded-2xl border border-border bg-card shadow-card"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2 border-b border-border bg-background/40 px-3 py-2">
            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-card"
              aria-label="Previous month"
            >
              <ChevronLeftIcon />
            </button>

            <div className="min-w-0 text-center">
              <div className="text-sm font-semibold text-foreground">{monthLabel}</div>
              <div className="text-[11px] text-muted">
                Selected:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {value || "—"}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-foreground hover:bg-card"
              aria-label="Next month"
            >
              <ChevronRightIcon />
            </button>
          </div>

          {/* Week header */}
          <div className="grid grid-cols-7 gap-1 px-3 pt-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((w) => (
              <div key={w}>{w}</div>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-1 px-3 py-3">
            {cells.map(({ date, inMonth }, i) => {
              const isSel = value ? sameYMD(date, selected) : false;
              const isToday = sameYMD(date, today);

              return (
                <button
                  key={`${date.toISOString()}-${i}`}
                  type="button"
                  onClick={() => pick(date)}
                  className={[
                    "relative inline-flex h-10 items-center justify-center rounded-xl text-sm font-semibold transition",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                    inMonth ? "text-foreground" : "text-muted/60",
                    isSel
                      ? "bg-primary/15 text-primary ring-1 ring-primary/25"
                      : "bg-background/50 hover:bg-card",
                  ].join(" ")}
                  aria-pressed={isSel}
                >
                  <span className="tabular-nums">{date.getDate()}</span>
                  {isToday && !isSel ? (
                    <span
                      className="absolute bottom-1.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-primary"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border bg-background/40 px-3 py-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const d = new Date();
                  setView(new Date(d.getFullYear(), d.getMonth(), 1));
                  onChange(toYMDLocal(d));
                  setOpen(false);
                }}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-card"
              >
                Today
              </button>

              {allowClear ? (
                <button
                  type="button"
                  onClick={() => {
                    onChange("");
                    setOpen(false);
                  }}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:bg-card hover:text-foreground"
                >
                  Clear
                </button>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:bg-card hover:text-foreground"
            >
              Close
            </button>
          </div>

          {/* Hidden native date input (accessibility) */}
          <input
            type="date"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            aria-label={`${label} date`}
          />
        </div>
      ) : null}
    </div>
  );
}

function labelTiny(text: string) {
  return (
    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">{text}</span>
  );
}

function isSameRange(from: string, to: string, f: string, t: string) {
  return from === f && to === t;
}

export default function ExpensesClient({ initialExpenses }: Props) {
  const [role, setRole] = useState<Role>(null);
  const canWrite = role === "ADMIN" || role === "ACCOUNTS";
  const canExport = role === "ADMIN" || role === "ACCOUNTS";

  // Load role (UI only; API already enforces)
  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        const r = await fetch("/api/me", { cache: "no-store", signal: ac.signal });
        const j = r.ok ? await r.json() : {};
        setRole((j?.role as Role) ?? null);
      } catch {
        // ignore
      }
    })();
    return () => ac.abort();
  }, []);

  // MAIN LIST
  const [expenses, setExpenses] = useState<Expense[]>(() => sortNewestFirst(initialExpenses));

  // Filters
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<(typeof FILTER_CATEGORIES)[number]>("All");
  const [modeFilter, setModeFilter] = useState<"All" | Expense["paymentMode"]>("All");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 250);

  // list loading / errors
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  // Save/Delete busy
  const [busy, setBusy] = useState(false);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  // Form state
  const [formDate, setFormDate] = useState("");
  const [formCategory, setFormCategory] = useState<string>("Misc");
  const [formCustomCategory, setFormCustomCategory] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formMode, setFormMode] = useState<Expense["paymentMode"]>("CASH");

  // NEW (stored inside notes)
  const [formVendor, setFormVendor] = useState("");
  const [formReceipt, setFormReceipt] = useState("");
  const [formNotes, setFormNotes] = useState("");

  function resetForm(ex?: Expense | null) {
    if (!ex) {
      setFormDate(ymd(new Date()));
      setFormCategory("Misc");
      setFormCustomCategory("");
      setFormDesc("");
      setFormAmount("");
      setFormMode("CASH");
      setFormVendor("");
      setFormReceipt("");
      setFormNotes("");
      setEditing(null);
      return;
    }

    setFormDate(ex.dateISO.slice(0, 10));

    const cat = ex.category || "Misc";
    if ((BASE_CATEGORIES as readonly string[]).includes(cat)) {
      setFormCategory(cat);
      setFormCustomCategory("");
    } else {
      setFormCategory("__CUSTOM__");
      setFormCustomCategory(cat);
    }

    setFormDesc(ex.description || "");
    setFormAmount(String(ex.amount || ""));
    setFormMode(ex.paymentMode || "CASH");

    const meta = parseMetaFromNotes(String(ex.notes || ""));
    setFormVendor(meta.vendor);
    setFormReceipt(meta.receipt);
    setFormNotes(meta.notes);

    setEditing(ex);
  }

  function openNew() {
    if (!canWrite) return;
    resetForm(null);
    setModalOpen(true);
  }

  function openEdit(ex: Expense) {
    if (!canWrite) return;
    resetForm(ex);
    setModalOpen(true);
  }

  // SERVER FETCH
  async function fetchFiltered(signal?: AbortSignal) {
    const params = new URLSearchParams();

    if (from) params.set("from", from);
    if (to) params.set("to", to);

    if (categoryFilter !== "All") params.set("category", categoryFilter);
    if (modeFilter !== "All") params.set("mode", modeFilter);

    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());

    const qs = params.toString();
    const url = qs ? `/api/expenses?${qs}` : "/api/expenses";

    const r = await fetch(url, { cache: "no-store", signal });
    if (!r.ok) throw new Error(await r.text());
    const j = await r.json();
    const list = (j.expenses ?? []) as Expense[];
    setExpenses(sortNewestFirst(list));
    setLastSync(new Date());
  }

  async function manualRefresh() {
    setLoadingList(true);
    setListError(null);
    try {
      await fetchFiltered();
    } catch {
      setListError("Failed to refresh.");
    } finally {
      setLoadingList(false);
    }
  }

  // Auto-refresh list when filters change
  useEffect(() => {
    const ac = new AbortController();

    setLoadingList(true);
    setListError(null);

    const t = window.setTimeout(() => {
      fetchFiltered(ac.signal)
        .catch((e: any) => {
          if (String(e?.name) === "AbortError") return;
          setListError("Failed to load expenses.");
        })
        .finally(() => setLoadingList(false));
    }, 0);

    return () => {
      ac.abort();
      window.clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, categoryFilter, modeFilter, debouncedSearch]);

  function clearFilters() {
    setFrom("");
    setTo("");
    setCategoryFilter("All");
    setModeFilter("All");
    setSearch("");
  }

  // QUICK RANGE HELPERS
  function setRangeAllTime() {
    setFrom("");
    setTo("");
  }
  function setRangeToday() {
    const today = ymd(new Date());
    setFrom(today);
    setTo(today);
  }
  function setRangeLast7() {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - 6);
    setFrom(ymd(fromDate));
    setTo(ymd(today));
  }
  function setRangeThisMonth() {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    setFrom(ymd(start));
    setTo(ymd(end));
  }

  // Summary (current view)
  const summary = useMemo(() => {
    const totalAmount = expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const byCategory = new Map<string, number>();
    const byMode = new Map<string, number>();

    for (const e of expenses) {
      const cat = e.category || "Uncategorized";
      byCategory.set(cat, (byCategory.get(cat) || 0) + (Number(e.amount) || 0));

      const mode = String(e.paymentMode || "OTHER");
      byMode.set(mode, (byMode.get(mode) || 0) + (Number(e.amount) || 0));
    }

    const topCategories = [...byCategory.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const topModes = [...byMode.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

    return { totalAmount, topCategories, topModes };
  }, [expenses]);

  // EXPORT HREF
  const exportHref = useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (categoryFilter !== "All") params.append("category", categoryFilter);
    if (modeFilter !== "All") params.append("mode", modeFilter);
    if (debouncedSearch.trim()) params.append("q", debouncedSearch.trim());

    const qs = params.toString();
    return qs ? `/api/expenses/export?${qs}` : "/api/expenses/export";
  }, [from, to, categoryFilter, modeFilter, debouncedSearch]);

  async function handleSave() {
    if (!canWrite) return;
    if (!formDate || !formAmount) return;

    const amt = Number(formAmount);
    if (!amt || Number.isNaN(amt)) return;

    setBusy(true);
    try {
      const resolvedCategory =
        formCategory === "__CUSTOM__"
          ? (formCustomCategory.trim() || "Misc")
          : formCategory || "Misc";

      const payload: Partial<Expense> = {
        dateISO: new Date(formDate + "T00:00:00").toISOString(),
        category: resolvedCategory,
        description: formDesc,
        amount: amt,
        paymentMode: formMode,
        notes: buildNotes(formVendor, formReceipt, formNotes),
      };

      if (editing) {
        const res = await fetch(`/api/expenses/${encodeURIComponent(editing.id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          alert("Failed to update expense.");
          return;
        }
      } else {
        const res = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          alert("Failed to create expense.");
          return;
        }
      }

      setModalOpen(false);

      setLoadingList(true);
      setListError(null);
      await fetchFiltered();
    } finally {
      setBusy(false);
      setLoadingList(false);
    }
  }

  async function handleDelete(id: string) {
    if (!canWrite) return;
    if (!confirm("Delete this expense?")) return;

    setBusy(true);
    try {
      const res = await fetch(`/api/expenses/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        alert("Failed to delete expense.");
        return;
      }

      setLoadingList(true);
      setListError(null);
      await fetchFiltered();
    } finally {
      setBusy(false);
      setLoadingList(false);
    }
  }

  const today = ymd(new Date());
  const last7From = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return ymd(d);
  })();
  const thisMonthFrom = (() => {
    const d = new Date();
    return ymd(new Date(d.getFullYear(), d.getMonth(), 1));
  })();
  const thisMonthTo = (() => {
    const d = new Date();
    return ymd(new Date(d.getFullYear(), d.getMonth() + 1, 0));
  })();

  const chipBase =
    "inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] text-muted backdrop-blur hover:bg-card";

  const inputBase =
    "h-10 w-full rounded-full border border-border/70 bg-background/70 px-4 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

  return (
    <>
      {/* Top bar */}
      <section className="mb-4 rounded-2xl border border-border/70 bg-card/70 shadow-sm backdrop-blur">
        {/* Header */}
        <div className="px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              {labelTiny("Finance")}
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Expenses</h1>

                {role ? (
                  <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border/70 bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-muted">
                    <span className="truncate">{role}</span>
                    {!canWrite ? <span className="text-slate-400">(read-only)</span> : null}
                  </span>
                ) : null}
              </div>

              <p className="mt-1 max-w-2xl text-[12px] text-muted">
                Fast filters + export. Vendor and receipt links are stored in notes (no Sheets
                changes).
              </p>
            </div>

            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={openNew}
                disabled={!canWrite}
                className="inline-flex h-10 w-full items-center justify-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60 sm:w-auto"
              >
                + Add expense
              </button>

              {canExport && (
                <a
                  href={exportHref}
                  className="inline-flex h-10 w-full items-center justify-center rounded-full border border-border/70 bg-background/70 px-4 text-sm font-semibold text-foreground hover:bg-card sm:w-auto"
                >
                  Export CSV
                </a>
              )}
            </div>
          </div>
        </div>

        {/* Filters (single clean row on desktop) */}
        <div className="border-t border-border/60 bg-background/35 px-4 py-4 sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            {/* Search */}
            <div className="min-w-0 flex-1">
              {labelTiny("Search")}
              <input
                placeholder="Description / notes / category"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className={`${inputBase} mt-1`}
              />
            </div>

            {/* Right controls */}
            <div className="flex flex-wrap items-end gap-2 lg:justify-end">
              <div className="space-y-1">
                {labelTiny("From")}
                <DatePillPicker label="From" value={from} onChange={setFrom} allowClear />
              </div>

              <div className="space-y-1">
                {labelTiny("To")}
                <DatePillPicker label="To" value={to} onChange={setTo} allowClear />
              </div>

              <div className="space-y-1">
                {labelTiny("Category")}
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as (typeof FILTER_CATEGORIES)[number])
                  }
                  className="h-10 rounded-full border border-border/70 bg-background/70 px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {FILTER_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                {labelTiny("Mode")}
                <select
                  value={modeFilter}
                  onChange={(e) =>
                    setModeFilter(
                      e.target.value === "All"
                        ? "All"
                        : (e.target.value as Expense["paymentMode"])
                    )
                  }
                  className="h-10 rounded-full border border-border/70 bg-background/70 px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <option value="All">All</option>
                  {PAYMENT_MODES.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end gap-2">
                <button type="button" onClick={clearFilters} className={`${chipBase} h-10`}>
                  Clear
                </button>
                <button type="button" onClick={manualRefresh} className={`${chipBase} h-10`}>
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Quick range + status */}
          <div className="mt-4 flex flex-col gap-2 border-t border-border/60 pt-3 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Quick range
              </span>

              <button
                type="button"
                onClick={setRangeAllTime}
                className={`${chipBase} shrink-0 ${from === "" && to === "" ? "text-foreground" : ""}`}
              >
                All time
              </button>

              <button
                type="button"
                onClick={setRangeToday}
                className={`${chipBase} shrink-0 ${
                  isSameRange(from, to, today, today) ? "text-foreground" : ""
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={setRangeLast7}
                className={`${chipBase} shrink-0 ${
                  isSameRange(from, to, last7From, today) ? "text-foreground" : ""
                }`}
              >
                Last 7
              </button>

              <button
                type="button"
                onClick={setRangeThisMonth}
                className={`${chipBase} shrink-0 ${
                  isSameRange(from, to, thisMonthFrom, thisMonthTo) ? "text-foreground" : ""
                }`}
              >
                This month
              </button>
            </div>

            <div className="flex flex-wrap gap-2 md:justify-end">
              <span className={chipBase}>
                Total{" "}
                <span className="font-semibold text-foreground">{inr(summary.totalAmount)}</span>
              </span>
              <span className={chipBase}>
                Entries{" "}
                <span className="font-semibold text-foreground">{expenses.length}</span>
              </span>

              <span className="text-[11px] text-muted md:text-right">
                {loadingList ? (
                  <span className="inline-flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                    Loading…
                  </span>
                ) : listError ? (
                  <span className="text-danger">{listError}</span>
                ) : lastSync ? (
                  <span>Synced {lastSync.toLocaleTimeString()}</span>
                ) : (
                  <span />
                )}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Table */}
      <section className="rounded-2xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4 sm:py-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-xs">
            <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted">
              <tr>
                <th className="py-2 pr-2">Date</th>
                <th className="py-2 pr-2">Category</th>
                <th className="py-2 pr-2">Description</th>
                <th className="py-2 pr-2 text-right">Amount</th>
                <th className="py-2 pr-2">Mode</th>
                <th className="py-2 pr-2">Meta</th>
                <th className="py-2 pr-2 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-[11px] text-muted">
                    No expenses found for this filter.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => {
                  const meta = parseMetaFromNotes(String(e.notes || ""));
                  return (
                    <tr
                      key={e.id}
                      className="border-t border-border text-xs text-foreground hover:bg-background/40"
                    >
                      <td className="py-2 pr-2 align-top whitespace-nowrap">
                        {new Date(e.dateISO).toLocaleDateString()}
                      </td>

                      <td className="py-2 pr-2 align-top">
                        <span className="inline-flex rounded-full border border-border/60 bg-background/50 px-2 py-0.5 text-[11px] text-foreground">
                          {e.category || "Misc"}
                        </span>
                      </td>

                      <td className="py-2 pr-2 align-top">
                        <div className="max-w-[520px] truncate font-medium">{e.description}</div>
                        {meta.notes && (
                          <div className="mt-0.5 max-w-[520px] truncate text-[11px] text-muted">
                            {meta.notes}
                          </div>
                        )}
                      </td>

                      <td className="py-2 pr-2 text-right align-top font-semibold whitespace-nowrap">
                        {inr(e.amount)}
                      </td>

                      <td className="py-2 pr-2 align-top text-[11px] text-muted whitespace-nowrap">
                        {e.paymentMode}
                      </td>

                      <td className="py-2 pr-2 align-top text-[11px] text-muted">
                        {meta.vendor ? (
                          <div className="truncate">Vendor: {meta.vendor}</div>
                        ) : (
                          <div className="text-slate-400">—</div>
                        )}
                        {meta.receipt ? (
                          <a
                            className="mt-0.5 inline-block truncate text-primary hover:underline"
                            href={meta.receipt}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Receipt link
                          </a>
                        ) : null}
                      </td>

                      <td className="py-2 pr-2 text-right align-top whitespace-nowrap">
                        {canWrite ? (
                          <>
                            <button
                              type="button"
                              onClick={() => openEdit(e)}
                              className="mr-3 text-[11px] font-medium text-primary hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(e.id)}
                              className="text-[11px] font-medium text-danger hover:underline"
                            >
                              Delete
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-[96%] max-w-lg rounded-2xl border border-border bg-card px-4 py-4 shadow-xl sm:px-6 sm:py-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-base font-semibold text-foreground">
                  {editing ? "Edit expense" : "Add expense"}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  Vendor + receipt are stored safely inside notes.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/60 text-sm text-muted hover:bg-card"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-[11px] sm:text-xs">
              {/* Date + category */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-muted">Date</label>
                  <DatePillPicker label="Date" value={formDate} onChange={setFormDate} />
                </div>

                <div className="space-y-1">
                  <label className="text-muted">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {BASE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                    <option value="__CUSTOM__">Custom category…</option>
                  </select>

                  {formCategory === "__CUSTOM__" && (
                    <input
                      value={formCustomCategory}
                      onChange={(e) => setFormCustomCategory(e.target.value)}
                      placeholder="Type category name"
                      className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    />
                  )}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-muted">Description</label>
                <input
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="e.g. Massage oil stock, November rent"
                  className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>

              {/* Amount + mode */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-muted">Amount</label>
                  <input
                    type="number"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted">Payment mode</label>
                  <select
                    value={formMode}
                    onChange={(e) => setFormMode(e.target.value as Expense["paymentMode"])}
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    {PAYMENT_MODES.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vendor + Receipt */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-muted">Vendor (optional)</label>
                  <input
                    value={formVendor}
                    onChange={(e) => setFormVendor(e.target.value)}
                    placeholder="e.g. Amazon / Staff salary"
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted">Receipt link (optional)</label>
                  <input
                    value={formReceipt}
                    onChange={(e) => setFormReceipt(e.target.value)}
                    placeholder="https://..."
                    className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-muted">Notes</label>
                <textarea
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2 text-sm">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-muted hover:bg-card"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleSave}
                className="inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 disabled:opacity-60"
              >
                {editing ? "Save changes" : "Add expense"}
              </button>
            </div>
          </div>
        </div>
      )}

      {(busy || loadingList) && (
        <div className="pointer-events-none fixed bottom-3 right-3 rounded-full bg-card/95 px-3 py-1.5 text-[11px] text-muted shadow">
          {busy ? "Saving…" : "Loading…"}
        </div>
      )}
    </>
  );
}