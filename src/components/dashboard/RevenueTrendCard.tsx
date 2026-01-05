// src/components/dashboard/RevenueTrendCard.tsx
import { inr } from "@/lib/format";

export default function RevenueTrendCard({
  last14,
  maxDayTotal,
  total,
}: {
  last14: { key: string; label: string; weekday: string; total: number }[];
  maxDayTotal: number;
  total: number;
}) {
  const days = last14.length || 14;
  const avg = days > 0 ? total / days : 0;

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">Revenue trend</h2>
          <p className="mt-1 text-[11px] text-muted">Last 14 days • finalized invoices only</p>
        </div>

        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">{inr(total)}</div>
          <div className="text-[11px] text-muted">14-day total</div>
          <div className="text-[11px] text-muted">avg/day {inr(avg)}</div>
        </div>
      </div>

      {last14.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 px-3 py-3 text-[11px] text-muted">
          No revenue data yet.
        </div>
      ) : (
        <div className="mt-4 flex h-28 items-end gap-2">
          {last14.map((d) => {
            const ratio = maxDayTotal > 0 ? d.total / maxDayTotal : 0;
            const barHeight = Math.max(ratio * 100, d.total > 0 ? 16 : 0);

            return (
              <div key={d.key} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-full w-full items-end justify-center">
                  <div className="flex h-full w-5 items-end justify-center rounded-full bg-muted/15 sm:w-6">
                    <div
                      className="w-full rounded-full bg-primary"
                      style={{ height: `${barHeight}%` }}
                      title={`${d.weekday} ${d.label}: ${d.total > 0 ? inr(d.total) : "—"}`}
                    />
                  </div>
                </div>

                <div className="text-center text-[10px] leading-tight text-muted">
                  <div className="font-medium text-foreground">{d.weekday.slice(0, 2)}</div>
                  <div>{d.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}