"use client";

import { useMemo, useState } from "react";

function dstr(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function firstDay(month: string) {
  return `${month}-01`;
}
function lastDay(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 0);
  return d.toISOString().slice(0, 10);
}

export default function DownloadForm() {
  const today = useMemo(() => new Date(), []);
  const thisMonth = useMemo(() => monthStr(today), [today]);
  const lastMonth = useMemo(() => monthStr(new Date(today.getFullYear(), today.getMonth() - 1, 1)), [today]);

  const defFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return d;
  }, [today]);

  const [from, setFrom] = useState(dstr(defFrom));
  const [to, setTo] = useState(dstr(today));

  const invoicesHref = `/api/reports/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=ALL`;
  const expensesHref = `/api/expenses/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  function setPreset(p: "thisMonth" | "lastMonth" | "last30") {
    if (p === "last30") {
      setFrom(dstr(defFrom));
      setTo(dstr(today));
      return;
    }
    const m = p === "thisMonth" ? thisMonth : lastMonth;
    setFrom(firstDay(m));
    setTo(lastDay(m));
  }

  const chip =
    "inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-muted hover:bg-card";
  const label =
    "text-[10px] font-semibold uppercase tracking-[0.18em] text-muted";
  const field =
    "mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";
  const primaryBtn =
    "inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-black shadow-sm hover:brightness-105";
  const secondaryBtn =
    "inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm hover:bg-card";

  return (
    <section className="h-full rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">Downloads</h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Export invoices and expenses for the selected date window.
          </p>
        </div>
      </div>

      {/* Presets (wrap nicely, never cramped) */}
      <div className="mt-4">
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          <button type="button" onClick={() => setPreset("thisMonth")} className={chip}>
            This month
          </button>
          <button type="button" onClick={() => setPreset("lastMonth")} className={chip}>
            Last month
          </button>
          <button
            type="button"
            onClick={() => setPreset("last30")}
            className="col-span-2 sm:col-auto inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-3 py-1.5 text-[11px] font-semibold text-muted hover:bg-card"
          >
            Last 30 days
          </button>
        </div>
      </div>

      {/* Range (stack on mobile, 2-col on sm+) */}
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className={label}>
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className={field}
          />
        </label>

        <label className={label}>
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className={field}
          />
        </label>
      </div>

      {/* Actions (one-by-one on mobile, side-by-side on sm+) */}
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
       <a
  href={invoicesHref}
  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold !text-black shadow-sm hover:brightness-105">
  Download invoices CSV
</a>

        <a href={expensesHref} className={secondaryBtn}>
          Download expenses CSV
        </a>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Tip: Use the same range here as your main report period so accounting exports match your KPIs.
      </p>
    </section>
  );
}