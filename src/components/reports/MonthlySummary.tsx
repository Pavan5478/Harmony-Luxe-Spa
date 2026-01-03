"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/format";
import { parseExpenses, parseInclusiveRange } from "@/components/reports/report-utils";

type Summary = {
  count: number;
  subtotal: number;
  discount: number;
  taxbase: number;
  cgst: number;
  sgst: number;
  igst: number;
  roundoff: number;
  grand: number;
  cash: number;
  card: number;
  upi: number;
};

function ym(d = new Date()) {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  return `${y}-${m}`;
}
function lastDayStr(month: string) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m, 0);
  return d.toISOString().slice(0, 10);
}
function firstDayStr(month: string) {
  return `${month}-01`;
}

function windowLabel(from: string, to: string) {
  const a = new Date(from + "T00:00:00");
  const b = new Date(to + "T00:00:00");
  const la = a.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  const lb = b.toLocaleDateString(undefined, { month: "short", day: "2-digit" });
  return `${la} → ${lb}`;
}

export default function MonthlySummary({ initialExpenses }: { initialExpenses?: any[] }) {
  const [month, setMonth] = useState(ym());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const from = useMemo(() => firstDayStr(month), [month]);
  const to = useMemo(() => lastDayStr(month), [month]);

  const linkToInvoices = useMemo(
    () => `/invoices?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=FINAL`,
    [from, to]
  );

  const exportHref = useMemo(
    () => `/api/reports/export?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&status=ALL`,
    [from, to]
  );

  // Expenses for selected month (from already-loaded data on page)
  const parsedExpenses = useMemo(() => parseExpenses(initialExpenses || []), [initialExpenses]);

  const { fromDate, toDateExclusive } = useMemo(() => parseInclusiveRange(from, to), [from, to]);

  const monthExpensesTotal = useMemo(() => {
    if (!parsedExpenses.length) return 0;
    return parsedExpenses.reduce((s, e) => {
      if (fromDate && e.date < fromDate) return s;
      if (toDateExclusive && e.date >= toDateExclusive) return s;
      return s + e.amount;
    }, 0);
  }, [parsedExpenses, fromDate, toDateExclusive]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(`/api/reports/monthly?month=${encodeURIComponent(month)}`, {
          cache: "no-store",
        });

        if (res.status === 403) throw new Error("Forbidden");
        if (!res.ok) throw new Error(await res.text());

        const j = await res.json();
        if (!cancelled) setData(j.summary as Summary);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [month]);

  function shiftMonth(delta: number) {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonth(ym(d));
  }

  const monthRevenue = data?.grand ?? 0;
  const monthProfit = monthRevenue - monthExpensesTotal;
  const monthMargin = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : 0;

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground sm:text-base">Monthly summary</h2>
            <p className="mt-1 text-[11px] text-muted sm:text-xs">
              Invoices snapshot (tax + payments) for the selected month.
            </p>
            <p className="mt-1 text-[11px] text-muted">Window: {windowLabel(from, to)}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-xs hover:bg-card"
              onClick={() => shiftMonth(-1)}
              aria-label="Previous month"
            >
              ◀
            </button>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-xs hover:bg-card"
              onClick={() => shiftMonth(+1)}
              aria-label="Next month"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Month input (full width, clean) */}
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="h-9 w-full rounded-full border border-border bg-background px-3 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
        />
      </div>

      {/* States */}
      <div className="mt-4">
        {loading ? <div className="text-xs text-muted sm:text-sm">Loading monthly summary…</div> : null}

        {err ? (
          <div className="rounded-xl border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger sm:text-sm">
            {err === "Forbidden" ? "You don’t have access to monthly summaries." : err}
          </div>
        ) : null}

        {data ? (
          <div className="space-y-4">
            {/* SECTION: Snapshot (3 columns max) */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Snapshot
              </p>
              <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3">
                <KpiMini label="Invoices" value={String(data.count)} />
                <KpiMini label="Grand total" value={inr(data.grand)} highlight />
                <KpiMini label="Tax base" value={inr(data.taxbase)} />
              </div>
            </div>

            {/* SECTION: Tax */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Tax
              </p>
              <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3">
                <KpiMini label="CGST + SGST" value={inr(data.cgst + data.sgst)} />
                <KpiMini label="IGST" value={inr(data.igst)} />
                <KpiMini label="Discount" value={inr(data.discount)} />
              </div>
            </div>

            {/* SECTION: Monthly P&L */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Monthly P&amp;L
              </p>
              <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3">
                <KpiMini label="Expenses" value={inr(monthExpensesTotal)} />
                <KpiMini label="Net profit" value={inr(monthProfit)} highlight={monthProfit >= 0} danger={monthProfit < 0} />
                <KpiMini label="Margin" value={`${isFinite(monthMargin) ? monthMargin.toFixed(1) : "0.0"}%`} />
              </div>

              <div className="rounded-xl border border-border bg-background/60 px-3 py-2 text-[11px] text-muted">
                Status:{" "}
                <span className={`font-semibold ${monthProfit >= 0 ? "text-emerald-600" : "text-danger"}`}>
                  {monthProfit >= 0 ? "Positive" : "Negative"}
                </span>
              </div>
            </div>

            {/* SECTION: Payments */}
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                Payments
              </p>
              <div className="grid gap-2 sm:gap-3 grid-cols-2 md:grid-cols-3">
                <KpiMini label="Cash" value={inr(data.cash)} tone="cash" />
                <KpiMini label="Card" value={inr(data.card)} tone="card" />
                <KpiMini label="UPI" value={inr(data.upi)} tone="upi" />
              </div>
            </div>

            {/* Actions (one by one down) */}
            <div className="space-y-2 pt-1">
              <Link
                className="inline-flex w-full items-center justify-center rounded-full border border-border bg-background px-3 py-2.5 text-sm font-semibold text-foreground hover:bg-card"
                href={linkToInvoices}
                prefetch
              >
                View invoices
              </Link>

              <a
  href={exportHref}
  className="inline-flex w-full items-center justify-center rounded-full bg-primary px-3 py-2.5 text-sm font-semibold !text-black shadow-sm hover:bg-primary/90"
>
  Export month CSV
</a>

            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function KpiMini({
  label,
  value,
  highlight,
  danger,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  danger?: boolean;
  tone?: "cash" | "card" | "upi";
}) {
  let toneClasses = "border-border bg-background";
  if (tone === "cash") toneClasses = "border-emerald-100/60 bg-emerald-500/10";
  if (tone === "card") toneClasses = "border-sky-100/60 bg-sky-500/10";
  if (tone === "upi") toneClasses = "border-fuchsia-100/60 bg-fuchsia-500/10";
  if (highlight) toneClasses = "border-primary/40 bg-primary/10";

  const valueTone = danger ? "text-danger" : "text-foreground";

  return (
    <div className={`rounded-2xl border px-3 py-3 shadow-sm ${toneClasses}`}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
        {label}
      </div>
      <div className={`mt-1 text-base font-semibold ${valueTone}`}>{value}</div>
    </div>
  );
}