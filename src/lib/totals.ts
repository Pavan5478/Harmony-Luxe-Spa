// src/lib/totals.ts
import type { BillLine } from "@/types/billing";

type Args = {
  lines: BillLine[];
  discountFlat: number; // ₹
  discountPct: number;  // %
  gstRate: number;      // 0..1  (e.g. 0.18)
  interState: boolean;  // true => IGST, false => CGST+SGST
};

export type BillTotals = {
  subtotal: number;
  discount: number;
  taxableBase: number;
  cgst?: number;
  sgst?: number;
  igst?: number;
  roundOff: number;
  grandTotal: number;
};

function r2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function computeTotals({
  lines,
  discountFlat,
  discountPct,
  gstRate,
  interState,
}: Args): BillTotals {
  // 1) Subtotal = sum of line amounts (rate * qty)
  const subtotal = lines.reduce(
    (sum, l) => sum + (Number(l.rate) || 0) * (Number(l.qty) || 0),
    0
  );

  // 2) Discount (flat + percentage on subtotal)
  let discount = (Number(discountFlat) || 0) +
    subtotal * ((Number(discountPct) || 0) / 100);

  if (discount > subtotal) discount = subtotal; // cap

  // 3) Taxable base = amount after discount (exclusive of GST)
  const taxableBase = Math.max(subtotal - discount, 0);

  let cgst = 0;
  let sgst = 0;
  let igst = 0;

  if (gstRate > 0 && taxableBase > 0) {
    if (interState) {
      // IGST on whole base
      igst = taxableBase * gstRate;
    } else {
      // CGST + SGST split equally
      const half = gstRate / 2;
      cgst = taxableBase * half;
      sgst = taxableBase * half;
    }
  }

  const taxTotal = cgst + sgst + igst;

  // 4) Raw total & round-off
  const rawTotal = taxableBase + taxTotal;
  const grandTotal = r2(rawTotal); // keep 2-decimal grand total
  const roundOff = r2(grandTotal - rawTotal);

  return {
    subtotal: r2(subtotal),
    discount: r2(discount),
    taxableBase: r2(taxableBase),
    cgst: r2(cgst) || 0,
    sgst: r2(sgst) || 0,
    igst: r2(igst) || 0,
    roundOff,
    grandTotal,
  };
}