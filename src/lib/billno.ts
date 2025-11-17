// src/lib/billno.ts
import { readRows } from "@/lib/sheets";

/**
 * FY helper: returns "YYYY-YY" with FY as Apr–Mar.
 * e.g. 11 Nov 2025 -> "2025-26"
 */
function fiscalYearString(d = new Date()) {
  const y = d.getFullYear();
  const m = d.getMonth(); // 0=Jan ... 3=Apr
  const start = m >= 3 ? y : y - 1;
  const end2 = ((start + 1) % 100).toString().padStart(2, "0");
  return `${start}-${end2}`;
}

/** Find the max serial used in a given FY from the Invoices sheet. */
async function maxSerialForFY(fy: string) {
  const rows = await readRows("Invoices!A2:A"); // only BillNo column
  const re = /^(\d{4}-\d{2})\/(\d{6})$/;
  let max = 0;

  for (const r of rows) {
    const bn = String(r[0] || "");
    const m = re.exec(bn);
    if (!m || m[1] !== fy) continue;
    const n = Number(m[2]) || 0;
    if (n > max) max = n;
  }
  return max;
}

// --- internal state ---
let finYearOverride: string | null = null;
let finYearCache: string | null = null;
let seq = 0; // last issued serial in finYearCache

async function ensureSync(date = new Date()) {
  const fy = finYearOverride ?? fiscalYearString(date);

  if (finYearCache !== fy) {
    finYearCache = fy;
    seq = await maxSerialForFY(fy);
  } else {
    const maxNow = await maxSerialForFY(fy);
    if (seq < maxNow) seq = maxNow;
  }
}

/** Generate the next bill number like "2025-26/000123". */
export async function nextBillNo(date = new Date()) {
  if (!finYearOverride) {
    const fyNow = fiscalYearString(date);
    if (finYearCache !== fyNow) {
      finYearCache = fyNow;
      seq = await maxSerialForFY(fyNow);
    }
  }
  await ensureSync(date);
  seq += 1;
  return `${finYearCache}/${String(seq).padStart(6, "0")}`;
}

/** Manually set the FY (rare). Also re-syncs seq from existing bills for that FY. */
export async function setFinYear(v: string) {
  finYearOverride = v;
  finYearCache = v;
  seq = await maxSerialForFY(v);
}

/** Manually set the next serial (1-based). */
export async function setNextSeq(startAt: number) {
  await ensureSync();
  seq = Math.max(0, startAt - 1);
}

/** Reset to current FY and recompute from existing bills. */
export async function resetCounter() {
  finYearOverride = null;
  finYearCache = fiscalYearString();
  seq = await maxSerialForFY(finYearCache);
}

/** Introspect the next number that will be issued. */
export async function getCounter() {
  await ensureSync();
  return { finYear: finYearCache!, next: seq + 1 };
}