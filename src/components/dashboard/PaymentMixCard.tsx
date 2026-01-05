// src/components/dashboard/PaymentMixCard.tsx
import { inr } from "@/lib/format";

export default function PaymentMixCard({
  pmTotals,
  pmTotalAmount,
  monthLabel,
}: {
  pmTotals: Record<string, number>;
  pmTotalAmount: number;
  monthLabel: string;
}) {
  const items = [
    { key: "CASH", label: "Cash", cls: "bg-emerald-500" },
    { key: "CARD", label: "Card", cls: "bg-sky-500" },
    { key: "UPI", label: "UPI", cls: "bg-fuchsia-500" },
    { key: "SPLIT", label: "Split", cls: "bg-amber-500" },
    { key: "OTHER", label: "Other", cls: "bg-slate-400" },
  ].filter((x) => (pmTotals[x.key] || 0) > 0);

  const digitalTotal = (pmTotals.CARD || 0) + (pmTotals.UPI || 0) + (pmTotals.SPLIT || 0);
  const digitalShare = pmTotalAmount > 0 ? (digitalTotal / pmTotalAmount) * 100 : 0;

  let offset = 0;
  const segments = items.map((it) => {
    const value = pmTotals[it.key] || 0;
    const width = pmTotalAmount > 0 ? (value / pmTotalAmount) * 100 : 0;
    const seg = { ...it, value, width, left: offset };
    offset += width;
    return seg;
  });

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">Payment mix</h2>
          <p className="mt-1 text-[11px] text-muted">{monthLabel} • final only</p>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-foreground">{inr(pmTotalAmount)}</div>
          <div className="text-[11px] text-muted">received</div>
        </div>
      </div>

      {pmTotalAmount <= 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-background/40 px-3 py-3 text-[11px] text-muted">
          No finalized invoices yet this month.
        </div>
      ) : (
        <>
          <div className="mt-4">
            <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted/20">
              {segments.map((s) => (
                <div
                  key={s.key}
                  className={`absolute inset-y-0 ${s.cls}`}
                  style={{ left: `${s.left}%`, width: `${s.width}%` }}
                />
              ))}
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] text-muted">
              <span>
                Digital share{" "}
                <span className="font-medium text-foreground">{digitalShare.toFixed(0)}%</span>
              </span>
              <span className="font-medium text-foreground">
                {items.map((i) => i.label).join(" • ")}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2 text-[11px] text-muted">
            {items.map((it) => {
              const value = pmTotals[it.key] || 0;
              const pct = pmTotalAmount > 0 ? (value / pmTotalAmount) * 100 : 0;
              return (
                <div
                  key={it.key}
                  className="flex items-center justify-between rounded-xl bg-background/60 px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${it.cls}`} />
                    <span className="font-medium text-foreground">{it.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-foreground">{pct.toFixed(0)}%</span>
                    <span>{inr(value)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}