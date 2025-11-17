// src/components/dashboard/KpiRow.tsx
import { inr } from "@/lib/format";

type Props = {
  monthRevenue: number;
  monthInvoiceCount: number;
  revenueChangePct: number | null;
  avgBill: number;
  todayCount: number;
  todayLabel: string;
  weekTotal: number;
  draftCount: number;
  voidCount: number;
  monthLabel: string;
};

function formatChange(pct: number | null): string {
  if (pct === null) return "No data";
  if (pct === 0) return "No change vs last month";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% vs last month`;
}

export default function KpiRow({
  monthRevenue,
  monthInvoiceCount,
  revenueChangePct,
  avgBill,
  todayCount,
  todayLabel,
  weekTotal,
  draftCount,
  voidCount,
  monthLabel,
}: Props) {
  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* Revenue */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              This month revenue
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {inr(monthRevenue)}
            </p>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            {monthInvoiceCount} invoices
          </span>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {formatChange(revenueChangePct)}
        </p>
      </div>

      {/* Average bill */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Average bill value
        </p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {inr(avgBill)}
        </p>
        <p className="mt-2 text-[11px] text-muted">
          Based on finalized invoices in {monthLabel}.
        </p>
      </div>

      {/* Today */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Today
        </p>
        <p className="mt-1 text-2xl font-semibold text-foreground">
          {todayCount} invoice{todayCount === 1 ? "" : "s"}
        </p>
        <p className="mt-2 text-[11px] text-muted">
          {todayLabel} •{" "}
          {weekTotal > 0
            ? `Part of ₹${weekTotal.toFixed(2)} in the last 7 days`
            : "No finalized invoices yet this week."}
        </p>
      </div>

      {/* Draft / void snapshot */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
          Draft &amp; void
        </p>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-muted">Drafts</span>
            <span className="text-lg font-semibold text-foreground">
              {draftCount}
            </span>
          </div>
          <div className="h-10 w-px bg-border" />
          <div className="flex flex-col">
            <span className="text-xs text-muted">Voids</span>
            <span className="text-lg font-semibold text-foreground">
              {voidCount}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Drafts can be edited from the Invoices screen before finalizing.
        </p>
      </div>
    </section>
  );
}