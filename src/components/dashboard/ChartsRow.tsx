// src/components/dashboard/ChartsRow.tsx
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
  value: number;
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

export default function ChartsRow({
  last7,
  maxDayTotal,
  weekTotal,
  paymentMix,
  paymentSegments,
  pmTotals,
  pmTotalAmount,
}: Props) {
  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.2fr)]">
      {/* Revenue trend card */}
      <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Revenue (last 7 days)
            </h2>
            <p className="mt-1 text-[11px] text-muted sm:text-xs">
              Finalized invoices only. Each bar shows total grand amount
              for that day.
            </p>
          </div>
          <div className="text-right text-[11px] text-muted sm:text-xs">
            <div className="text-sm font-semibold text-foreground">
              {inr(weekTotal)}
            </div>
            <div>Last 7 days</div>
          </div>
        </div>

        {/* Bars */}
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
      </div>

      {/* Payment mix card */}
      <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-foreground sm:text-base">
              Payment mix (this month)
            </h2>
            <p className="mt-1 text-[11px] text-muted sm:text-xs">
              Breakdown of finalized invoices by payment method.
            </p>
          </div>
          <div className="text-right text-[11px] text-muted sm:text-xs">
            <div className="text-sm font-semibold text-foreground">
              {inr(pmTotalAmount)}
            </div>
            <div>Total received</div>
          </div>
        </div>

        {paymentMix.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background px-3 py-3 text-[11px] text-muted">
            No finalized invoices for this month yet. Once you start
            billing, payment mix will appear here.
          </div>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="mt-4">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
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
            </div>

            {/* Legend */}
            <div className="mt-4 space-y-2 text-[11px] text-muted">
              {paymentMix.map((pm) => {
                const value = pmTotals[pm.key] || 0;
                const pct =
                  pmTotalAmount > 0 ? (value / pmTotalAmount) * 100 : 0;
                return (
                  <div
                    key={pm.key}
                    className="flex items-center justify-between rounded-xl bg-background px-2.5 py-1.5"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${pm.color}`}
                      />
                      <span className="font-medium text-foreground">
                        {pm.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-foreground">
                        {pct.toFixed(0)}%
                      </span>
                      <span>{inr(value)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </section>
  );
}