// src/lib/billno.ts
import { loadBillsFromSheet } from "./sheets";

/**
 * Compute current financial year string, e.g. "2025-26".
 * Assumes FY starts in April.
 */
function getFinancialYear(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  if (month >= 3) {
    // April or later
    const next = String((year + 1) % 100).padStart(2, "0");
    return `${year}-${next}`;
  }
  // Jan–Mar belongs to previous FY
  const prev = year - 1;
  const next = String(year % 100).padStart(2, "0");
  return `${prev}-${next}`;
}

/**
 * Generate next bill number using:
 *   {FY}/{6-digit sequence}
 * Example:
 *   2025-26/000123
 */
export async function nextBillNo(): Promise<string> {
  const fy = getFinancialYear();
  const prefix = `${fy}/`;

  const bills = await loadBillsFromSheet();
  let maxSeq = 0;

  for (const b of bills) {
    const billNo = String(b.billNo || "").trim();
    if (!billNo.startsWith(prefix)) continue;

    const tail = billNo.slice(prefix.length);
    const n = parseInt(tail, 10);
    if (!Number.isNaN(n) && n > maxSeq) {
      maxSeq = n;
    }
  }

  const nextSeq = maxSeq + 1;
  const padded = String(nextSeq).padStart(6, "0");
  return `${prefix}${padded}`;
}