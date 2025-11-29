// src/components/billing/TotalsCard.tsx
"use client";

import { inr } from "@/lib/format";

export default function TotalsCard({
  totals,
  interState,
  onInterState,
}: {
  totals: {
    subtotal: number;
    discount: number;
    taxableBase: number;
    cgst?: number;
    sgst?: number;
    igst?: number;
    roundOff: number;
    grandTotal: number;
  };
  interState: boolean;
  onInterState: (v: boolean) => void;
}) {
  const tax = (totals.igst || 0) + (totals.cgst || 0) + (totals.sgst || 0);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground sm:text-base">
          Totals
        </h2>
        <label className="flex items-center gap-2 text-[11px] text-foreground">
          <input
            type="checkbox"
            checked={interState}
            onChange={(e) => onInterState(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary"
          />
          Inter-state (IGST)
        </label>
      </div>

      <div className="grid gap-1 text-xs sm:text-sm">
        <Row label="Subtotal" value={inr(totals.subtotal)} />
        <Row label="Discount" value={inr(totals.discount)} />
        <Row label="Tax base" value={inr(totals.taxableBase)} />
        <Row
          label={interState ? "IGST" : "CGST + SGST"}
          value={inr(tax)}
        />
        <Row label="Round-off" value={inr(totals.roundOff)} />
        <div className="mt-1 flex items-center justify-between border-t border-border/70 pt-2 text-sm font-semibold">
          <span>Grand total</span>
          <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
            {inr(totals.grandTotal)}
          </span>
        </div>
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span>{value}</span>
    </div>
  );
}