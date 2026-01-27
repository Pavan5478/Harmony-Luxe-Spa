// src/lib/totals.ts
import type { BillLine } from "@/types/billing";

type Args = {
  lines: BillLine[];
  discountFlat: number; // ₹
  discountPct: number; // %
  gstRate: number; // 0..1 (e.g. 0.18)
  interState: boolean; // true => IGST, false => CGST+SGST
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

/**
 * Convert rupees to paise (integer).
 * We use Math.round here only for the conversion boundary, not for arithmetic.
 */
function toPaise(rupees: number): number {
  const n = Number(rupees) || 0;
  return Math.round(n * 100);
}

function fromPaise(paise: number): number {
  return paise / 100;
}

/**
 * Multiply paise by a rate (e.g. 0.18) and round to nearest paise.
 * This keeps tax math stable and avoids float accumulation.
 */
function mulRatePaise(basePaise: number, rate: number): number {
  const r = Number(rate) || 0;
  return Math.round(basePaise * r);
}

/**
 * Multiply paise by percentage (0..100) and round to nearest paise.
 */
function pctOfPaise(basePaise: number, pct: number): number {
  const p = Number(pct) || 0;
  return Math.round(basePaise * (p / 100));
}

export function computeTotals({
  lines,
  discountFlat,
  discountPct,
  gstRate,
  interState,
}: Args): BillTotals {
  // 1) Subtotal in paise
  const subtotalPaise = lines.reduce((sum, l) => {
    const ratePaise = toPaise(Number(l.rate) || 0);
    const qty = Number(l.qty) || 0;

    // qty may be decimal; handle safely
    // ratePaise (int) * qty (float) -> round back to paise
    const linePaise = Math.round(ratePaise * qty);

    return sum + linePaise;
  }, 0);

  // 2) Discount in paise (flat + % of subtotal)
  const flatDiscountPaise = toPaise(discountFlat);
  const pctDiscountPaise = pctOfPaise(subtotalPaise, discountPct);
  let discountPaise = flatDiscountPaise + pctDiscountPaise;

  // Cap discount to subtotal, never negative
  if (discountPaise < 0) discountPaise = 0;
  if (discountPaise > subtotalPaise) discountPaise = subtotalPaise;

  // 3) Taxable base
  const taxableBasePaise = Math.max(subtotalPaise - discountPaise, 0);

  // 4) Taxes (each component rounded to paise)
  let cgstPaise = 0;
  let sgstPaise = 0;
  let igstPaise = 0;

  if ((Number(gstRate) || 0) > 0 && taxableBasePaise > 0) {
    if (interState) {
      igstPaise = mulRatePaise(taxableBasePaise, gstRate);
    } else {
      const half = (Number(gstRate) || 0) / 2;
      cgstPaise = mulRatePaise(taxableBasePaise, half);
      sgstPaise = mulRatePaise(taxableBasePaise, half);

      // Safety: ensure CGST+SGST equals total GST after rounding.
      // This avoids 1 paise mismatch in some edge cases.
      const totalGstPaise = mulRatePaise(taxableBasePaise, gstRate);
      const diff = totalGstPaise - (cgstPaise + sgstPaise);
      if (diff !== 0) {
        // adjust SGST by diff (could be +1 or -1)
        sgstPaise += diff;
      }
    }
  }

  const taxTotalPaise = cgstPaise + sgstPaise + igstPaise;

  // 5) Grand total in paise is exact integer math
  const rawTotalPaise = taxableBasePaise + taxTotalPaise;

  // Keep grandTotal as 2 decimals always; paise already is that.
  const grandTotalPaise = rawTotalPaise;

  // roundOff: difference between displayed grand total and raw (here it will be 0)
  // If later you add "round to nearest rupee", update here.
  const roundOffPaise = grandTotalPaise - rawTotalPaise;

  return {
    subtotal: fromPaise(subtotalPaise),
    discount: fromPaise(discountPaise),
    taxableBase: fromPaise(taxableBasePaise),
    cgst: fromPaise(cgstPaise) || 0,
    sgst: fromPaise(sgstPaise) || 0,
    igst: fromPaise(igstPaise) || 0,
    roundOff: fromPaise(roundOffPaise),
    grandTotal: fromPaise(grandTotalPaise),
  };
}
