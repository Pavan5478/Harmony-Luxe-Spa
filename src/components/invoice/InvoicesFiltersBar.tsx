"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

type Status = "FINAL" | "DRAFT" | "VOID" | "ALL";

function pad2(n: number) {
  return String(n).padStart(2, "0");
}
function toYMDLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
function parseYMDLocal(ymd: string) {
  return new Date(`${ymd}T00:00:00`);
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

function DateChipPicker({
  id,
  label,
  value,
  onChange,
  openId,
  setOpenId,
}: {
  id: "from" | "to";
  label: string;
  value: string;
  onChange: (next: string) => void;
  openId: string | null;
  setOpenId: (v: string | null) => void;
}) {
  const open = openId === id;
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
      setOpenId(null);
    }
    function onKey(e: KeyboardEvent) {
      if (!open) return;
      if (e.key === "Escape") setOpenId(null);
    }
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setOpenId]);

  const fmtLong = useMemo(() => {
    const f = new Intl.DateTimeFormat(undefined, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    return f.format(selected);
  }, [selected]);

  const monthLabel = useMemo(() => {
    return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(view);
  }, [view]);

  const today = useMemo(() => new Date(), []);

  const firstDay = useMemo(() => new Date(view.getFullYear(), view.getMonth(), 1), [view]);
  const startWeekday = firstDay.getDay(); // 0..6

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
    setOpenId(null);
  }

  const display = value || "—";
  const chipText = value ? display : label;

  return (
    <div className="relative" ref={anchorRef}>
      <button
        type="button"
        onClick={() => setOpenId(open ? null : id)}
        className={[
          "inline-flex h-10 items-center gap-2 rounded-full border border-border bg-background px-3 text-sm shadow-sm transition",
          "hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        ].join(" ")}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-card text-muted ring-1 ring-border/60">
          <CalendarIcon className="h-4 w-4" />
        </span>

        <span className={value ? "text-foreground tabular-nums" : "text-muted"}>{chipText}</span>

        <span className="hidden text-[11px] font-medium text-muted sm:inline">• {fmtLong}</span>
      </button>

      {/* hidden native date input (optional a11y + mobile), not visible => no double icons */}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
        aria-label={label}
      />

      {open ? (
        <div
          ref={popRef}
          role="dialog"
          aria-label={`Select ${label}`}
          className={[
            "absolute left-0 top-full z-50 mt-3 w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border bg-card shadow-card",
            "origin-top-left transition duration-150 ease-out",
          ].join(" ")}
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
                <span className="font-medium text-foreground tabular-nums">{value || "—"}</span>
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

          {/* Days */}
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
            <button
              type="button"
              onClick={() => {
                const d = new Date();
                setView(new Date(d.getFullYear(), d.getMonth(), 1));
                onChange(toYMDLocal(d));
                setOpenId(null);
              }}
              className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-card"
            >
              Today
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onChange("")}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:bg-card hover:text-foreground"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setOpenId(null)}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-muted hover:bg-card hover:text-foreground"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function InvoicesFiltersBar(props: {
  initialQ: string;
  initialFrom: string;
  initialTo: string;
  initialStatus: Status;
  canExport: boolean;
  count: number;
}) {
  const { initialQ, initialFrom, initialTo, initialStatus, canExport, count } = props;

  const router = useRouter();
  const pathname = usePathname();

  const [q, setQ] = useState(initialQ || "");
  const [from, setFrom] = useState(initialFrom || "");
  const [to, setTo] = useState(initialTo || "");
  const [status, setStatus] = useState<Status>(initialStatus || "ALL");

  const [openId, setOpenId] = useState<string | null>(null);

  // keep in sync when user navigates back/forward
  useEffect(() => setQ(initialQ || ""), [initialQ]);
  useEffect(() => setFrom(initialFrom || ""), [initialFrom]);
  useEffect(() => setTo(initialTo || ""), [initialTo]);
  useEffect(() => setStatus(initialStatus || "ALL"), [initialStatus]);

  function buildParams() {
    const p = new URLSearchParams();
    const qq = q.trim();
    if (qq) p.set("q", qq);
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    if (status && status !== "ALL") p.set("status", status);
    return p;
  }

  const exportHref = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const qs = p.toString();
    return `/api/reports/export${qs ? `?${qs}` : ""}`;
  }, [from, to]);

  function onApply(e: React.FormEvent) {
    e.preventDefault();
    setOpenId(null);
    const qs = buildParams().toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <form
      onSubmit={onApply}
      className="min-w-0 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4"
    >
      {/* ONE ROW (desktop), wraps nicely (mobile) */}
      <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center lg:gap-2">
        {/* Search (simple, no icon) */}
        <div className="min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 w-full rounded-full border border-border bg-background px-4 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40"
            placeholder="Search bill no / customer / cashier…"
            name="q"
          />
        </div>

        {/* Filters + actions */}
        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:flex-nowrap">
          <DateChipPicker
            id="from"
            label="From"
            value={from}
            onChange={setFrom}
            openId={openId}
            setOpenId={setOpenId}
          />
          <DateChipPicker
            id="to"
            label="To"
            value={to}
            onChange={setTo}
            openId={openId}
            setOpenId={setOpenId}
          />

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as Status)}
            name="status"
            className="h-10 rounded-full border border-border bg-background px-3 text-sm shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <option value="ALL">All</option>
            <option value="FINAL">Final</option>
            <option value="DRAFT">Draft</option>
            <option value="VOID">Void</option>
          </select>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            Apply
          </button>

          {canExport ? (
            <a
              href={exportHref}
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground shadow-sm transition hover:bg-card"
            >
              Export
            </a>
          ) : null}

          <Link
            href="/billing"
            prefetch={false}
            className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
          >
            + New bill
          </Link>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
        <div>
          Showing <span className="font-semibold text-foreground">{count}</span> invoices
        </div>
        <div className="hidden sm:block">
          Tip: Press <span className="font-semibold text-foreground">Enter</span> to search.
        </div>
      </div>
    </form>
  );
}