// src/components/dashboard/StatsRow.tsx
import { inr } from "@/lib/format";

type Props = {
  monthRevenue: number;
  revenueChangePct: number | null;
  monthInvoiceCount: number;
  totalInvoices: number;
  finalCount: number;
  todayCount: number;
  avgBill: number;
  activeCustomers: number;
  finalizationRate: number;
  draftCount: number;
  voidCount: number;
  projectedRevenue: number;
  expenseRatio: number | null;
};

function formatChange(pct: number | null) {
  if (pct === null || !Number.isFinite(pct)) return "No data vs last month";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}% vs last month`;
}

function formatExpenseRatio(ratio: number | null) {
  if (ratio == null || !Number.isFinite(ratio)) {
    return "No expense data yet";
  }
  return `${ratio.toFixed(1)}% of revenue`;
}

export default function StatsRow(props: Props) {
  const {
    monthRevenue,
    revenueChangePct,
    monthInvoiceCount,
    totalInvoices,
    finalCount,
    todayCount,
    avgBill,
    activeCustomers,
    finalizationRate,
    draftCount,
    voidCount,
    projectedRevenue,
    expenseRatio,
  } = props;

  const finRateLabel = `${finalizationRate.toFixed(0)}% finalized`;

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {/* This month revenue */}
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
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <span className="text-xs font-semibold">₹</span>
          </div>
        </div>
        <div className="mt-2 inline-flex items-center gap-2 text-[11px] text-muted">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
            {monthInvoiceCount} invoices
          </span>
          <span>{formatChange(revenueChangePct)}</span>
        </div>
      </div>

      {/* Projection + expense ratio */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Projected revenue
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {inr(projectedRevenue)}
            </p>
          </div>
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-sky-50 text-sky-600">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M4 19l4.5-5 3 3.5L17 9l3 4"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          {formatExpenseRatio(expenseRatio)}
        </p>
      </div>

      {/* Today snapshot */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Today
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {todayCount} invoice{todayCount === 1 ? "" : "s"}
            </p>
          </div>
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-violet-50 text-violet-600">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M4 5h16M5 3v4M19 3v4M5 21h14a1 1 0 0 0 1-1V8H4v12a1 1 0 0 0 1 1Z"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        <p className="mt-2 text-[11px] text-muted">
          Average bill this month:{" "}
          <span className="font-medium text-foreground">
            {inr(avgBill)}
          </span>
          .
        </p>
      </div>

      {/* Customers & finalisation */}
      <div className="flex flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
              Customers & status
            </p>
            <p className="mt-1 text-2xl font-semibold text-foreground">
              {activeCustomers}
            </p>
          </div>
          <div className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4 0-7 2-7 4v1h14v-1c0-2-3-4-7-4Z"
                fill="currentColor"
              />
            </svg>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted">
          <span>{finRateLabel}</span>
          <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-background">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${Math.min(finalizationRate, 100)}%` }}
            />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
          <span className="rounded-full bg-background px-2 py-0.5">
            Final:{" "}
            <span className="font-medium text-foreground">
              {finalCount}
            </span>
          </span>
          <span className="rounded-full bg-background px-2 py-0.5">
            Draft:{" "}
            <span className="font-medium text-foreground">
              {draftCount}
            </span>
          </span>
          <span className="rounded-full bg-background px-2 py-0.5">
            Void:{" "}
            <span className="font-medium text-foreground">
              {voidCount}
            </span>
          </span>
          <span className="rounded-full bg-background px-2 py-0.5">
            Total invoices:{" "}
            <span className="font-medium text-foreground">
              {totalInvoices}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}