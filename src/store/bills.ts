// src/store/bills.ts
import type { BillDraft, BillFinal } from "@/types/billing";
import { nextBillNo } from "@/lib/billno";
import {
  loadBillsFromSheet,
  loadBillFromSheetByKey,
  saveBillToSheet,
} from "@/lib/sheets";

type AnyBill = BillDraft | BillFinal;

// ─────────────────────────────
// Cache (list + single)
// ─────────────────────────────
const LIST_CACHE_MS = 20_000;
let listCache: { data: AnyBill[]; ts: number } | null = null;

const SINGLE_CACHE_MS = 20_000;
const singleCache = new Map<string, { bill: AnyBill; ts: number }>();

function invalidateCache() {
  listCache = null;
  singleCache.clear();
}

async function loadAll(): Promise<AnyBill[]> {
  const now = Date.now();
  if (listCache && now - listCache.ts < LIST_CACHE_MS) return listCache.data;

  const rows = await loadBillsFromSheet();
  const data = rows as AnyBill[];
  listCache = { data, ts: now };
  return data;
}

function newDraftId(): string {
  // fast, no-sheet-scan id
  const t = Date.now().toString(36).toUpperCase();
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `D${t}${r}`;
}

// ─────────────────────────────
// Public API
// ─────────────────────────────

export async function listBills(status?: "DRAFT" | "FINAL" | "VOID"): Promise<AnyBill[]> {
  const all = await loadAll();
  if (!status) return all;
  return all.filter((b: any) => b.status === status);
}

export async function getBill(idOrNo: string): Promise<AnyBill | undefined> {
  const k = String(idOrNo || "").trim();
  if (!k) return undefined;

  const now = Date.now();
  const cached = singleCache.get(k);
  if (cached && now - cached.ts < SINGLE_CACHE_MS) return cached.bill;

  // FAST: 1-row fetch via InvoiceIndex
  const b = (await loadBillFromSheetByKey(k)) as AnyBill | undefined;
  if (!b) return undefined;

  singleCache.set(k, { bill: b, ts: now });
  const id = String((b as any).id || "").trim();
  const billNo = String((b as any).billNo || "").trim();
  if (id) singleCache.set(id, { bill: b, ts: now });
  if (billNo) singleCache.set(billNo, { bill: b, ts: now });

  return b;
}

// Create draft (status=DRAFT, stored directly in Sheets)
export async function createDraft(
  d: Omit<BillDraft, "id" | "status" | "createdAt">
): Promise<BillDraft> {
  const id = newDraftId();

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
export async function finalizeDraft(id: string, cashierEmail: string): Promise<BillFinal> {
  const existing = await getBill(id);
  const base = existing as any;

  if (!base || base.status !== "DRAFT" || String(base.id || "").trim() !== String(id || "").trim()) {
    throw new Error("Draft not found");
  }

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

// Replace (update) a bill by id OR billNo (works for DRAFT only from API)
export async function updateBill(
  idOrNo: string,
  patch: Partial<BillFinal | BillDraft>
): Promise<AnyBill> {
  const existing = await getBill(idOrNo);
  if (!existing) throw new Error("Bill not found");

  const original = existing as any;

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
export async function markPrinted(idOrNo: string): Promise<AnyBill> {
  const existing = await getBill(idOrNo);
  if (!existing) throw new Error("Bill not found");

  const updated: any = {
    ...(existing as any),
    printedAt: new Date().toISOString(),
  };

  await saveBillToSheet(updated);
  invalidateCache();
  return updated as AnyBill;
}

// Soft delete: mark VOID in sheet.
export async function voidBill(idOrNo: string): Promise<AnyBill> {
  const existing = await getBill(idOrNo);
  if (!existing) throw new Error("Bill not found");

  const updated: any = {
    ...(existing as any),
    status: "VOID",
  };

  await saveBillToSheet(updated);
  invalidateCache();
  return updated as AnyBill;
}

// DEV helper – kept so old imports don't break
export function clearBills() {
  invalidateCache();
}