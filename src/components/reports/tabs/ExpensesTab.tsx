"use client";

import { useMemo, useState } from "react";
import { inr } from "@/lib/format";
import { ExpenseSummary } from "@/components/reports/report-utils";
import { KpiCard, SectionShell, fieldBase } from "@/components/reports/ReportUi";

export default function ExpensesTab({
  expensesTotal,
  expenseCount,
  avgExpense,
  maxExpense,
  expenses,
}: {
  expensesTotal: number;
  expenseCount: number;
  avgExpense: number;
  maxExpense: number;
  expenses: ExpenseSummary[];
}) {
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return expenses;
    return expenses.filter((e) => {
      const hay = `${e.category ?? ""} ${e.description ?? ""} ${e.paymentMode ?? ""}`.toLowerCase();
      return hay.includes(s);
    });
  }, [expenses, q]);

  const byCategory = useMemo(() => {
    const map = new Map<string, { amount: number; count: number }>();
    for (const e of expenses) {
      const key = e.category || "Misc";
      const cur = map.get(key) || { amount: 0, count: 0 };
      cur.amount += e.amount;
      cur.count += 1;
      map.set(key, cur);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].amount - a[1].amount);
  }, [expenses]);

  return (
    <div className="space-y-4 lg:space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Total expenses" value={inr(expensesTotal)} hint="Sum of all entries." />
        <KpiCard label="Entries" value={String(expenseCount)} hint="Rows in Expenses for this period." />
        <KpiCard label="Average expense" value={inr(avgExpense)} hint="Total / count." />
        <KpiCard label="Largest expense" value={inr(maxExpense)} hint="Highest single entry." />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,2fr)]">
        <SectionShell title="By category" subtitle="Where the money went (this range).">
          {expensesTotal <= 0 ? (
            <p className="text-[11px] text-muted">No expenses for this range.</p>
          ) : (
            <div className="space-y-3 text-[11px]">
              {byCategory.slice(0, 10).map(([cat, v]) => {
                const pct = expensesTotal > 0 ? (v.amount / expensesTotal) * 100 : 0;
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-xs font-semibold text-foreground">{cat}</div>
                        <div className="text-[10px] text-muted">{v.count} entries</div>
                      </div>
                      <div className="text-right text-muted">
                        <div>{inr(v.amount)}</div>
                        <div>{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full rounded-full bg-muted/20">
                      <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(2, pct)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionShell>

        <SectionShell title="Expense list" subtitle="Search within filtered expenses.">
          <div className="mb-3">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search category / description / mode"
              className={fieldBase}
            />
          </div>

          <div className="max-h-[420px] overflow-auto text-[11px]">
            <table className="min-w-full text-left">
              <thead className="sticky top-0 border-b border-border bg-card text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-2 pr-2">Date</th>
                  <th className="py-2 pr-2">Category</th>
                  <th className="py-2 pr-2">Description</th>
                  <th className="py-2 pr-2">Mode</th>
                  <th className="py-2 pr-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="py-4 text-center text-muted" colSpan={5}>
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  filtered
                    .slice()
                    .sort((a, b) => b.date.getTime() - a.date.getTime())
                    .map((e) => {
                      const labelDate = e.date.toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
                      return (
                        <tr key={e.id + e.dateISO} className="border-b border-border/60 align-top">
                          <td className="py-2 pr-2">{labelDate}</td>
                          <td className="py-2 pr-2">{e.category || "Misc"}</td>
                          <td className="py-2 pr-2">
                            <div className="max-w-[240px] truncate">{e.description || <span className="text-muted">—</span>}</div>
                          </td>
                          <td className="py-2 pr-2 text-muted">{e.paymentMode || "OTHER"}</td>
                          <td className="py-2 pr-2 text-right">{inr(e.amount)}</td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </SectionShell>
      </section>
    </div>
  );
}
