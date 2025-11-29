// src/components/billing/DiscountCard.tsx
"use client";

export default function DiscountCard({
  value,
  onFlat,
  onPct,
}: {
  value: { flat: number; pct: number };
  onFlat: (n: number) => void;
  onPct: (n: number) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 text-sm font-semibold text-foreground sm:text-base">
        Discount (optional)
      </h2>
      <div className="grid gap-3 md:grid-cols-2">
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Flat (₹)
          </label>
          <input
            type="number"
            min={0}
            value={value.flat || ""}
            onChange={(e) =>
              onFlat(Number(e.target.value || 0))
            }
            placeholder="e.g. 500"
            className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Percentage (%)
          </label>
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            value={value.pct || ""}
            onChange={(e) =>
              onPct(Number(e.target.value || 0))
            }
            placeholder="e.g. 10"
            className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">
        You can use either or both; the system automatically caps the
        discount to the subtotal.
      </p>
    </section>
  );
}