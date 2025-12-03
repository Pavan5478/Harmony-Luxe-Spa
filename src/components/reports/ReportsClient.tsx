// src/components/reports/ReportsClient.tsx
"use client";

import { useMemo, useState } from "react";
import { inr } from "@/lib/format";

type BillStatus = "FINAL" | "DRAFT" | "VOID" | string;

type BillSummary = {
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

type ExpenseSummary = {
  id: string;
  dateISO: string;
  date: Date;
  amount: number;
  category: string;
  description: string;
  paymentMode: string;
};

type DaySummary = {
  dateKey: string; // YYYY-MM-DD
  date: Date;
  revenue: number;
  expenses: number;
  profit: number;
  invoiceCount: number;
  expenseCount: number;
};

function getLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`; // e.g. "2025-11-29"
}

type ReportsClientProps = {
  initialBills: any[];
  initialExpenses: any[];
  nowISO: string;
  role?: string;
};

const STATUS_FILTERS = [
  { key: "FINAL", label: "Final only" },
  { key: "ALL", label: "All statuses" },
  { key: "DRAFT", label: "Draft only" },
  { key: "VOID", label: "Void only" },
] as const;

type StatusFilterKey = (typeof STATUS_FILTERS)[number]["key"];

const TABS = [
  { key: "overview", label: "Overview" },
  { key: "revenue", label: "Revenue" },
  { key: "expenses", label: "Expenses" },
  { key: "profit", label: "Profit" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function ReportsClient({
  initialBills,
  initialExpenses,
  nowISO,
  role,
}: ReportsClientProps) {
  const baseNow = useMemo(() => new Date(nowISO), [nowISO]);

  const initialRange = useMemo(() => {
    const fromDate = new Date(
      baseNow.getFullYear(),
      baseNow.getMonth(),
      1
    );
    const toDate = baseNow;
    return {
      from: fromDate.toISOString().slice(0, 10),
      to: toDate.toISOString().slice(0, 10),
    };
  }, [baseNow]);

  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [statusFilter, setStatusFilter] =
    useState<StatusFilterKey>("FINAL");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  // ─────────────────────────────────────────────────────
  // Parsing helpers
  // ─────────────────────────────────────────────────────

  const parsedBills: BillSummary[] = useMemo(() => {
    const out: BillSummary[] = [];

    for (const b of initialBills || []) {
     const rawDate =
    (b as any).billDate ||
    (b as any).finalizedAt ||
    (b as any).createdAt;
  const dateISO = String(rawDate ?? "");

      const ts = Date.parse(dateISO);
      if (!Number.isFinite(ts)) continue;

      const totals = ((b as any).totals || {}) as any;

      const grandTotal =
        Number(
          (b as any).grandTotal ??
            totals.grandTotal ??
            totals.total ??
            0
        ) || 0;

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
      const id =
        (billNo && String(billNo)) ||
        ((b as any).id && String((b as any).id)) ||
        "";

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
  }, [initialBills]);

  const parsedExpenses: ExpenseSummary[] = useMemo(() => {
    const out: ExpenseSummary[] = [];

    for (const e of initialExpenses || []) {
      const dateISO =
        String((e as any).dateISO ?? (e as any).DateISO ?? "") || "";
      if (!dateISO) continue;
      const ts = Date.parse(dateISO);
      if (!Number.isFinite(ts)) continue;

      const amount =
        Number((e as any).amount ?? (e as any).Amount ?? 0) || 0;
      if (!amount) continue;

      const category =
        ((e as any).category as string | undefined) ||
        ((e as any).Category as string | undefined) ||
        "Misc";
      const description =
        ((e as any).description as string | undefined) ||
        ((e as any).Description as string | undefined) ||
        "";
      const paymentMode = String(
        (e as any).paymentMode ??
          (e as any).PaymentMode ??
          "OTHER"
      ).toUpperCase();

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
  }, [initialExpenses]);

  // ─────────────────────────────────────────────────────
  // Date range & filters
  // ─────────────────────────────────────────────────────

  function parseRange() {
    const f = from ? new Date(from + "T00:00:00") : null;
    const t = to ? new Date(to + "T00:00:00") : null;
    if (t) {
      t.setDate(t.getDate() + 1); // inclusive end
    }
    return { fromDate: f, toDate: t };
  }

  const { fromDate, toDate } = parseRange();

  const filteredBills = useMemo(() => {
    return parsedBills.filter((b) => {
      if (fromDate && b.date < fromDate) return false;
      if (toDate && b.date >= toDate) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "FINAL") return b.status === "FINAL";
      if (statusFilter === "DRAFT") return b.status === "DRAFT";
      if (statusFilter === "VOID") return b.status === "VOID";
      return true;
    });
  }, [parsedBills, fromDate, toDate, statusFilter]);

  const filteredExpenses = useMemo(() => {
    return parsedExpenses.filter((e) => {
      if (fromDate && e.date < fromDate) return false;
      if (toDate && e.date >= toDate) return false;
      return true;
    });
  }, [parsedExpenses, fromDate, toDate]);

  // ─────────────────────────────────────────────────────
  // Core metrics (for current range)
  // ─────────────────────────────────────────────────────

  const revenueTotal = filteredBills.reduce(
    (s, b) => s + b.grandTotal,
    0
  );
  const invoiceCount = filteredBills.length;
  const avgBill =
    invoiceCount > 0 ? revenueTotal / invoiceCount : 0;

  const uniqueCustomers = useMemo(() => {
    const set = new Set<string>();
    for (const b of filteredBills) {
      const id =
        b.customerPhone ||
        b.customerName.toLowerCase() ||
        b.id;
      if (id) set.add(id);
    }
    return set.size;
  }, [filteredBills]);

  const expensesTotal = filteredExpenses.reduce(
    (s, e) => s + e.amount,
    0
  );
  const expenseCount = filteredExpenses.length;
  const avgExpense =
    expenseCount > 0 ? expensesTotal / expenseCount : 0;
  const maxExpense = filteredExpenses.reduce(
    (max, e) => (e.amount > max ? e.amount : max),
    0
  );

  const profitTotal = revenueTotal - expensesTotal;
  const profitMargin =
    revenueTotal > 0 ? (profitTotal / revenueTotal) * 100 : 0;

  // Day-wise summary (used by Overview & Profit)
    const dailySummaries: DaySummary[] = useMemo(() => {
    const map = new Map<string, DaySummary>();

    function ensure(key: string) {
      let row = map.get(key);
      if (!row) {
        // key is already a local YYYY-MM-DD string
        const date = new Date(key + "T00:00:00");
        row = {
          dateKey: key,
          date,
          revenue: 0,
          expenses: 0,
          profit: 0,
          invoiceCount: 0,
          expenseCount: 0,
        };
        map.set(key, row);
      }
      return row;
    }

    // group bills by *local* calendar date
    for (const b of filteredBills) {
      const key = getLocalDateKey(b.date);
      const row = ensure(key);
      row.revenue += b.grandTotal;
      row.invoiceCount += 1;
    }

    // group expenses by *local* calendar date
    for (const e of filteredExpenses) {
      const key = getLocalDateKey(e.date);
      const row = ensure(key);
      row.expenses += e.amount;
      row.expenseCount += 1;
    }

    for (const row of map.values()) {
      row.profit = row.revenue - row.expenses;
    }

    return Array.from(map.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );
  }, [filteredBills, filteredExpenses]);


  const chartDays = dailySummaries.slice(-14);
  const maxRevenueOrExpense = chartDays.reduce(
    (max, d) => Math.max(max, d.revenue, d.expenses),
    0
  );
  const maxAbsProfit = dailySummaries.reduce(
    (max, d) => Math.max(max, Math.abs(d.profit)),
    0
  );

  // Payment mix for this range (for Overview)
  const paymentTotals = useMemo(() => {
    const totals: Record<string, number> = {
      CASH: 0,
      CARD: 0,
      UPI: 0,
      SPLIT: 0,
      OTHER: 0,
    };
    for (const b of filteredBills) {
      const mode = b.paymentMode;
      const key =
        mode === "CASH" ||
        mode === "CARD" ||
        mode === "UPI" ||
        mode === "SPLIT"
          ? mode
          : "OTHER";
      totals[key] += b.grandTotal;
    }
    return totals;
  }, [filteredBills]);

  const paymentMix = useMemo(() => {
    const total = Object.values(paymentTotals).reduce(
      (s, v) => s + v,
      0
    );
    if (!total) return [] as { key: string; label: string; amount: number; pct: number }[];

    const meta = [
      { key: "CASH", label: "Cash" },
      { key: "CARD", label: "Card" },
      { key: "UPI", label: "UPI" },
      { key: "SPLIT", label: "Split" },
      { key: "OTHER", label: "Other" },
    ];

    return meta
      .map((m) => {
        const amount = paymentTotals[m.key] || 0;
        const pct = total > 0 ? (amount / total) * 100 : 0;
        return { ...m, amount, pct };
      })
      .filter((m) => m.amount > 0);
  }, [paymentTotals]);

  const paymentTotalAmount = Object.values(paymentTotals).reduce(
    (s, v) => s + v,
    0
  );

  // ─────────────────────────────────────────────────────
  // Quick date range handlers
  // ─────────────────────────────────────────────────────

  function setQuickRange(key: "today" | "week" | "month" | "lastMonth") {
    const n = new Date(baseNow);

    if (key === "today") {
      const d = new Date(
        n.getFullYear(),
        n.getMonth(),
        n.getDate()
      );
      const iso = d.toISOString().slice(0, 10);
      setFrom(iso);
      setTo(iso);
      return;
    }

    if (key === "week") {
      const toD = new Date(
        n.getFullYear(),
        n.getMonth(),
        n.getDate()
      );
      const fromD = new Date(toD);
      fromD.setDate(fromD.getDate() - 6);
      setFrom(fromD.toISOString().slice(0, 10));
      setTo(toD.toISOString().slice(0, 10));
      return;
    }

    if (key === "month") {
      const fromD = new Date(n.getFullYear(), n.getMonth(), 1);
      const toD = new Date(
        n.getFullYear(),
        n.getMonth(),
        n.getDate()
      );
      setFrom(fromD.toISOString().slice(0, 10));
      setTo(toD.toISOString().slice(0, 10));
      return;
    }

    if (key === "lastMonth") {
      const fromD = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      const toD = new Date(n.getFullYear(), n.getMonth(), 0);
      setFrom(fromD.toISOString().slice(0, 10));
      setTo(toD.toISOString().slice(0, 10));
      return;
    }
  }

  // ─────────────────────────────────────────────────────
  // UI helpers
  // ─────────────────────────────────────────────────────

  const periodLabel = useMemo(() => {
    if (!from && !to) return "All time";
    if (from && to && from === to) {
      return new Date(from + "T00:00:00").toLocaleDateString();
    }
    const parts: string[] = [];
    if (from) {
      parts.push(
        new Date(from + "T00:00:00").toLocaleDateString()
      );
    }
    if (to) {
      parts.push(
        new Date(to + "T00:00:00").toLocaleDateString()
      );
    }
    return parts.join(" → ");
  }, [from, to]);

  const roleLabel =
    role === "ADMIN"
      ? "Admin"
      : role === "ACCOUNTS"
      ? "Accounts"
      : role === "CASHIER"
      ? "Cashier"
      : "User";

  // ─────────────────────────────────────────────────────
  // Tab renderers
  // ─────────────────────────────────────────────────────

  function renderOverviewTab() {
    return (
      <div className="space-y-4 lg:space-y-6">
        {/* KPI cards */}
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Revenue
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(revenueTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              From finalized invoices in this period.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Expenses
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(expensesTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Recorded outflow entries in Expenses sheet.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Net profit
            </p>
            <p
              className={`mt-2 text-lg font-semibold tracking-tight sm:text-xl ${
                profitTotal >= 0
                  ? "text-emerald-600"
                  : "text-danger"
              }`}
            >
              {inr(profitTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Margin:{" "}
              <span className="font-medium text-foreground">
                {isFinite(profitMargin)
                  ? profitMargin.toFixed(1)
                  : "0.0"}
                %
              </span>
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Invoices & customers
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {invoiceCount} invoices
            </p>
            <p className="mt-1 text-[11px] text-muted">
              {uniqueCustomers} unique customer
              {uniqueCustomers === 1 ? "" : "s"} in this period.
            </p>
          </div>
        </section>

        {/* Revenue vs expenses chart + payment mix */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.3fr)]">
          <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Revenue vs Expenses
                </h2>
                <p className="mt-1 text-[11px] text-muted sm:text-xs">
                  Daily totals for the last{" "}
                  {chartDays.length} day
                  {chartDays.length === 1 ? "" : "s"} within the
                  selected period.
                </p>
              </div>
            </div>

            {chartDays.length === 0 || maxRevenueOrExpense <= 0 ? (
              <p className="mt-4 text-[11px] text-muted">
                No revenue or expense recorded in this range.
              </p>
            ) : (
              <div className="mt-4 flex items-end gap-3">
                {chartDays.map((d) => {
                  const revPct =
                    d.revenue > 0
                      ? (d.revenue / maxRevenueOrExpense) * 100
                      : 0;
                  const expPct =
                    d.expenses > 0
                      ? (d.expenses / maxRevenueOrExpense) * 100
                      : 0;

                  const revHeight = revPct === 0 ? 4 : revPct;
                  const expHeight = expPct === 0 ? 4 : expPct;

                  const labelDate = d.date.toLocaleDateString(
                    undefined,
                    { day: "2-digit", month: "short" }
                  );

                  return (
                    <div
                      key={d.dateKey}
                      className="flex-1 text-center text-[10px] text-muted"
                    >
                      <div className="flex h-28 w-full items-end justify-center gap-1 rounded-full bg-muted/15">
                        <div
                          className="w-2 rounded-full bg-emerald-500"
                          style={{ height: `${revHeight}%` }}
                          title={`Revenue: ${inr(d.revenue)}`}
                        />
                        <div
                          className="w-2 rounded-full bg-danger"
                          style={{ height: `${expHeight}%` }}
                          title={`Expenses: ${inr(d.expenses)}`}
                        />
                      </div>
                      <div className="mt-1 leading-tight">
                        <div>{labelDate}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            {/* Payment mix */}
            <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Payment mix
              </h2>
              <p className="mt-1 text-[11px] text-muted sm:text-xs">
                Distribution of revenue by payment mode for this
                period.
              </p>

              {paymentTotalAmount > 0 && paymentMix.length > 0 ? (
                <>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/20">
                    {paymentMix.map((pm) => (
                      <div
                        key={pm.key}
                        className="inline-block h-full"
                        style={{
                          width: `${pm.pct.toFixed(1)}%`,
                          background:
                            pm.key === "CASH"
                              ? "rgb(16 185 129)" // emerald
                              : pm.key === "CARD"
                              ? "rgb(59 130 246)" // sky
                              : pm.key === "UPI"
                              ? "rgb(217 70 239)" // fuchsia
                              : pm.key === "SPLIT"
                              ? "rgb(245 158 11)" // amber
                              : "rgb(148 163 184)", // slate
                        }}
                      />
                    ))}
                  </div>

                  <div className="mt-3 grid gap-1 text-[11px] sm:grid-cols-2">
                    {paymentMix.map((pm) => (
                      <div
                        key={pm.key}
                        className="flex items-center justify-between gap-2"
                      >
                        <span className="font-medium text-foreground">
                          {pm.label}
                        </span>
                        <span className="text-right text-muted">
                          <span className="block">
                            {inr(pm.amount)}
                          </span>
                          <span>{pm.pct.toFixed(0)}%</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-[11px] text-muted">
                  No invoices for this range.
                </p>
              )}
            </section>

            {/* Mini summary table */}
            <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Daily breakdown
              </h2>
              <p className="mt-1 text-[11px] text-muted sm:text-xs">
                Revenue, expenses, and profit per day.
              </p>

              <div className="mt-3 max-h-52 overflow-auto text-[11px]">
                <table className="min-w-full text-left">
                  <thead className="border-b border-border text-[10px] uppercase tracking-wide text-muted">
                    <tr>
                      <th className="py-1 pr-2">Date</th>
                      <th className="py-1 pr-2 text-right">
                        Revenue
                      </th>
                      <th className="py-1 pr-2 text-right">
                        Expenses
                      </th>
                      <th className="py-1 pr-2 text-right">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dailySummaries.length === 0 ? (
                      <tr>
                        <td
                          className="py-2 text-center text-muted"
                          colSpan={4}
                        >
                          No data for this range.
                        </td>
                      </tr>
                    ) : (
                      dailySummaries.map((d) => (
                        <tr
                          key={d.dateKey}
                          className="border-b border-border/60"
                        >
                          <td className="py-1 pr-2">
                            {d.date.toLocaleDateString(undefined, {
                              day: "2-digit",
                              month: "short",
                            })}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {inr(d.revenue)}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {inr(d.expenses)}
                          </td>
                          <td
                            className={`py-1 pr-2 text-right ${
                              d.profit >= 0
                                ? "text-emerald-600"
                                : "text-danger"
                            }`}
                          >
                            {inr(d.profit)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </div>
    );
  }

  function renderRevenueTab() {
    return (
      <div className="space-y-4 lg:space-y-6">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Total revenue
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(revenueTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Sum of invoice grand totals.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Invoices
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {invoiceCount}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Invoices within this date range & status filter.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Average bill
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(avgBill)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Revenue / invoice count.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Unique customers
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {uniqueCustomers}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Based on name / phone combination.
            </p>
          </div>
        </section>

        {/* Daily revenue chart */}
        <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Revenue over time
              </h2>
              <p className="mt-1 text-[11px] text-muted sm:text-xs">
                Daily revenue from invoices in this period.
              </p>
            </div>
          </div>

          {dailySummaries.length === 0 ? (
            <p className="mt-4 text-[11px] text-muted">
              No invoices for this range.
            </p>
          ) : (
            <div className="mt-4 flex items-end gap-2">
              {dailySummaries.map((d) => {
                const pct =
                  maxRevenueOrExpense > 0
                    ? (d.revenue / maxRevenueOrExpense) * 100
                    : 0;
                const height = pct === 0 ? 4 : pct;
                const labelDate = d.date.toLocaleDateString(
                  undefined,
                  { day: "2-digit", month: "short" }
                );
                return (
                  <div
                    key={d.dateKey}
                    className="flex-1 text-center text-[10px] text-muted"
                  >
                    <div className="flex h-28 w-full items-end justify-center rounded-full bg-muted/20">
                      <div
                        className="w-3 rounded-full bg-primary sm:w-4"
                        style={{ height: `${height}%` }}
                        title={`Revenue: ${inr(d.revenue)}`}
                      />
                    </div>
                    <div className="mt-1 leading-tight">
                      <div>{labelDate}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Invoice table */}
        <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Invoice list
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Filtered by date and status. Click an invoice to open.
          </p>

          <div className="mt-3 max-h-[360px] overflow-auto text-[11px]">
            <table className="min-w-full text-left">
              <thead className="border-b border-border text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Bill</th>
                  <th className="py-1 pr-2">Customer</th>
                  <th className="py-1 pr-2">Mode</th>
                  <th className="py-1 pr-2 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredBills.length === 0 ? (
                  <tr>
                    <td
                      className="py-2 text-center text-muted"
                      colSpan={5}
                    >
                      No invoices for this range.
                    </td>
                  </tr>
                ) : (
                  filteredBills
                    .slice()
                    .sort(
                      (a, b) =>
                        b.date.getTime() - a.date.getTime()
                    )
                    .map((b) => {
                      const labelDate =
                        b.date.toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });
                      const billLabel =
                        b.billNo || b.id || "(draft)";
                      const statusBadge =
                        b.status === "FINAL"
                          ? "bg-emerald-500/10 text-emerald-600"
                          : b.status === "DRAFT"
                          ? "bg-amber-500/10 text-amber-600"
                          : "bg-danger/10 text-danger";

                      const hrefId =
                        encodeURIComponent(
                          b.billNo || b.id || ""
                        ) || "#";

                      return (
                        <tr
                          key={b.dateISO + b.id}
                          className="border-b border-border/60 align-top"
                        >
                          <td className="py-1 pr-2">
                            {labelDate}
                          </td>
                          <td className="py-1 pr-2">
                            <a
                              href={`/invoices/${hrefId}`}
                              className="text-[11px] font-medium text-primary hover:underline"
                            >
                              {billLabel}
                            </a>
                            <span
                              className={`ml-1 inline-flex rounded-full px-1.5 py-0.5 text-[9px] font-medium ${statusBadge}`}
                            >
                              {b.status}
                            </span>
                          </td>
                          <td className="py-1 pr-2">
                            <div className="max-w-[140px] truncate">
                              {b.customerName || (
                                <span className="text-muted">
                                  Walk-in
                                </span>
                              )}
                            </div>
                            {b.customerPhone && (
                              <div className="text-[10px] text-muted">
                                {b.customerPhone}
                              </div>
                            )}
                          </td>
                          <td className="py-1 pr-2">
                            <span className="text-muted">
                              {b.paymentMode || "—"}
                            </span>
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {inr(b.grandTotal)}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  function renderExpensesTab() {
    return (
      <div className="space-y-4 lg:space-y-6">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Total expenses
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(expensesTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Sum of all expense entries.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Entries
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {expenseCount}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Number of rows in Expenses for this range.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Average expense
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(avgExpense)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Total / count for this range.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Largest expense
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(maxExpense)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Highest single entry amount.
            </p>
          </div>
        </section>

        {/* Pie-ish summary by category (simple list) */}
        <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Expenses by category
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Breakdown for this range.
          </p>

          {expensesTotal <= 0 ? (
            <p className="mt-4 text-[11px] text-muted">
              No expenses for this range.
            </p>
          ) : (
            <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
              {(() => {
                const map = new Map<
                  string,
                  { amount: number; count: number }
                >();
                for (const e of filteredExpenses) {
                  const key = e.category || "Misc";
                  const current = map.get(key) || {
                    amount: 0,
                    count: 0,
                  };
                  current.amount += e.amount;
                  current.count += 1;
                  map.set(key, current);
                }
                const arr = Array.from(map.entries()).sort(
                  (a, b) => b[1].amount - a[1].amount
                );
                return arr.map(([cat, v]) => {
                  const pct =
                    expensesTotal > 0
                      ? (v.amount / expensesTotal) * 100
                      : 0;
                  return (
                    <div
                      key={cat}
                      className="flex items-center justify-between gap-2"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground">
                          {cat}
                        </span>
                        <span className="text-[10px] text-muted">
                          {v.count} entr
                          {v.count === 1 ? "y" : "ies"}
                        </span>
                      </div>
                      <div className="text-right text-muted">
                        <div>{inr(v.amount)}</div>
                        <div>{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </section>

        {/* Expense table */}
        <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Expense list
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Detailed list of all expenses in this period.
          </p>

          <div className="mt-3 max-h-[360px] overflow-auto text-[11px]">
            <table className="min-w-full text-left">
              <thead className="border-b border-border text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Category</th>
                  <th className="py-1 pr-2">Description</th>
                  <th className="py-1 pr-2">Mode</th>
                  <th className="py-1 pr-2 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td
                      className="py-2 text-center text-muted"
                      colSpan={5}
                    >
                      No expenses for this range.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses
                    .slice()
                    .sort(
                      (a, b) =>
                        b.date.getTime() - a.date.getTime()
                    )
                    .map((e) => {
                      const labelDate =
                        e.date.toLocaleDateString(undefined, {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        });
                      return (
                        <tr
                          key={e.id + e.dateISO}
                          className="border-b border-border/60 align-top"
                        >
                          <td className="py-1 pr-2">
                            {labelDate}
                          </td>
                          <td className="py-1 pr-2">
                            {e.category || "Misc"}
                          </td>
                          <td className="py-1 pr-2">
                            <div className="max-w-[180px] truncate">
                              {e.description || (
                                <span className="text-muted">
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-1 pr-2 text-muted">
                            {e.paymentMode || "OTHER"}
                          </td>
                          <td className="py-1 pr-2 text-right">
                            {inr(e.amount)}
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  function renderProfitTab() {
    return (
      <div className="space-y-4 lg:space-y-6">
        <section className="grid gap-3 md:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Revenue
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(revenueTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              From invoices in this range.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Expenses
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {inr(expensesTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              From Expenses sheet.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Net profit
            </p>
            <p
              className={`mt-2 text-lg font-semibold tracking-tight sm:text-xl ${
                profitTotal >= 0
                  ? "text-emerald-600"
                  : "text-danger"
              }`}
            >
              {inr(profitTotal)}
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Overall for the selected period.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Profit margin
            </p>
            <p className="mt-2 text-lg font-semibold tracking-tight sm:text-xl">
              {isFinite(profitMargin)
                ? profitMargin.toFixed(1)
                : "0.0"}
              %
            </p>
            <p className="mt-1 text-[11px] text-muted">
              Profit / revenue × 100.
            </p>
          </div>
        </section>

        {/* Profit chart */}
        <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Profit over time
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Daily profit (revenue – expenses).
          </p>

          {dailySummaries.length === 0 || maxAbsProfit <= 0 ? (
            <p className="mt-4 text-[11px] text-muted">
              No data for this range.
            </p>
          ) : (
            <div className="mt-4 flex items-end gap-2">
              {dailySummaries.map((d) => {
                const pct =
                  maxAbsProfit > 0
                    ? (Math.abs(d.profit) / maxAbsProfit) * 100
                    : 0;
                const height = pct === 0 ? 4 : pct;

                const isPositive = d.profit >= 0;
                const color = isPositive
                  ? "bg-emerald-500"
                  : "bg-danger";
                const labelDate =
                  d.date.toLocaleDateString(undefined, {
                    day: "2-digit",
                    month: "short",
                  });

                return (
                  <div
                    key={d.dateKey}
                    className="flex-1 text-center text-[10px] text-muted"
                  >
                    <div className="flex h-28 w-full items-end justify-center rounded-full bg-muted/20">
                      <div
                        className={`w-3 rounded-full sm:w-4 ${color}`}
                        style={{ height: `${height}%` }}
                        title={`Profit: ${inr(d.profit)}`}
                      />
                    </div>
                    <div className="mt-1 leading-tight">
                      <div>{labelDate}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Daily profit table */}
        <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
          <h2 className="text-sm font-semibold text-foreground sm:text-base">
            Daily profit table
          </h2>
          <p className="mt-1 text-[11px] text-muted sm:text-xs">
            Revenue, expenses, and profit per day.
          </p>

          <div className="mt-3 max-h-[360px] overflow-auto text-[11px]">
            <table className="min-w-full text-left">
              <thead className="border-b border-border text-[10px] uppercase tracking-wide text-muted">
                <tr>
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2 text-right">
                    Revenue
                  </th>
                  <th className="py-1 pr-2 text-right">
                    Expenses
                  </th>
                  <th className="py-1 pr-2 text-right">Profit</th>
                  <th className="py-1 pr-2 text-right">
                    Margin %
                  </th>
                </tr>
              </thead>
              <tbody>
                {dailySummaries.length === 0 ? (
                  <tr>
                    <td
                      className="py-2 text-center text-muted"
                      colSpan={5}
                    >
                      No data for this range.
                    </td>
                  </tr>
                ) : (
                  dailySummaries.map((d) => {
                    const margin =
                      d.revenue > 0
                        ? (d.profit / d.revenue) * 100
                        : 0;
                    return (
                      <tr
                        key={d.dateKey}
                        className="border-b border-border/60"
                      >
                        <td className="py-1 pr-2">
                          {d.date.toLocaleDateString(undefined, {
                            day: "2-digit",
                            month: "short",
                          })}
                        </td>
                        <td className="py-1 pr-2 text-right">
                          {inr(d.revenue)}
                        </td>
                        <td className="py-1 pr-2 text-right">
                          {inr(d.expenses)}
                        </td>
                        <td
                          className={`py-1 pr-2 text-right ${
                            d.profit >= 0
                              ? "text-emerald-600"
                              : "text-danger"
                          }`}
                        >
                          {inr(d.profit)}
                        </td>
                        <td className="py-1 pr-2 text-right">
                          {isFinite(margin)
                            ? margin.toFixed(1)
                            : "0.0"}
                          %
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────
  // Main render
  // ─────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <header className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Reports
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            Harmony Luxe analytics
          </h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Insight across revenue, expenses and profit for{" "}
            <span className="font-medium text-foreground">
              {periodLabel}
            </span>
            .
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <div className="inline-flex max-w-xs items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {roleLabel}
            </span>
          </div>
        </div>
      </header>

      {/* Filters & tabs */}
      <section className="mb-4 space-y-3 rounded-2xl border border-border bg-card px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Date filters + quick chips */}
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col text-[11px]">
              <label className="mb-1 text-muted">From</label>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              />
            </div>
            <div className="flex flex-col text-[11px]">
              <label className="mb-1 text-muted">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              />
            </div>

            <div className="flex flex-wrap gap-1 text-[10px]">
              <button
                type="button"
                onClick={() => setQuickRange("today")}
                className="rounded-full border border-border bg-background px-2 py-1 text-muted hover:bg-card"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setQuickRange("week")}
                className="rounded-full border border-border bg-background px-2 py-1 text-muted hover:bg-card"
              >
                This week
              </button>
              <button
                type="button"
                onClick={() => setQuickRange("month")}
                className="rounded-full border border-border bg-background px-2 py-1 text-muted hover:bg-card"
              >
                This month
              </button>
              <button
                type="button"
                onClick={() => setQuickRange("lastMonth")}
                className="rounded-full border border-border bg-background px-2 py-1 text-muted hover:bg-card"
              >
                Last month
              </button>
            </div>
          </div>

          {/* Status filter */}
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className="text-muted">Invoice status:</span>
            <div className="flex flex-wrap gap-1">
              {STATUS_FILTERS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() =>
                    setStatusFilter(s.key)
                  }
                  className={`rounded-full px-2.5 py-1 text-[10px] ${
                    statusFilter === s.key
                      ? "bg-primary text-white"
                      : "border border-border bg-background text-muted hover:bg-card"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex flex-wrap gap-2 border-t border-border pt-3 text-[11px]">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-full px-3 py-1.5 font-medium ${
                activeTab === tab.key
                  ? "bg-primary text-white shadow-sm"
                  : "bg-background text-muted hover:bg-card"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      <main className="space-y-6 lg:space-y-8">
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "revenue" && renderRevenueTab()}
        {activeTab === "expenses" && renderExpensesTab()}
        {activeTab === "profit" && renderProfitTab()}
      </main>
    </>
  );
}