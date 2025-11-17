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
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Last 7 days revenue
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Finalized invoices only. Each bar shows total grand amount per day.
          </p>
        </div>
        <div className="text-right text-[11px] text-muted sm:text-xs">
          <div className="font-semibold text-foreground">
            {inr(weekTotal)}
          </div>
          <div>Last 7 days</div>
        </div>
      </div>

      {/* Mini bar chart */}
      <div className="mt-4 flex h-32 items-end gap-2">
        {last7.map((d) => {
          const baseHeight =
            maxDayTotal > 0 ? (d.total / maxDayTotal) * 60 : 0;
          const heightPct = 20 + baseHeight; // 20–80%

          return (
            <div
              key={d.label}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-full w-full items-end">
                <div className="relative w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="w-full rounded-full bg-primary/25"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="h-full w-full rounded-full bg-primary/80" />
                  </div>
                </div>
              </div>
              <div className="mt-1 text-[10px] leading-tight text-muted">
                <div>{d.weekday}</div>
                <div className="font-medium text-foreground">
                  {d.total > 0 ? `₹${d.total.toFixed(0)}` : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Payment mix */}
      {paymentMix.length > 0 && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span>Payment mix (this month)</span>
            <span className="font-medium text-foreground">
              {inr(pmTotalAmount)}
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-slate-100">
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
              const pct =
                pmTotalAmount > 0
                  ? (pmTotals[pm.key] / pmTotalAmount) * 100
                  : 0;
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