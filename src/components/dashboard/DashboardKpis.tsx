// src/components/dashboard/DashboardKpis.tsx
import { inr } from "@/lib/format";

function fmtChange(pct: number | null) {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function MiniBars({
  points,
}: {
  points: { label: string; weekday: string; total: number }[];
}) {
  const max = Math.max(0, ...points.map((p) => p.total));
  if (!points.length) return null;

  return (
    <div className="mt-3">
      <div className="flex h-10 items-end gap-1.5">
        {points.map((p) => {
          const ratio = max > 0 ? p.total / max : 0;
          const h = p.total > 0 ? Math.max(12, ratio * 100) : 6;

          return (
            <div key={`${p.weekday}-${p.label}`} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-full w-full items-end justify-center rounded-full bg-muted/15">
                <div
                  className="w-2.5 rounded-full bg-primary"
                  style={{ height: `${h}%` }}
                  title={`${p.weekday} ${p.label}: ${inr(p.total)}`}
                />
              </div>
              <div className="text-[10px] text-muted">
                <span className="font-medium text-foreground">{p.weekday.slice(0, 2)}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 text-[10px] text-muted">Last 7 days (final invoices)</div>
    </div>
  );
}

function Card({
  title,
  right,
  value,
  sub,
  footer,
  children,
}: {
  title: string;
  right?: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{title}</p>
        {right}
      </div>

      <div className="mt-2">
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {sub ? <div className="mt-1 text-[11px] text-muted">{sub}</div> : null}
      </div>

      {children}

      {footer ? <div className="mt-3 text-[11px] text-muted">{footer}</div> : null}
    </div>
  );
}

export default function DashboardKpis(props: {
  monthLabel: string;
  todayLabel: string;

  monthRevenue: number;
  todayRevenue: number;
  revenueChangePct: number | null;
  projectedRevenue: number;

  monthExpensesTotal: number;
  todayExpensesTotal: number;

  monthProfit: number;
  todayProfit: number;
  expenseRatio: number | null;

  avgBill: number;
  monthInvoiceCount: number;
  todayCount: number;

  finalCount: number;
  draftCount: number;
  voidCount: number;
  activeCustomers: number;
  finalizationRate: number;
  totalInvoices: number;

  last7Revenue: { label: string; weekday: string; total: number }[];
}) {
  const {
    monthLabel,
    monthRevenue,
    revenueChangePct,
    projectedRevenue,
    monthExpensesTotal,
    monthProfit,
    expenseRatio,
    todayRevenue,
    todayCount,
    todayExpensesTotal,
    todayProfit,
    avgBill,
    monthInvoiceCount,
    activeCustomers,
    finalCount,
    draftCount,
    voidCount,
    finalizationRate,
    totalInvoices,
    last7Revenue,
  } = props;

  const marginPct = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : null;

  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {/* Revenue */}
      <Card
        title="Revenue (MTD)"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {monthInvoiceCount} final
          </span>
        }
        value={inr(monthRevenue)}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-background px-2 py-0.5">
              vs prev <span className="font-medium text-foreground">{fmtChange(revenueChangePct)}</span>
            </span>
            <span className="rounded-full bg-background px-2 py-0.5">
              proj <span className="font-medium text-foreground">{inr(projectedRevenue)}</span>
            </span>
          </span>
        }
      >
        <MiniBars points={last7Revenue} />
      </Card>

      {/* Net / Profit */}
      <Card
        title="Net (MTD)"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {marginPct == null ? "—" : `${marginPct.toFixed(0)}% margin`}
          </span>
        }
        value={
          <span className={monthProfit >= 0 ? "text-emerald-400" : "text-danger"}>
            {inr(monthProfit)}
          </span>
        }
        sub={
          <>
            Expenses <span className="font-medium text-foreground">{inr(monthExpensesTotal)}</span>
          </>
        }
        footer={<span className="text-[10px]">Month: {monthLabel}</span>}
      />

      {/* Expenses */}
      <Card
        title="Expenses (MTD)"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {expenseRatio == null ? "—" : `${expenseRatio.toFixed(1)}%`}
          </span>
        }
        value={inr(monthExpensesTotal)}
        sub={
          <span className="text-[11px]">
            Ratio{" "}
            <span className="font-medium text-foreground">
              {expenseRatio == null ? "—" : `${expenseRatio.toFixed(1)}% of revenue`}
            </span>
          </span>
        }
        footer={<span className="text-[10px]">Track category spend below</span>}
      />

      {/* Today */}
      <Card
        title="Today revenue"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {todayCount} bills
          </span>
        }
        value={inr(todayRevenue)}
        sub={
          <>
            Exp <span className="font-medium text-foreground">{inr(todayExpensesTotal)}</span> • Net{" "}
            <span className={todayProfit >= 0 ? "font-medium text-emerald-400" : "font-medium text-danger"}>
              {inr(todayProfit)}
            </span>
          </>
        }
      />

      {/* Avg bill */}
      <Card
        title="Avg bill (MTD)"
        right={<span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">final only</span>}
        value={inr(avgBill)}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-background px-2 py-0.5">
              Final <span className="font-medium text-foreground">{finalCount}</span>
            </span>
            <span className="rounded-full bg-background px-2 py-0.5">
              Draft <span className="font-medium text-foreground">{draftCount}</span>
            </span>
            {voidCount > 0 ? (
              <span className="rounded-full bg-background px-2 py-0.5">
                Void <span className="font-medium text-foreground">{voidCount}</span>
              </span>
            ) : null}
          </span>
        }
      />

      {/* Customers */}
      <Card
        title="Customers (MTD)"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {finalizationRate.toFixed(0)}% finalized
          </span>
        }
        value={activeCustomers}
        sub={
          <>
            Total bills <span className="font-medium text-foreground">{totalInvoices}</span>
          </>
        }
        footer={<span className="text-[10px]">Unique named customers on final bills</span>}
      />
    </section>
  );
}