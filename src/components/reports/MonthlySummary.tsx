"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { inr } from "@/lib/format";

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

export default function MonthlySummary() {
  const [month, setMonth] = useState(ym());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const from = useMemo(() => firstDayStr(month), [month]);
  const to = useMemo(() => lastDayStr(month), [month]);
  const linkToInvoices = useMemo(
    () =>
      `/invoices?from=${encodeURIComponent(
        from
      )}&to=${encodeURIComponent(to)}&status=FINAL`,
    [from, to]
  );
  const exportHref = useMemo(
    () =>
      `/api/reports/export?from=${encodeURIComponent(
        from
      )}&to=${encodeURIComponent(to)}`,
    [from, to]
  );

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res = await fetch(
          `/api/reports/monthly?month=${encodeURIComponent(
            month
          )}`,
          { cache: "no-store" }
        );
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

  return (
    <section className="space-y-4 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Header / controls */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Monthly summary
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Snapshot of finalized invoices for the selected month, including
            tax split and payment modes.
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Window: {from} → {to}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs hover:bg-card"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            ◀
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-8 rounded-full border border-border bg-background px-3 text-xs shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <button
            type="button"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs hover:bg-card"
            onClick={() => shiftMonth(+1)}
            aria-label="Next month"
          >
            ▶
          </button>
        </div>
      </div>

      {/* Status */}
      {loading && (
        <div className="text-xs text-muted sm:text-sm">
          Loading monthly summary…
        </div>
      )}
      {err && (
        <div className="rounded-xl border border-danger/40 bg-danger/5 px-3 py-2 text-xs text-danger sm:text-sm">
          {err}
        </div>
      )}

      {/* KPIs */}
      {data && (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            <Kpi label="Invoices" value={String(data.count)} />
            <Kpi label="Subtotal" value={inr(data.subtotal)} />
            <Kpi label="Discount" value={inr(data.discount)} />
            <Kpi label="Tax base" value={inr(data.taxbase)} />
            <Kpi
              label="CGST + SGST"
              value={inr(data.cgst + data.sgst)}
            />
            <Kpi label="IGST" value={inr(data.igst)} />
            <Kpi
              label="Round-off"
              value={inr(data.roundoff)}
            />
            <Kpi
              label="Grand total"
              value={inr(data.grand)}
              highlight
            />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Kpi label="Cash" value={inr(data.cash)} tone="cash" />
            <Kpi label="Card" value={inr(data.card)} tone="card" />
            <Kpi label="UPI" value={inr(data.upi)} tone="upi" />
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs sm:text-sm">
            <Link
              className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 font-medium text-foreground hover:bg-card"
              href={linkToInvoices}
              prefetch
            >
              View invoices for {month}
            </Link>
            <a
              className="inline-flex items-center rounded-full border border-border bg-background px-3 py-2 font-medium text-foreground hover:bg-card"
              href={exportHref}
            >
              Export CSV for {month}
            </a>
          </div>
        </>
      )}
    </section>
  );
}

function Kpi({
  label,
  value,
  highlight,
  tone,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  tone?: "cash" | "card" | "upi";
}) {
  let toneClasses = "";
  if (tone === "cash") {
    toneClasses =
      "border-emerald-100 bg-emerald-50/60 text-emerald-800";
  } else if (tone === "card") {
    toneClasses =
      "border-sky-100 bg-sky-50/60 text-sky-800";
  } else if (tone === "upi") {
    toneClasses =
      "border-fuchsia-100 bg-fuchsia-50/60 text-fuchsia-800";
  }

  return (
    <div
      className={`rounded-2xl border px-3 py-3 shadow-sm ${
        highlight
          ? "border-primary/40 bg-primary/5"
          : toneClasses || "border-border bg-background"
      }`}
    >
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted">
        {label}
      </div>
      <div className="mt-1 text-lg font-semibold text-foreground">
        {value}
      </div>
    </div>
  );
}