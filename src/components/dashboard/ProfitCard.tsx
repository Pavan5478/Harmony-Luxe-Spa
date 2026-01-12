// src/components/dashboard/ProfitCard.tsx
import { inr } from "@/lib/format";

type NetPoint = {
  label: string;
  weekday: string;
  revenue: number;
  expenses: number;
  net: number;
};

export default function ProfitCard({
  monthLabel,
  monthProfit,
  monthRevenue,
  monthExpensesTotal,
  todayProfit,
  todayExpensesTotal,
  data,
}: {
  monthLabel: string;
  monthProfit: number;
  monthRevenue: number;
  monthExpensesTotal: number;
  todayProfit: number;
  todayExpensesTotal: number;
  data: NetPoint[];
}) {
  const maxAbsNet = Math.max(0, ...data.map((d) => Math.abs(d.net)));

  return (
    <section className="min-w-0 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <h2 className="min-w-0 text-sm font-semibold text-foreground sm:text-base">
          Net (revenue − expenses)
        </h2>

        <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {monthLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0">
          <p className="text-[11px] text-muted">Month net</p>

          <p
            className={[
              "mt-1 text-xl font-semibold leading-tight tabular-nums",
              monthProfit >= 0 ? "text-emerald-400" : "text-danger",
            ].join(" ")}
          >
            {inr(monthProfit)}
          </p>

          <p className="mt-1 text-[11px] text-muted">
            Today net:{" "}
            <span
              className={
                todayProfit >= 0
                  ? "font-medium text-emerald-400"
                  : "font-medium text-danger"
              }
            >
              <span className="tabular-nums">{inr(todayProfit)}</span>
            </span>{" "}
            (<span className="tabular-nums">{inr(todayExpensesTotal)}</span> exp)
          </p>
        </div>

        <div className="shrink-0 text-left text-[11px] text-muted sm:text-right">
          <div>
            Rev:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {inr(monthRevenue)}
            </span>
          </div>
          <div>
            Exp:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {inr(monthExpensesTotal)}
            </span>
          </div>
        </div>
      </div>

      {maxAbsNet <= 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 px-3 py-3 text-[11px] text-muted">
          Not enough data to show the last 7 days trend yet.
        </div>
      ) : (
        <div className="mt-4 min-w-0">
          {/* Bars */}
          <div className="flex h-24 items-end gap-1.5 sm:gap-2">
            {data.map((d) => {
              const ratio = maxAbsNet > 0 ? Math.abs(d.net) / maxAbsNet : 0;
              const height = 14 + ratio * 72;
              const isPositive = d.net >= 0;

              return (
                <div
                  key={d.label + d.weekday}
                  className="flex min-w-0 flex-1 flex-col items-center gap-1"
                >
                  <div className="flex h-full w-full items-end justify-center rounded-full bg-muted/20">
                    <div
                      className={[
                        "rounded-full",
                        "w-2.5 sm:w-3",
                        isPositive ? "bg-emerald-500" : "bg-danger",
                      ].join(" ")}
                      style={{ height: `${height}%` }}
                      title={`${d.weekday} ${d.label}: ${inr(d.net)}`}
                    />
                  </div>

                  {/* Make labels compact on mobile */}
                  <div className="text-[9px] text-muted sm:text-[10px]">
                    <span className="font-medium text-foreground">
                      {d.weekday.slice(0, 2)}
                    </span>{" "}
                    <span className="hidden sm:inline">{d.label}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="mt-2 flex flex-wrap justify-center gap-4 text-[10px] text-muted">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              Profit
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-danger" />
              Loss
            </span>
          </div>
        </div>
      )}
    </section>
  );
}