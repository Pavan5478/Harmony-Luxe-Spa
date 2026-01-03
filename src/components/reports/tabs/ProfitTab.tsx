"use client";

import { useMemo, useState } from "react";
import { inr } from "@/lib/format";
import { DaySummary } from "@/components/reports/report-utils";
import { chipBase, KpiCard, SectionShell } from "@/components/reports/ReportUi";

export default function ProfitTab({
  revenueTotal,
  expensesTotal,
  profitTotal,
  profitMargin,
  dailySummaries,
  maxAbsProfit,
}: {
  revenueTotal: number;
  expensesTotal: number;
  profitTotal: number;
  profitMargin: number;
  dailySummaries: DaySummary[];
  maxAbsProfit: number;
}) {
  const [view, setView] = useState<"daily" | "monthly">("daily");

  const monthlySummaries = useMemo(() => {
    const map = new Map<string, { monthKey: string; revenue: number; expenses: number; profit: number }>();
    for (const d of dailySummaries) {
      const monthKey = d.dateKey.slice(0, 7);
      const cur = map.get(monthKey) || { monthKey, revenue: 0, expenses: 0, profit: 0 };
      cur.revenue += d.revenue;
      cur.expenses += d.expenses;
      cur.profit += d.profit;
      map.set(monthKey, cur);
    }
    return Array.from(map.values()).sort((a, b) => a.monthKey.localeCompare(b.monthKey));
  }, [dailySummaries]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue" value={inr(revenueTotal)} hint="From invoices in this range." />
        <KpiCard label="Expenses" value={inr(expensesTotal)} hint="From expense entries in this range." />
        <KpiCard label="Net profit" value={inr(profitTotal)} hint="Revenue − expenses." />
        <KpiCard
          label="Profit margin"
          value={`${isFinite(profitMargin) ? profitMargin.toFixed(1) : "0.0"}%`}
          hint="Profit / revenue × 100."
        />
      </section>

      <SectionShell title="Profit over time" subtitle="Daily profit (revenue − expenses).">
        {dailySummaries.length === 0 || maxAbsProfit <= 0 ? (
          <p className="text-[11px] text-muted">No data for this range.</p>
        ) : (
          <div className="mt-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-[640px] items-end gap-2">
              {dailySummaries.map((d) => {
                const pct = maxAbsProfit > 0 ? (Math.abs(d.profit) / maxAbsProfit) * 100 : 0;
                const height = pct === 0 ? 4 : pct;
                const isPositive = d.profit >= 0;
                const color = isPositive ? "bg-emerald-500" : "bg-danger";
                const labelDate = d.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" });

                return (
                  <div key={d.dateKey} className="w-11 flex-none text-center text-[10px] text-muted">
                    <div className="flex h-28 w-full items-end justify-center rounded-full bg-muted/20">
                      <div
                        className={`w-3 rounded-full sm:w-4 ${color}`}
                        style={{ height: `${height}%` }}
                        title={`Profit: ${inr(d.profit)}`}
                      />
                    </div>
                    <div className="mt-1">{labelDate}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </SectionShell>

      <SectionShell
        title="Profit breakdown"
        subtitle={view === "daily" ? "Revenue, expenses, profit, margin per day." : "Profit & loss by month."}
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">View</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setView("daily")} className={`${chipBase} ${view === "daily" ? "text-foreground" : ""}`}>
              Daily
            </button>
            <button type="button" onClick={() => setView("monthly")} className={`${chipBase} ${view === "monthly" ? "text-foreground" : ""}`}>
              Monthly P&amp;L
            </button>
          </div>
        </div>

        <div className="max-h-[420px] overflow-auto text-[11px]">
          {view === "daily" ? (
            <table className="min-w-full text-left">
              <thead className="sticky top-0 border-b border-border bg-card text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2 text-right">Revenue</th>
                  <th className="py-2 pr-2 text-right">Expenses</th>
                  <th className="py-2 pr-2 text-right">Profit</th>
                  <th className="py-2 pr-2 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {dailySummaries.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-muted" colSpan={5}>
                      No data for this range.
                    </td>
                  </tr>
                ) : (
                  dailySummaries.map((d) => {
                    const margin = d.revenue > 0 ? (d.profit / d.revenue) * 100 : 0;
                    return (
                      <tr key={d.dateKey} className="border-b border-border/60">
                        <td className="py-2 pr-2">
                          {d.date.toLocaleDateString(undefined, { day: "2-digit", month: "short" })}
                        </td>
                        <td className="py-2 pr-2 text-right">{inr(d.revenue)}</td>
                        <td className="py-2 pr-2 text-right">{inr(d.expenses)}</td>
                        <td className={`py-2 pr-2 text-right ${d.profit >= 0 ? "text-emerald-600" : "text-danger"}`}>
                          {inr(d.profit)}
                        </td>
                        <td className="py-2 pr-2 text-right">{isFinite(margin) ? margin.toFixed(1) : "0.0"}%</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full text-left">
              <thead className="sticky top-0 border-b border-border bg-card text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-2">Month</th>
                  <th className="py-2 pr-2 text-right">Revenue</th>
                  <th className="py-2 pr-2 text-right">Expenses</th>
                  <th className="py-2 pr-2 text-right">Profit</th>
                  <th className="py-2 pr-2 text-right">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {monthlySummaries.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-muted" colSpan={5}>
                      No data for this range.
                    </td>
                  </tr>
                ) : (
                  monthlySummaries.map((m) => {
                    const monthDate = new Date(m.monthKey + "-01T00:00:00");
                    const label = monthDate.toLocaleDateString(undefined, { month: "short", year: "numeric" });
                    const margin = m.revenue > 0 ? (m.profit / m.revenue) * 100 : 0;

                    return (
                      <tr key={m.monthKey} className="border-b border-border/60">
                        <td className="py-2 pr-2">{label}</td>
                        <td className="py-2 pr-2 text-right">{inr(m.revenue)}</td>
                        <td className="py-2 pr-2 text-right">{inr(m.expenses)}</td>
                        <td className={`py-2 pr-2 text-right ${m.profit >= 0 ? "text-emerald-600" : "text-danger"}`}>
                          {inr(m.profit)}
                        </td>
                        <td className="py-2 pr-2 text-right">{isFinite(margin) ? margin.toFixed(1) : "0.0"}%</td>
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
  );
}
