// src/components/dashboard/TrendsCard.tsx
import { inr } from "@/lib/format";

type Last7 = { label: string; weekday: string; total: number };

type PaymentMixItem = {
  key: string;
  label: string;
  color: string;
};

type PaymentSegment = {
  key: string;
  color: string;
  width: number;
  left: number;
};

type Props = {
  last7: Last7[];
  maxDayTotal: number;
  weekTotal: number;
  paymentMix: PaymentMixItem[];
  paymentSegments: PaymentSegment[];
  pmTotals: Record<string, number>;
  pmTotalAmount: number;
};

export default function TrendsCard({
  last7,
  maxDayTotal,
  weekTotal,
  paymentMix,
  paymentSegments,
  pmTotals,
  pmTotalAmount,
}: Props) {
  const daysCount = last7.length || 1;
  const avgPerDay = weekTotal / daysCount;

  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      {/* Header / summary */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted">
            Revenue overview
          </p>
          <div className="mt-1 flex flex-wrap items-baseline gap-2">
            <span className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {inr(weekTotal)}
            </span>
            <span className="text-[11px] text-muted">last 7 days</span>
          </div>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Finalized invoices only. Each bar shows total grand amount per day.
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-[11px] text-muted">
          <div className="flex items-baseline gap-3">
            <div className="text-right">
              <p className="text-[11px] text-muted">avg / day</p>
              <p className="text-xs font-semibold text-foreground">
                {inr(avgPerDay || 0)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-muted">best day</p>
              <p className="text-xs font-semibold text-foreground">
                {inr(maxDayTotal || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 7-day bar chart */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>Last 7 days</span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full bg-primary/80" />
            Daily total
          </span>
        </div>

        <div className="mt-2 flex h-24 items-end gap-2 sm:h-28">
          {last7.map((d) => {
            const ratio = maxDayTotal > 0 ? d.total / maxDayTotal : 0;
            const barHeight = Math.max(ratio * 100, d.total > 0 ? 18 : 0);

            return (
              <div
                key={d.label}
                className="flex flex-1 flex-col items-center gap-1"
              >
                <div className="flex h-full w-full items-end justify-center">
                  <div className="flex h-full w-5 items-end justify-center rounded-full bg-muted/15 sm:w-6">
                    <div
                      className="w-full rounded-full bg-primary"
                      style={{ height: `${barHeight}%` }}
                    />
                  </div>
                </div>
                <div className="mt-1 text-center text-[10px] leading-tight text-muted">
                  <div className="font-medium text-foreground">
                    {d.weekday.slice(0, 3)}
                  </div>
                  <div>
                    {d.total > 0 ? `₹${d.total.toFixed(0)}` : "—"}
                  </div>
                </div>
              </div>
            );
          })}

          {last7.length === 0 && (
            <div className="flex h-full w-full items-center justify-center text-[11px] text-muted">
              No revenue data for the last 7 days.
            </div>
          )}
        </div>
      </div>

      {/* Payment mix */}
      {paymentMix.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Payment mix (this month)</span>
            <span className="font-medium text-foreground">
              {inr(pmTotalAmount)}
            </span>
          </div>

          <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
            {paymentSegments.map((seg) => (
              <div
                key={seg.key}
                className={`absolute inset-y-0 ${seg.color}`}
                style={{
                  left: `${seg.left}%`,
                  width: `${seg.width}%`,
                }}
              />
            ))}
          </div>

          <div className="flex flex-wrap gap-2 text-[11px] text-muted">
            {paymentMix.map((pm) => {
              const total = pmTotals[pm.key] ?? 0;
              const pct =
                pmTotalAmount > 0 ? (total / pmTotalAmount) * 100 : 0;

              return (
                <span
                  key={pm.key}
                  className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${pm.color}`}
                  />
                  <span>{pm.label}</span>
                  <span className="font-medium text-foreground">
                    {pct.toFixed(0)}%
                  </span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}