// src/components/dashboard/ChartsRow.tsx
import { inr } from "@/lib/format";

type Last7 = { label: string; weekday: string; total: number };

type PaymentMixItem = {
  key: string;
  label: string;
  color: string; // Tailwind bg- class
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
  // digital share (card + upi + split)
  const digitalTotal =
    (pmTotals.CARD ?? 0) + (pmTotals.UPI ?? 0) + (pmTotals.SPLIT ?? 0);
  const digitalShare =
    pmTotalAmount > 0 ? (digitalTotal / pmTotalAmount) * 100 : 0;

  return (
    <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)]">
      {/* Revenue trend card */}
      <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
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
        <div className="mt-3 flex h-24 items-end gap-2 sm:h-28">
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

      {/* Payment mix card */}
      <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
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

        {paymentMix.length === 0 || pmTotalAmount <= 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 px-3 py-3 text-[11px] text-muted">
            No finalized invoices for this month yet. Once you start
            billing, payment mix will appear here.
          </div>
        ) : (
          <>
            {/* Stacked bar */}
            <div className="mt-4">
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/20">
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
              <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
                <span>
                  Modes:{" "}
                  <span className="font-medium text-foreground">
                    {paymentMix.map((p) => p.label).join(" • ")}
                  </span>
                </span>
                <span>
                  Digital share:{" "}
                  <span className="font-medium text-foreground">
                    {digitalShare.toFixed(0)}%
                  </span>
                </span>
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
                    className="flex items-center justify-between rounded-xl bg-background/60 px-2.5 py-1.5"
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