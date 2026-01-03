// src/components/reports/report-utils.ts
export type BillStatus = "FINAL" | "DRAFT" | "VOID" | string;

export type BillSummary = {
  id: string;
  billNo?: string;
  status: BillStatus;
  dateISO: string;
  date: Date;
  grandTotal: number;
  customerName: string;
  customerPhone: string;
  paymentMode: string;
};

export type ExpenseSummary = {
  id: string;
  dateISO: string;
  date: Date;
  amount: number;
  category: string;
  description: string;
  paymentMode: string;
};

export type DaySummary = {
  dateKey: string; // YYYY-MM-DD
  date: Date;
  revenue: number;
  expenses: number;
  profit: number;
  invoiceCount: number;
  expenseCount: number;
};

export function getLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function ymd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function parseBills(initialBills: any[]): BillSummary[] {
  const out: BillSummary[] = [];

  for (const b of initialBills || []) {
    const rawDate = (b as any).billDate || (b as any).finalizedAt || (b as any).createdAt;
    const dateISO = String(rawDate ?? "");
    const ts = Date.parse(dateISO);
    if (!Number.isFinite(ts)) continue;

    const totals = ((b as any).totals || {}) as any;
    const grandTotal =
      Number((b as any).grandTotal ?? totals.grandTotal ?? totals.total ?? 0) || 0;

    const status = ((b as any).status || "DRAFT") as BillStatus;

    const customer = (b as any).customer || {};
    const customerName =
      (customer.name as string | undefined) ||
      ((b as any).customerName as string | undefined) ||
      "";
    const customerPhone =
      (customer.phone as string | undefined) ||
      ((b as any).customerPhone as string | undefined) ||
      "";

    const paymentMode = String((b as any).paymentMode || "").toUpperCase();
    const billNo = (b as any).billNo as string | undefined;
    const id = (billNo && String(billNo)) || ((b as any).id && String((b as any).id)) || "";

    if (!id && !billNo) continue;

    out.push({
      id: id || billNo || "",
      billNo,
      status,
      dateISO,
      date: new Date(dateISO),
      grandTotal,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      paymentMode,
    });
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function parseExpenses(initialExpenses: any[]): ExpenseSummary[] {
  const out: ExpenseSummary[] = [];

  for (const e of initialExpenses || []) {
    const dateISO = String((e as any).dateISO ?? (e as any).DateISO ?? "") || "";
    if (!dateISO) continue;
    const ts = Date.parse(dateISO);
    if (!Number.isFinite(ts)) continue;

    const amount = Number((e as any).amount ?? (e as any).Amount ?? 0) || 0;
    if (!amount) continue;

    const category =
      ((e as any).category as string | undefined) ||
      ((e as any).Category as string | undefined) ||
      "Misc";
    const description =
      ((e as any).description as string | undefined) ||
      ((e as any).Description as string | undefined) ||
      "";
    const paymentMode = String((e as any).paymentMode ?? (e as any).PaymentMode ?? "OTHER").toUpperCase();

    const id =
      ((e as any).id && String((e as any).id)) ||
      ((e as any).Id && String((e as any).Id)) ||
      dateISO + "-" + amount.toFixed(2);

    out.push({
      id,
      dateISO,
      date: new Date(dateISO),
      amount,
      category,
      description,
      paymentMode,
    });
  }

  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function parseInclusiveRange(from: string, to: string) {
  const fromDate = from ? new Date(from + "T00:00:00") : null;
  const toDateExclusive = to ? new Date(to + "T00:00:00") : null;
  if (toDateExclusive) toDateExclusive.setDate(toDateExclusive.getDate() + 1);
  return { fromDate, toDateExclusive };
}

export function buildDailySummaries(bills: BillSummary[], expenses: ExpenseSummary[]): DaySummary[] {
  const map = new Map<string, DaySummary>();

  function ensure(key: string) {
    let row = map.get(key);
    if (!row) {
      const date = new Date(key + "T00:00:00");
      row = { dateKey: key, date, revenue: 0, expenses: 0, profit: 0, invoiceCount: 0, expenseCount: 0 };
      map.set(key, row);
    }
    return row;
  }

  for (const b of bills) {
    const key = getLocalDateKey(b.date);
    const row = ensure(key);
    row.revenue += b.grandTotal;
    row.invoiceCount += 1;
  }

  for (const e of expenses) {
    const key = getLocalDateKey(e.date);
    const row = ensure(key);
    row.expenses += e.amount;
    row.expenseCount += 1;
  }

  for (const row of map.values()) row.profit = row.revenue - row.expenses;

  return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function uniqueCustomersCount(bills: BillSummary[]) {
  const set = new Set<string>();
  for (const b of bills) {
    const id = b.customerPhone || b.customerName.toLowerCase() || b.id;
    if (id) set.add(id);
  }
  return set.size;
}

export function previousPeriod(from: string, to: string) {
  if (!from || !to) return null;
  const start = new Date(from + "T00:00:00");
  const end = new Date(to + "T00:00:00");
  if (!Number.isFinite(+start) || !Number.isFinite(+end)) return null;
  const lenDays = Math.floor((end.getTime() - start.getTime()) / (24 * 3600 * 1000)) + 1;
  if (lenDays <= 0) return null;

  const prevEnd = new Date(start);
  prevEnd.setDate(prevEnd.getDate() - 1);
  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (lenDays - 1));

  return { from: ymd(prevStart), to: ymd(prevEnd) };
}

export function pctChange(curr: number, prev: number) {
  if (!Number.isFinite(curr) || !Number.isFinite(prev)) return 0;
  if (prev === 0) return curr === 0 ? 0 : 100;
  return ((curr - prev) / Math.abs(prev)) * 100;
}
