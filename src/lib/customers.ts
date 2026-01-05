// src/lib/customers.ts
import { loadCustomersFromSheet, loadInvoiceRowsFromSheet } from "@/lib/sheets";

export type CustomerKey = string;

export type CustomerInvoiceRow = {
  /** Invoice key used in URL: billNo or draft id */
  invoiceKey: string;
  billNo?: string;
  draftId?: string;
  status: "DRAFT" | "FINAL" | "VOID";
  dateISO: string;
  ts: number;
  amount: number;
  cashier: string;
};

export type CustomerSummary = {
  key: CustomerKey;
  name: string;
  phone: string;
  email: string;
  firstSeenISO?: string;
  lastDateISO: string;
  lastTs: number;
  invoicesCount: number;
  finalCount: number;
  draftCount: number;
  voidCount: number;
  totalFinal: number;
};

function onlyDigits(s: string) {
  return String(s || "").replace(/\D+/g, "");
}

/**
 * Normalizes an Indian phone number into 10 digits (best-effort).
 * - "98765 43210" -> "9876543210"
 * - "+91 9876543210" -> "9876543210"
 */
export function normalizePhone(phone: string): string {
  const d = onlyDigits(phone);
  if (d.length === 10) return d;
  if (d.length > 10) return d.slice(-10);
  return d;
}

export function makeCustomerKey(phone: string, email: string): CustomerKey | null {
  const p = normalizePhone(phone);
  if (p) return p;
  const e = String(email || "").trim().toLowerCase();
  return e || null;
}

function parseISO(d?: string) {
  if (!d) return NaN;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : NaN;
}

export type ListCustomersOpts = {
  q?: string;
  fromISO?: string;
  toISO?: string;
  status?: "FINAL" | "DRAFT" | "VOID" | "ALL";
};

/**
 * Fast customer list from Customers sheet.
 * (This is updated whenever an invoice is saved.)
 */
export async function listCustomers(opts: ListCustomersOpts = {}) {
  const q = String(opts.q || "").trim().toLowerCase();
  const status = (opts.status || "ALL") as NonNullable<ListCustomersOpts["status"]>;
  const fromTs = parseISO(opts.fromISO) || Number.NEGATIVE_INFINITY;
  const toTs = (parseISO(opts.toISO) || Number.POSITIVE_INFINITY) + 24 * 3600 * 1000;

  const rows = await loadCustomersFromSheet();
  const out: CustomerSummary[] = [];

  for (const r of rows) {
    const key = String(r?.[0] ?? "").trim();
    if (!key) continue;

    const name = String(r?.[1] ?? "").trim();
    const phone = String(r?.[2] ?? "").trim();
    const email = String(r?.[3] ?? "").trim();
    const firstSeenISO = String(r?.[4] ?? "").trim();
    const lastDateISO = String(r?.[5] ?? "").trim();
    const lastTs = parseISO(lastDateISO);

    if (Number.isFinite(lastTs)) {
      if (!(lastTs >= fromTs && lastTs < toTs)) continue;
    }

    const invoicesCount = Number(r?.[6] ?? 0) || 0;
    const finalCount = Number(r?.[7] ?? 0) || 0;
    const draftCount = Number(r?.[8] ?? 0) || 0;
    const voidCount = Number(r?.[9] ?? 0) || 0;
    const totalFinal = Number(r?.[10] ?? 0) || 0;

    if (status === "FINAL" && finalCount <= 0) continue;
    if (status === "DRAFT" && draftCount <= 0) continue;
    if (status === "VOID" && voidCount <= 0) continue;

    const summary: CustomerSummary = {
      key,
      name,
      phone,
      email,
      firstSeenISO: firstSeenISO || undefined,
      lastDateISO,
      lastTs: Number.isFinite(lastTs) ? lastTs : 0,
      invoicesCount,
      finalCount,
      draftCount,
      voidCount,
      totalFinal,
    };

    if (q) {
      const hay = `${summary.name} ${summary.phone} ${summary.email} ${summary.key}`
        .toLowerCase()
        .trim();
      if (!hay.includes(q)) continue;
    }

    out.push(summary);
  }

  out.sort((a, b) => b.lastTs - a.lastTs);
  return out;
}

export type GetCustomerResult = {
  customer: CustomerSummary;
  invoices: CustomerInvoiceRow[];
};

export async function getCustomerByKey(
  key: CustomerKey,
  opts: Omit<ListCustomersOpts, "q"> = {},
): Promise<GetCustomerResult | null> {
  const wanted = String(key || "").trim();
  if (!wanted) return null;

  const status = (opts.status || "ALL") as NonNullable<ListCustomersOpts["status"]>;
  const fromTs = parseISO(opts.fromISO) || Number.NEGATIVE_INFINITY;
  const toTs = (parseISO(opts.toISO) || Number.POSITIVE_INFINITY) + 24 * 3600 * 1000;

  const rows = await loadInvoiceRowsFromSheet();

  const invoices: CustomerInvoiceRow[] = [];

  let bestName = "";
  let bestPhone = "";
  let bestEmail = "";
  let lastTs = 0;
  let lastDateISO = "";

  for (const r of rows) {
    const billNo = String(r?.[0] ?? "").trim();
    const draftId = String(r?.[1] ?? "").trim();
    const dateISO = String(r?.[2] ?? "").trim();
    const name = String(r?.[3] ?? "").trim();
    const phone = String(r?.[4] ?? "").trim();
    const email = String(r?.[5] ?? "").trim();
    const st = String(r?.[22] ?? "FINAL").trim().toUpperCase() as any;

    if (status !== "ALL" && st !== status) continue;

    const custKey = makeCustomerKey(phone, email);
    if (!custKey || custKey !== wanted) continue;

    const ts = parseISO(dateISO);
    if (!Number.isFinite(ts)) continue;
    if (!(ts >= fromTs && ts < toTs)) continue;

    const invoiceKey = billNo || draftId;
    if (!invoiceKey) continue;

    const amount = Number(r?.[15] ?? 0) || 0;
    const cashier = String(r?.[21] ?? "").trim();

    invoices.push({
      invoiceKey,
      billNo: billNo || undefined,
      draftId: draftId || undefined,
      status: st,
      dateISO,
      ts,
      amount,
      cashier,
    });

    if (ts >= lastTs) {
      lastTs = ts;
      lastDateISO = dateISO;
      if (name) bestName = name;
      if (phone) bestPhone = phone;
      if (email) bestEmail = email;
    }
  }

  if (!invoices.length) return null;

  invoices.sort((a, b) => b.ts - a.ts);

  const customer: CustomerSummary = {
    key: wanted,
    name: bestName,
    phone: bestPhone,
    email: bestEmail,
    lastTs,
    lastDateISO,
    invoicesCount: invoices.length,
    finalCount: invoices.filter((x) => x.status === "FINAL").length,
    draftCount: invoices.filter((x) => x.status === "DRAFT").length,
    voidCount: invoices.filter((x) => x.status === "VOID").length,
    totalFinal: invoices
      .filter((x) => x.status === "FINAL")
      .reduce((s, x) => s + (Number(x.amount) || 0), 0),
  };

  return { customer, invoices };
}
