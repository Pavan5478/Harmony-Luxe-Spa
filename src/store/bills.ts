// src/store/bills.ts
import type { BillDraft, BillFinal } from "@/types/billing";
import { nextBillNo } from "@/lib/billno";
import { loadBillsFromSheet, saveBillToSheet } from "@/lib/sheets";

type AnyBill = BillDraft | BillFinal;

// ─────────────────────────────
// Tiny in-memory cache (per server instance)
// ─────────────────────────────

const CACHE_MS = 10_000; // 10 seconds of reuse is enough for 1–user usage

let billsCache:
  | {
      data: AnyBill[];
      ts: number;
    }
  | null = null;

function invalidateCache() {
  billsCache = null;
}

async function loadAll(): Promise<AnyBill[]> {
  const now = Date.now();
  if (billsCache && now - billsCache.ts < CACHE_MS) {
    return billsCache.data;
  }

  const rows = await loadBillsFromSheet();
  const data = rows as AnyBill[];
  billsCache = { data, ts: now };
  return data;
}

function findIndex(all: AnyBill[], idOrNo: string): number {
  return all.findIndex(
    (b: any) => b.id === idOrNo || b.billNo === idOrNo
  );
}

// Generate draft ids like D1, D2, ...
function nextDraftId(all: AnyBill[]): string {
  let max = 0;
  for (const b of all as any[]) {
    const id = String(b.id || "");
    if (id.startsWith("D")) {
      const n = parseInt(id.slice(1), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  return "D" + (max + 1);
}

// ─────────────────────────────
// Public API
// ─────────────────────────────

export async function listBills(
  status?: "DRAFT" | "FINAL" | "VOID"
): Promise<AnyBill[]> {
  const all = await loadAll();
  if (!status) return all;
  return all.filter((b: any) => b.status === status);
}

export async function getBill(
  idOrNo: string
): Promise<AnyBill | undefined> {
  const all = await loadAll();
  const ix = findIndex(all, idOrNo);
  return ix === -1 ? undefined : all[ix];
}

// Create draft (status=DRAFT, stored directly in Sheets)
export async function createDraft(
  d: Omit<BillDraft, "id" | "status" | "createdAt">
): Promise<BillDraft> {
  const all = await loadAll();
  const id = nextDraftId(all);

  const draft: BillDraft = {
    ...(d as any),
    id,
    status: "DRAFT",
    createdAt: new Date().toISOString(),
  };

  await saveBillToSheet(draft);
  invalidateCache();
  return draft;
}

// Finalize draft -> FINAL bill (adds BillNo, finalizedAt, cashierEmail)
export async function finalizeDraft(
  id: string,
  cashierEmail: string
): Promise<BillFinal> {
  const all = await loadAll();

  const ix = all.findIndex(
    (b: any) => b.id === id && b.status === "DRAFT"
  );
  if (ix === -1) {
    throw new Error("Draft not found");
  }

  const base = all[ix] as any;
  const billNo = await nextBillNo();

  const fin: BillFinal = {
    ...base,
    status: "FINAL",
    billNo,
    cashierEmail,
    finalizedAt: new Date().toISOString(),
  };

  await saveBillToSheet(fin);
  invalidateCache();
  return fin;
}

// Replace (update) a bill by id OR billNo (works for DRAFT & FINAL)
export async function updateBill(
  idOrNo: string,
  patch: Partial<BillFinal | BillDraft>
): Promise<AnyBill> {
  const all = await loadAll();
  const ix = findIndex(all, idOrNo);
  if (ix === -1) throw new Error("Bill not found");

  const original = all[ix] as any;

  // Fields we never let the client override
  const keep = {
    id: original.id,
    billNo: original.billNo,
    status: original.status,
    finalizedAt: original.finalizedAt,
    createdAt: original.createdAt,
    printedAt: original.printedAt,
  };

  const updated = { ...original, ...patch, ...keep } as AnyBill;
  await saveBillToSheet(updated);
  invalidateCache();
  return updated;
}

// Mark as printed (by id or billNo)
export async function markPrinted(
  idOrNo: string
): Promise<AnyBill> {
  const all = await loadAll();
  const ix = findIndex(all, idOrNo);
  if (ix === -1) throw new Error("Bill not found");

  const updated: any = {
    ...(all[ix] as any),
    printedAt: new Date().toISOString(),
  };

  await saveBillToSheet(updated);
  invalidateCache();
  return updated as AnyBill;
}

// Soft delete: mark VOID in sheet.
// Moving row to Deleted sheet is handled in API route (moveInvoiceToDeleted).
export async function voidBill(
  idOrNo: string
): Promise<AnyBill> {
  const all = await loadAll();
  const ix = findIndex(all, idOrNo);
  if (ix === -1) throw new Error("Bill not found");

  const updated: any = {
    ...(all[ix] as any),
    status: "VOID",
  };

  await saveBillToSheet(updated);
  invalidateCache();
  return updated as AnyBill;
}

// DEV helper – kept so old imports don't break
export function clearBills() {
  // no-op in Sheets-backed version
  invalidateCache();
}