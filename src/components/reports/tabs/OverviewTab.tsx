"use client";

import { useMemo, useState } from "react";
import { inr } from "@/lib/format";
import { DaySummary } from "@/components/reports/report-utils";
import { chipBase, KpiCard, SectionShell } from "@/components/reports/ReportUi";

export default function OverviewTab({
  revenueTotal,
  expensesTotal,
  profitTotal,
  profitMargin,
  invoiceCount,
  uniqueCustomers,
  compare,
  compareMetrics,
  chartDays,
  maxRevenueOrExpense,
  paymentMix,
  paymentTotalAmount,
  dailySummaries,
}: {
  revenueTotal: number;
  expensesTotal: number;
  profitTotal: number;
  profitMargin: number;
  invoiceCount: number;
  uniqueCustomers: number;
  compare: boolean;
  compareMetrics: null | {
    revenueTotal: number;
    expensesTotal: number;
    profitTotal: number;
    invoiceCount: number;
    uniqueCustomers: number;
  };
  chartDays: DaySummary[];
  maxRevenueOrExpense: number;
  paymentMix: { key: string; label: string; amount: number; pct: number }[];
  paymentTotalAmount: number;
  dailySummaries: DaySummary[];
}) {
  const dRevenue =
    compare && compareMetrics ? pct(revenueTotal, compareMetrics.revenueTotal) : null;
  const dExpenses =
    compare && compareMetrics ? pct(expensesTotal, compareMetrics.expensesTotal) : null;
  const dProfit = compare && compareMetrics ? pct(profitTotal, compareMetrics.profitTotal) : null;

  // Breakdown toggle (NO extra cards)
  const [breakdownView, setBreakdownView] = useState<"daily" | "monthly">("daily");

  const monthlySummaries = useMemo(() => {
    // group from dailySummaries -> YYYY-MM
    const map = new Map<
      string,
      {
        monthKey: string;
        revenue: number;
        expenses: number;
        profit: number;
        invoiceCount: number;
        expenseCount: number;
      }
    >();

    for (const d of dailySummaries) {
      const monthKey = d.dateKey.slice(0, 7); // safe local key (YYYY-MM)
      const cur =
        map.get(monthKey) || {
          monthKey,
          revenue: 0,
          expenses: 0,
          profit: 0,
          invoiceCount: 0,
          expenseCount: 0,
        };

      cur.revenue += d.revenue;
      cur.expenses += d.expenses;
      cur.profit += d.profit;
      cur.invoiceCount += d.invoiceCount;
      cur.expenseCount += d.expenseCount;

      map.set(monthKey, cur);
    }

    return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [dailySummaries]);

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* KPI row (better responsive) */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Revenue"
          value={inr(revenueTotal)}
          hint="From invoices in this period."
          deltaPct={dRevenue}
          positiveGood
        />
        <KpiCard
          label="Expenses"
          value={inr(expensesTotal)}
          hint="From expense entries."
          deltaPct={dExpenses}
          positiveGood={false}
        />
        <KpiCard
          label="Net profit"
          value={inr(profitTotal)}
          hint={`Margin: ${isFinite(profitMargin) ? profitMargin.toFixed(1) : "0.0"}%`}
          deltaPct={dProfit}
          positiveGood
        />
        <KpiCard
          label="Invoices & customers"
          value={`${invoiceCount} invoices`}
          hint={`${uniqueCustomers} unique customer${uniqueCustomers === 1 ? "" : "s"}`}
          deltaPct={
            compare && compareMetrics ? pct(invoiceCount, compareMetrics.invoiceCount) : null
          }
          positiveGood
        />
      </section>

      {/* Keep THIS layout: Chart LEFT, stack RIGHT */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.3fr)]">
        <SectionShell
          title="Revenue vs Expenses"
          subtitle={`Daily totals for the last ${chartDays.length} days inside your selected period.`}
        >
          {chartDays.length === 0 || maxRevenueOrExpense <= 0 ? (
            <p className="text-[11px] text-muted">No revenue/expense for this range.</p>
          ) : (
            <>
              {/* Simple legend (inside same card, not extra card) */}
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <div className="flex flex-wrap items-center gap-3 text-muted">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Revenue
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-danger" />
                    Expenses
                  </span>
                </div>
                <span className="text-[10px] uppercase tracking-wide text-muted">
                  last {chartDays.length} days
                </span>
              </div>

              {/* Make chart usable on small screens */}
              <div className="overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                <div className="flex min-w-[640px] items-end gap-3">
                  {chartDays.map((d) => {
                    const revPct = d.revenue > 0 ? (d.revenue / maxRevenueOrExpense) * 100 : 0;
                    const expPct = d.expenses > 0 ? (d.expenses / maxRevenueOrExpense) * 100 : 0;
                    const revHeight = revPct === 0 ? 4 : revPct;
                    const expHeight = expPct === 0 ? 4 : expPct;

                    const labelDate = d.date.toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                    });

                    return (
                      <div
                        key={d.dateKey}
                        className="w-11 flex-none text-center text-[10px] text-muted"
                      >
                        <div className="flex h-28 w-full items-end justify-center gap-1 rounded-full bg-muted/15 px-1">
                          <div
                            className="w-2 rounded-full bg-emerald-500"
                            style={{ height: `${revHeight}%` }}
                            title={`Revenue: ${inr(d.revenue)}`}
                          />
                          <div
                            className="w-2 rounded-full bg-danger"
                            style={{ height: `${expHeight}%` }}
                            title={`Expenses: ${inr(d.expenses)}`}
                          />
                        </div>
                        <div className="mt-1">{labelDate}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </SectionShell>

        <div className="space-y-4">
          <SectionShell title="Payment mix" subtitle="Distribution of revenue by payment mode.">
            {paymentTotalAmount > 0 && paymentMix.length > 0 ? (
              <>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted/20">
                  {paymentMix.map((pm) => (
                    <div
                      key={pm.key}
                      className={`inline-block h-full ${
                        pm.key === "CASH"
                          ? "bg-emerald-500"
                          : pm.key === "CARD"
                          ? "bg-sky-500"
                          : pm.key === "UPI"
                          ? "bg-fuchsia-500"
                          : pm.key === "SPLIT"
                          ? "bg-amber-500"
                          : "bg-slate-400"
                      }`}
                      style={{ width: `${pm.pct.toFixed(1)}%` }}
                    />
                  ))}
                </div>

                <div className="mt-3 grid gap-1 text-[11px] sm:grid-cols-2">
                  {paymentMix.map((pm) => (
                    <div key={pm.key} className="flex items-center justify-between gap-2">
                      <span className="font-medium text-foreground">{pm.label}</span>
                      <span className="text-right text-muted">
                        <span className="block">{inr(pm.amount)}</span>
                        <span>{pm.pct.toFixed(0)}%</span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-[11px] text-muted">No invoices for this range.</p>
            )}
          </SectionShell>

          {/* SAME CARD: Daily + Monthly (P&L) table toggle */}
          <SectionShell
            title="Breakdown"
            subtitle={
              breakdownView === "daily"
                ? "Revenue, expenses, profit by day."
                : "Profit & loss by month inside selected range."
            }
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                View
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setBreakdownView("daily")}
                  className={`${chipBase} ${
                    breakdownView === "daily" ? "text-foreground" : ""
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setBreakdownView("monthly")}
                  className={`${chipBase} ${
                    breakdownView === "monthly" ? "text-foreground" : ""
                  }`}
                >
                  Monthly P&amp;L
                </button>
              </div>
            </div>

            <div className="max-h-56 overflow-auto text-[11px]">
              {breakdownView === "daily" ? (
                <table className="min-w-full text-left">
                  <thead className="sticky top-0 border-b border-border bg-card text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-1 pr-2">Date</th>
                      <th className="py-1 pr-2 text-right">Revenue</th>
                      <th className="py-1 pr-2 text-right">Expenses</th>
                      <th className="py-1 pr-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySummaries.length === 0 ? (
                      <tr>
                        <td className="py-2 text-center text-muted" colSpan={4}>
                          No data for this range.
                        </td>
                      </tr>
                    ) : (
                      dailySummaries.map((d) => (
                        <tr key={d.dateKey} className="border-b border-border/60">
                          <td className="py-1 pr-2">
                            {d.date.toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>
                          <td className="py-1 pr-2 text-right">{inr(d.revenue)}</td>
                          <td className="py-1 pr-2 text-right">{inr(d.expenses)}</td>
                          <td
                            className={`py-1 pr-2 text-right ${
                              d.profit >= 0 ? "text-emerald-600" : "text-danger"
                            }`}
                          >
                            {inr(d.profit)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full text-left">
                  <thead className="sticky top-0 border-b border-border bg-card text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-1 pr-2">Month</th>
                      <th className="py-1 pr-2 text-right">Revenue</th>
                      <th className="py-1 pr-2 text-right">Expenses</th>
                      <th className="py-1 pr-2 text-right">Profit</th>
                      <th className="py-1 pr-2 text-right">Margin</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlySummaries.length === 0 ? (
                      <tr>
                        <td className="py-2 text-center text-muted" colSpan={5}>
                          No data for this range.
                        </td>
                      </tr>
                    ) : (
                      monthlySummaries.map((m) => {
                        const monthDate = new Date(m.monthKey + "-01T00:00:00");
                        const label = monthDate.toLocaleDateString(undefined, {
                          month: "short",
                          year: "numeric",
                        });
                        const margin = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0;

                        return (
                          <tr key={m.monthKey} className="border-b border-border/60">
                            <td className="py-1 pr-2">{label}</td>
                            <td className="py-1 pr-2 text-right">{inr(m.revenue)}</td>
                            <td className="py-1 pr-2 text-right">{inr(m.expenses)}</td>
                            <td
                              className={`py-1 pr-2 text-right ${
                                m.profit >= 0 ? "text-emerald-600" : "text-danger"
                              }`}
                            >
                              {inr(m.profit)}
                            </td>
                            <td className="py-1 pr-2 text-right">
                              {isFinite(margin) ? margin.toFixed(1) : "0.0"}%
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </SectionShell>
        </div>
      </section>
    </div>
  );
}

function pct(curr: number, prev: number) {
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / Math.abs(prev)) * 100;
}