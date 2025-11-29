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

// ─────────────────────────────────────────────
// Admin counter helpers (simple in-memory stub)
// These exist so /api/admin/reset & dev-reset can build.
// They do NOT affect how `nextBillNo` currently works.
// ─────────────────────────────────────────────

export type BillCounterState = {
  finYear: string; // e.g. "25-26"
  nextSeq: number; // next running number (1-based)
};

let __bbCounterCache: BillCounterState | null = null;

function deriveDefaultFinYear(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;

  // Indian FY: Apr–Mar
  let startYear = year;
  if (month < 4) startYear = year - 1;

  const endYear = startYear + 1;
  const yy = String(startYear).slice(-2);
  const ny = String(endYear).slice(-2);
  return `${yy}-${ny}`;
}

async function ensureCounter(): Promise<BillCounterState> {
  if (!__bbCounterCache) {
    __bbCounterCache = {
      finYear: deriveDefaultFinYear(),
      nextSeq: 1,
    };
  }
  return __bbCounterCache;
}

// Used by /api/admin/reset
export async function getCounter(): Promise<BillCounterState> {
  return ensureCounter();
}

export async function setFinYear(finYear: string): Promise<void> {
  const current = await ensureCounter();
  __bbCounterCache = { ...current, finYear };
}

export async function setNextSeq(nextSeq: number): Promise<void> {
  const current = await ensureCounter();
  __bbCounterCache = { ...current, nextSeq };
}

export async function resetCounter(): Promise<void> {
  // Reset to default FY & sequence 1
  __bbCounterCache = null;
  await ensureCounter();
}
