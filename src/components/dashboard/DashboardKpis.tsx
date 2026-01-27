// src/components/dashboard/DashboardKpis.tsx
import Link from "next/link";
import { inr } from "@/lib/format";

function fmtChange(pct: number | null) {
  if (pct == null || !Number.isFinite(pct)) return "—";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct.toFixed(1)}%`;
}

function ChangePill({ pct }: { pct: number | null }) {
  if (pct == null || !Number.isFinite(pct)) {
    return (
      <span className="rounded-full bg-background px-2 py-0.5 text-[10px] sm:text-[11px]">
        vs prev <span className="font-medium text-foreground">—</span>
      </span>
    );
  }

  const up = pct > 0;
  const down = pct < 0;

  const tone = up
    ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-400"
    : down
    ? "border-danger/30 bg-danger/10 text-danger"
    : "border-border/60 bg-background text-muted";

  return (
    <span
      className={[
        "rounded-full px-2 py-0.5 text-[10px] sm:text-[11px]",
        "border",
        tone,
      ].join(" ")}
    >
      vs prev <span className="font-semibold">{fmtChange(pct)}</span>
    </span>
  );
}

function MiniBars({
  points,
}: {
  points: { label: string; weekday: string; total: number }[];
}) {
  const max = Math.max(0, ...points.map((p) => p.total));
  if (!points.length) return null;

  return (
    <div className="mt-3 min-w-0" role="img" aria-label="Revenue for last 7 days">
      <div className="flex h-9 items-end gap-1 sm:h-10 sm:gap-1.5">
        {points.map((p) => {
          const ratio = max > 0 ? p.total / max : 0;
          const h = p.total > 0 ? Math.max(12, ratio * 100) : 6;

          return (
            <div
              key={`${p.weekday}-${p.label}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1"
              title={`${p.weekday} ${p.label}: ${inr(p.total)}`}
            >
              <div className="flex h-full w-full items-end justify-center rounded-full bg-muted/15">
                <div
                  className="w-2 rounded-full bg-primary sm:w-2.5"
                  style={{ height: `${h}%` }}
                  aria-hidden
                />
              </div>
              <div className="text-[9px] text-muted sm:text-[10px]">
                <span className="font-medium text-foreground">
                  {p.weekday.slice(0, 2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-1 text-[9px] text-muted sm:text-[10px]">
        Last 7 days (final invoices)
      </div>
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
  href,
  ariaLabel,
}: {
  title: string;
  right?: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
  footer?: React.ReactNode;
  children?: React.ReactNode;
  href?: string;
  ariaLabel?: string;
}) {
  const baseCls = [
    "min-w-0 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5",
    "transition",
    href
      ? "hover:bg-card/90 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      : "",
  ].join(" ");

  const inner = (
    <>
      <div className="flex min-w-0 items-start justify-between gap-2">
       <p className="min-w-0 whitespace-normal text-[10px] font-semibold uppercase tracking-wide text-muted sm:text-[11px]">
          {title}
        </p>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>

      <div className="mt-2 min-w-0">
        <div className="tabular-nums whitespace-nowrap text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
  {value}
</div>

        {sub ? (
          <div className="mt-1 min-w-0 text-[10px] leading-snug text-muted sm:text-[11px]">
            {sub}
          </div>
        ) : null}
      </div>

      {children}

      {footer ? (
        <div className="mt-3 min-w-0 text-[10px] leading-snug text-muted">{footer}</div>
      ) : null}
    </>
  );

  if (href) {
    return (
      <Link href={href} prefetch={false} className={baseCls} aria-label={ariaLabel || title}>
        {inner}
      </Link>
    );
  }

  return <div className={baseCls}>{inner}</div>;
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

  // ✅ NEW: optional drill-down links
  links?: {
    monthFinals?: string;
    todayFinals?: string;
    invoicesAll?: string;
    expenses?: string;
    customers?: string;
  };
}) {
  const {
    monthLabel,
    todayLabel,
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
    links,
  } = props;

  const marginPct = monthRevenue > 0 ? (monthProfit / monthRevenue) * 100 : null;

  return (
    <section className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-3">
      <Card
        title="Revenue (MTD)"
        href={links?.monthFinals}
        ariaLabel="Open final invoices for this month"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {monthInvoiceCount} final
          </span>
        }
        value={<span className="tabular-nums">{inr(monthRevenue)}</span>}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            <ChangePill pct={revenueChangePct} />
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] sm:text-[11px]">
              proj{" "}
              <span className="font-medium text-foreground tabular-nums">
                {inr(projectedRevenue)}
              </span>
            </span>
          </span>
        }
      >
        <MiniBars points={last7Revenue} />
      </Card>

      <Card
        title="Net (MTD)"
        href={links?.monthFinals}
        ariaLabel="Open final invoices for this month"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {marginPct == null ? "—" : `${marginPct.toFixed(0)}% margin`}
          </span>
        }
        value={
          <span className={monthProfit >= 0 ? "text-emerald-400" : "text-danger"}>
            <span className="tabular-nums">{inr(monthProfit)}</span>
          </span>
        }
        sub={
          <>
            Expenses{" "}
            <span className="font-medium text-foreground tabular-nums">
              {inr(monthExpensesTotal)}
            </span>
          </>
        }
        footer={<span className="text-[10px]">Month: {monthLabel}</span>}
      />

      <Card
        title="Expenses (MTD)"
        href={links?.expenses}
        ariaLabel="Open expenses"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {expenseRatio == null ? "—" : `${expenseRatio.toFixed(1)}%`}
          </span>
        }
        value={<span className="tabular-nums">{inr(monthExpensesTotal)}</span>}
        sub={
          <span className="text-[10px] sm:text-[11px]">
            Ratio{" "}
            <span className="font-medium text-foreground">
              {expenseRatio == null ? "—" : `${expenseRatio.toFixed(1)}% of revenue`}
            </span>
          </span>
        }
        footer={<span className="text-[10px]">Tap to manage expenses</span>}
      />

      <Card
        title={`Today revenue`}
        href={links?.todayFinals}
        ariaLabel="Open today final invoices"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {todayCount} bills
          </span>
        }
        value={<span className="tabular-nums">{inr(todayRevenue)}</span>}
        sub={
          <>
            Exp{" "}
            <span className="font-medium text-foreground tabular-nums">
              {inr(todayExpensesTotal)}
            </span>{" "}
            • Net{" "}
            <span
              className={
                todayProfit >= 0
                  ? "font-medium text-emerald-400"
                  : "font-medium text-danger"
              }
            >
              <span className="tabular-nums">{inr(todayProfit)}</span>
            </span>
          </>
        }
        footer={<span className="text-[10px]">Day: {todayLabel}</span>}
      />

      <Card
        title="Avg bill (MTD)"
        href={links?.monthFinals}
        ariaLabel="Open final invoices for this month"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            final only
          </span>
        }
        value={<span className="tabular-nums">{inr(avgBill)}</span>}
        sub={
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] sm:text-[11px]">
              Final{" "}
              <span className="font-medium text-foreground tabular-nums">{finalCount}</span>
            </span>
            <span className="rounded-full bg-background px-2 py-0.5 text-[10px] sm:text-[11px]">
              Draft{" "}
              <span className="font-medium text-foreground tabular-nums">{draftCount}</span>
            </span>
            {voidCount > 0 ? (
              <span className="rounded-full bg-background px-2 py-0.5 text-[10px] sm:text-[11px]">
                Void{" "}
                <span className="font-medium text-foreground tabular-nums">{voidCount}</span>
              </span>
            ) : null}
          </span>
        }
      />

      <Card
        title="Customers (MTD)"
        href={links?.customers || links?.monthFinals}
        ariaLabel="Open invoices (customer drilldown)"
        right={
          <span className="rounded-full bg-background px-2 py-1 text-[10px] text-muted">
            {finalizationRate.toFixed(0)}% finalized
          </span>
        }
        value={<span className="tabular-nums">{activeCustomers}</span>}
        sub={
          <>
            Total bills{" "}
            <span className="font-medium text-foreground tabular-nums">{totalInvoices}</span>
          </>
        }
        footer={<span className="text-[10px]">Unique named customers on final bills</span>}
      />
    </section>
  );
}
