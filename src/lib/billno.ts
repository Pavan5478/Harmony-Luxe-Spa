// src/lib/billno.ts
import { allocateNextBillSeq, readRows } from "./sheets";

/**
 * Compute current financial year string, e.g. "2025-26".
 * Assumes FY starts in April.
 */
function getFinancialYear(date = new Date()): string {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  if (month >= 3) {
    const next = String((year + 1) % 100).padStart(2, "0");
    return `${year}-${next}`;
  }
  const prev = year - 1;
  const next = String(year % 100).padStart(2, "0");
  return `${prev}-${next}`;
}

/**
 * Generate next bill number using:
 *   {FY}/{6-digit sequence}
 * Example:
 *   2025-26/000123
 *
 * ✅ FAST: allocates from BillCounter (no invoice column scan)
 */
export async function nextBillNo(): Promise<string> {
  const fy = getFinancialYear();
  const prefix = `${fy}/`;

  // Fast path: allocate from BillCounter sheet (O(1) read/write).
  try {
    const seq = await allocateNextBillSeq(fy);
    const padded = String(seq).padStart(6, "0");
    return `${prefix}${padded}`;
  } catch {
    // Fallback (migration/edge): scan bill numbers column.
    const colA = await readRows("Invoices!A2:A");
    let maxSeq = 0;
    for (const r of colA) {
      const billNo = String(r?.[0] || "").trim();
      if (!billNo.startsWith(prefix)) continue;
      const tail = billNo.slice(prefix.length);
      const n = parseInt(tail, 10);
      if (!Number.isNaN(n) && n > maxSeq) maxSeq = n;
    }
    const nextSeq = maxSeq + 1;
    const padded = String(nextSeq).padStart(6, "0");
    return `${prefix}${padded}`;
  }
}

// ─────────────────────────────────────────────
// Admin counter helpers (kept as-is)
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
  __bbCounterCache = null;
  await ensureCounter();
}