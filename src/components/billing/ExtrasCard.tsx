// src/components/billing/ExtrasCard.tsx
"use client";

import { useMemo, useState } from "react";

const DEFAULT_GST = 0.00; // 5%

type Discount = { flat: number; pct: number };

type Props = {
  discount: Discount;
  onDiscountChange: (v: Discount) => void;
  gstRate: number;
  onGstRateChange: (v: number) => void;
  interState: boolean;
  onInterStateChange: (v: boolean) => void;
  notes: string;
  onNotesChange: (v: string) => void;
  /** Optional extra classes so parent can make this flat inside a bigger card */
  className?: string;
};

export default function ExtrasCard({
  discount,
  onDiscountChange,
  gstRate,
  onGstRateChange,
  interState,
  onInterStateChange,
  notes,
  onNotesChange,
  className,
}: Props) {
  const hasCustomGst = Math.abs(gstRate - DEFAULT_GST) > 0.0001;
  const hasDiscount = !!discount.flat || !!discount.pct;
  const hasNotes = !!notes.trim();
  const hasAnyExtras = hasCustomGst || hasDiscount || hasNotes || interState;

  const [open, setOpen] = useState(() => hasAnyExtras);

  const summary = useMemo(() => {
    const parts: string[] = [];

    parts.push(`GST ${Number((gstRate * 100).toFixed(2))}%`);
    parts.push(interState ? "IGST" : "CGST+SGST");

    if (hasDiscount) {
      const bits: string[] = [];
      if (discount.flat) bits.push(`₹${discount.flat}`);
      if (discount.pct) bits.push(`${discount.pct}%`);
      parts.push(`Discount ${bits.join(" + ")}`);
    } else {
      parts.push("No discount");
    }

    parts.push(hasNotes ? "Notes added" : "No notes");
    return parts.join(" • ");
  }, [gstRate, interState, hasDiscount, discount.flat, discount.pct, hasNotes]);

  const base =
    "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5";
  const classes = [base, className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Discount, tax &amp; notes
          </h2>
          <p className="mt-1 text-[11px] text-muted">
            Optional advanced settings. For a quick bill you can usually leave
            these as they are.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="max-w-xs truncate rounded-full bg-background px-2.5 py-0.5 text-[10px] text-muted">
            {summary}
          </span>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-card"
          >
            {open ? (
              <>
                <span className="mr-1 text-xs">▴</span> Hide
              </>
            ) : (
              <>
                <span className="mr-1 text-xs">▾</span> Edit
              </>
            )}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-3 space-y-4">
          {/* Discount */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                Discount (optional)
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Flat (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={discount.flat || ""}
                  onChange={(e) =>
                    onDiscountChange({
                      ...discount,
                      flat: Number(e.target.value || 0),
                    })
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
                  step={0.1}
                  value={discount.pct || ""}
                  onChange={(e) =>
                    onDiscountChange({
                      ...discount,
                      pct: Number(e.target.value || 0),
                    })
                  }
                  placeholder="e.g. 10"
                  className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
            </div>
            <p className="mt-1 text-[11px] text-muted">
              You can use flat + percent together; the system never lets
              discount go above the subtotal.
            </p>
          </div>

          {/* Tax */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                Tax &amp; place of supply
              </span>
            </div>
            <div className="grid items-center gap-3 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  GST % (0, 5, 12, 18, 28 or custom)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={(gstRate * 100).toString()}
                  onChange={(e) =>
                    onGstRateChange(
                      Math.max(0, Number(e.target.value || 0)) / 100
                    )
                  }
                  className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </div>
              <label className="mt-4 flex items-center gap-2 text-xs text-foreground md:col-span-2 md:mt-7">
                <input
                  type="checkbox"
                  checked={interState}
                  onChange={(e) => onInterStateChange(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-primary"
                />
                Inter-state supply (use IGST)
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-foreground">
                Notes (optional)
              </span>
            </div>
            <textarea
              placeholder="Bill notes, therapist name, room number, special instructions…"
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              className="mt-1 min-h-[70px] w-full rounded-2xl border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <p className="mt-1 text-[11px] text-muted">
              These notes print at the bottom of the invoice only.
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
