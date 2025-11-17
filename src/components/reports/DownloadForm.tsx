"use client";

import { useMemo, useState } from "react";

function dstr(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function DownloadForm() {
  const today = useMemo(() => new Date(), []);
  const defFrom = useMemo(() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 29);
    return d;
  }, [today]);

  const [from, setFrom] = useState(dstr(defFrom));
  const [to, setTo] = useState(dstr(today));

  const href = `/api/reports/export?from=${encodeURIComponent(
    from
  )}&to=${encodeURIComponent(to)}`;

  return (
    <section className="h-full rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Download invoices (CSV)
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Export raw invoice data for any custom date range. Ideal for
            accounting, audits or detailed analysis.
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 items-end gap-3 sm:grid-cols-3">
        <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
          From
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>

        <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
          To
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </label>

        <div className="flex w-full items-end">
          <a
            href={href}
            className="inline-flex w-full items-center justify-center rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-105"
          >
            Download CSV
          </a>
        </div>
      </div>

      <p className="mt-3 text-[11px] text-muted">
        Uses data from the <b>Invoices</b> sheet. The filter relies on the
        stored ISO date column, so exported totals match your monthly summary.
      </p>
    </section>
  );
}