// src/components/dashboard/ExpensesByCategoryCard.tsx
import Link from "next/link";
import { inr } from "@/lib/format";

export default function ExpensesByCategoryCard({
  monthLabel,
  data,
  expenseRatio,
}: {
  monthLabel: string;
  data: { category: string; total: number; pct: number }[];
  expenseRatio: number | null;
}) {
  const top = data.slice(0, 6);
  const max = Math.max(0, ...top.map((x) => x.total));

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Expenses by category
          </h2>
          <p className="mt-1 text-[11px] text-muted">
            {monthLabel} • where spend is going
            {expenseRatio == null ? "" : ` • ratio ${expenseRatio.toFixed(1)}%`}
          </p>
        </div>

        <Link
          href="/expenses"
          prefetch={false}
          className="inline-flex w-fit items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-card hover:no-underline"
        >
          Open expenses
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-background/40 px-3 py-3 text-[11px] text-muted">
          No expenses recorded for this month yet.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {top.map((x) => {
            const w = max > 0 ? (x.total / max) * 100 : 0;

            return (
              <div key={x.category} className="min-w-0 rounded-xl bg-background/60 px-3 py-2">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <div className="min-w-0">
                    <div
                      className="truncate text-sm font-semibold text-foreground"
                      title={x.category}
                    >
                      {x.category}
                    </div>
                    <div className="text-[11px] text-muted">
                      {x.pct.toFixed(1)}% of expenses
                    </div>
                  </div>

                  <div className="shrink-0 text-left sm:text-right">
                    <div className="text-sm font-semibold text-foreground tabular-nums">
                      {inr(x.total)}
                    </div>
                  </div>
                </div>

                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted/15">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${Math.max(6, w)}%` }}
                  />
                </div>
              </div>
            );
          })}

          {data.length > top.length ? (
            <div className="pt-1 text-[11px] text-muted">
              +{data.length - top.length} more categories
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}