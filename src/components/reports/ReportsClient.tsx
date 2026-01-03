// src/components/reports/ReportsClient.tsx
"use client";

import { useMemo, useState } from "react";
import { inr } from "@/lib/format";
import {
  BillSummary,
  ExpenseSummary,
  buildDailySummaries,
  parseBills,
  parseExpenses,
  parseInclusiveRange,
  previousPeriod,
  uniqueCustomersCount,
  pctChange,
  ymd,
} from "@/components/reports/report-utils";
import { chipBase, fieldBase, LabelTiny } from "@/components/reports/ReportUi";
import OverviewTab from "@/components/reports/tabs/OverviewTab";
import RevenueTab from "@/components/reports/tabs/RevenueTab";
import ExpensesTab from "@/components/reports/tabs/ExpensesTab";
import ProfitTab from "@/components/reports/tabs/ProfitTab";

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

export default function ReportsClient({ initialBills, initialExpenses, nowISO, role }: ReportsClientProps) {
  const baseNow = useMemo(() => new Date(nowISO), [nowISO]);

  const initialRange = useMemo(() => {
    const fromDate = new Date(baseNow.getFullYear(), baseNow.getMonth(), 1);
    const toDate = baseNow;
    return { from: ymd(fromDate), to: ymd(toDate) };
  }, [baseNow]);

  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [statusFilter, setStatusFilter] = useState<StatusFilterKey>("FINAL");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [compare, setCompare] = useState(false);

  const canExport = role === "ADMIN" || role === "ACCOUNTS";

  const parsedBills: BillSummary[] = useMemo(() => parseBills(initialBills), [initialBills]);
  const parsedExpenses: ExpenseSummary[] = useMemo(() => parseExpenses(initialExpenses), [initialExpenses]);

  const { fromDate, toDateExclusive } = useMemo(() => parseInclusiveRange(from, to), [from, to]);

  const filteredBills = useMemo(() => {
    return parsedBills.filter((b) => {
      if (fromDate && b.date < fromDate) return false;
      if (toDateExclusive && b.date >= toDateExclusive) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "FINAL") return b.status === "FINAL";
      if (statusFilter === "DRAFT") return b.status === "DRAFT";
      if (statusFilter === "VOID") return b.status === "VOID";
      return true;
    });
  }, [parsedBills, fromDate, toDateExclusive, statusFilter]);

  const filteredExpenses = useMemo(() => {
    return parsedExpenses.filter((e) => {
      if (fromDate && e.date < fromDate) return false;
      if (toDateExclusive && e.date >= toDateExclusive) return false;
      return true;
    });
  }, [parsedExpenses, fromDate, toDateExclusive]);

  const dailySummaries = useMemo(
    () => buildDailySummaries(filteredBills, filteredExpenses),
    [filteredBills, filteredExpenses]
  );

  const chartDays = dailySummaries.slice(-14);
  const maxRevenueOrExpense = useMemo(
    () => chartDays.reduce((max, d) => Math.max(max, d.revenue, d.expenses), 0),
    [chartDays]
  );
  const maxAbsProfit = useMemo(
    () => dailySummaries.reduce((max, d) => Math.max(max, Math.abs(d.profit)), 0),
    [dailySummaries]
  );

  const revenueTotal = useMemo(() => filteredBills.reduce((s, b) => s + b.grandTotal, 0), [filteredBills]);
  const invoiceCount = filteredBills.length;
  const avgBill = invoiceCount > 0 ? revenueTotal / invoiceCount : 0;
  const uniqueCustomers = useMemo(() => uniqueCustomersCount(filteredBills), [filteredBills]);

  const expensesTotal = useMemo(() => filteredExpenses.reduce((s, e) => s + e.amount, 0), [filteredExpenses]);
  const expenseCount = filteredExpenses.length;
  const avgExpense = expenseCount > 0 ? expensesTotal / expenseCount : 0;
  const maxExpense = useMemo(() => filteredExpenses.reduce((m, e) => (e.amount > m ? e.amount : m), 0), [filteredExpenses]);

  const profitTotal = revenueTotal - expensesTotal;
  const profitMargin = revenueTotal > 0 ? (profitTotal / revenueTotal) * 100 : 0;

  // payment mix
  const paymentTotals = useMemo(() => {
    const totals: Record<string, number> = { CASH: 0, CARD: 0, UPI: 0, SPLIT: 0, OTHER: 0 };
    for (const b of filteredBills) {
      const mode = b.paymentMode;
      const key = mode === "CASH" || mode === "CARD" || mode === "UPI" || mode === "SPLIT" ? mode : "OTHER";
      totals[key] += b.grandTotal;
    }
    return totals;
  }, [filteredBills]);

  const paymentTotalAmount = useMemo(
    () => Object.values(paymentTotals).reduce((s, v) => s + v, 0),
    [paymentTotals]
  );

  const paymentMix = useMemo(() => {
    const total = paymentTotalAmount;
    if (!total) return [];
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
  }, [paymentTotals, paymentTotalAmount]);

  // compare period metrics
  const compareMetrics = useMemo(() => {
    if (!compare) return null;
    const prev = previousPeriod(from, to);
    if (!prev) return null;

    const pr = parseInclusiveRange(prev.from, prev.to);

    const prevBills = parsedBills.filter((b) => {
      if (pr.fromDate && b.date < pr.fromDate) return false;
      if (pr.toDateExclusive && b.date >= pr.toDateExclusive) return false;

      if (statusFilter === "ALL") return true;
      if (statusFilter === "FINAL") return b.status === "FINAL";
      if (statusFilter === "DRAFT") return b.status === "DRAFT";
      if (statusFilter === "VOID") return b.status === "VOID";
      return true;
    });

    const prevExpenses = parsedExpenses.filter((e) => {
      if (pr.fromDate && e.date < pr.fromDate) return false;
      if (pr.toDateExclusive && e.date >= pr.toDateExclusive) return false;
      return true;
    });

    const rev = prevBills.reduce((s, b) => s + b.grandTotal, 0);
    const exp = prevExpenses.reduce((s, e) => s + e.amount, 0);

    return {
      revenueTotal: rev,
      expensesTotal: exp,
      profitTotal: rev - exp,
      invoiceCount: prevBills.length,
      uniqueCustomers: uniqueCustomersCount(prevBills),
    };
  }, [compare, from, to, parsedBills, parsedExpenses, statusFilter]);

  // quick ranges
  function setQuickRange(key: "today" | "week" | "month" | "lastMonth" | "all") {
    const n = new Date(baseNow);

    if (key === "all") {
      setFrom("");
      setTo("");
      return;
    }

    if (key === "today") {
      const d = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      const iso = ymd(d);
      setFrom(iso);
      setTo(iso);
      return;
    }

    if (key === "week") {
      const toD = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      const fromD = new Date(toD);
      fromD.setDate(fromD.getDate() - 6);
      setFrom(ymd(fromD));
      setTo(ymd(toD));
      return;
    }

    if (key === "month") {
      const fromD = new Date(n.getFullYear(), n.getMonth(), 1);
      const toD = new Date(n.getFullYear(), n.getMonth(), n.getDate());
      setFrom(ymd(fromD));
      setTo(ymd(toD));
      return;
    }

    if (key === "lastMonth") {
      const fromD = new Date(n.getFullYear(), n.getMonth() - 1, 1);
      const toD = new Date(n.getFullYear(), n.getMonth(), 0);
      setFrom(ymd(fromD));
      setTo(ymd(toD));
      return;
    }
  }

  const periodLabel = useMemo(() => {
    if (!from && !to) return "All time";
    if (from && to && from === to) return new Date(from + "T00:00:00").toLocaleDateString();
    const a = from ? new Date(from + "T00:00:00").toLocaleDateString() : "…";
    const b = to ? new Date(to + "T00:00:00").toLocaleDateString() : "…";
    return `${a} → ${b}`;
  }, [from, to]);

  const exportInvoicesHref = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    // status is optional; keep in sync with what you see
    p.set("status", statusFilter);
    const qs = p.toString();
    return qs ? `/api/reports/export?${qs}` : "/api/reports/export";
  }, [from, to, statusFilter]);

  const exportExpensesHref = useMemo(() => {
    const p = new URLSearchParams();
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    const qs = p.toString();
    return qs ? `/api/expenses/export?${qs}` : "/api/expenses/export";
  }, [from, to]);

  return (
    <>
     {/* Header */}
<section className="mb-4 rounded-2xl border border-border/70 bg-card/70 px-4 py-4 shadow-sm backdrop-blur sm:px-6 sm:py-5">
  {/* Title row */}
  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
    <div className="min-w-0">
      <LabelTiny>Reports</LabelTiny>

      <div className="mt-1 flex flex-wrap items-center gap-2">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Analytics</h1>

        <span className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-muted">
          {periodLabel}
        </span>

        {compare ? (
          <span className="inline-flex items-center rounded-full border border-border/70 bg-background/60 px-2.5 py-0.5 text-[11px] font-medium text-muted">
            Comparing previous period
          </span>
        ) : null}
      </div>

      <p className="mt-1 text-[12px] text-muted">
        Revenue, expenses and profit — fast drilldowns and exports.
      </p>
    </div>

    {canExport ? (
      <div className="flex gap-2 lg:justify-end">
        <a
          href={exportInvoicesHref}
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 bg-background/70 px-4 text-sm font-semibold text-foreground hover:bg-card"
        >
          Export invoices
        </a>
        <a
          href={exportExpensesHref}
          className="inline-flex h-10 items-center justify-center rounded-full border border-border/70 bg-background/70 px-4 text-sm font-semibold text-foreground hover:bg-card"
        >
          Export expenses
        </a>
      </div>
    ) : null}
  </div>

  {/* Controls (dense, no empty columns) */}
  <div className="mt-4 rounded-2xl border border-border/60 bg-background/40 p-3 sm:p-4">
    {/* Row 1: From / To / Status / Compare */}
    <div className="grid gap-3 lg:grid-cols-12 lg:items-end">
      <div className="space-y-1 lg:col-span-3">
        <LabelTiny>From</LabelTiny>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className={fieldBase}
        />
      </div>

      <div className="space-y-1 lg:col-span-3">
        <LabelTiny>To</LabelTiny>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className={fieldBase}
        />
      </div>

      <div className="space-y-1 lg:col-span-4">
        <LabelTiny>Status</LabelTiny>
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilterKey)}
            className={`${fieldBase} appearance-none pr-9`}
          >
            {STATUS_FILTERS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-[11px] text-muted">
            ▾
          </span>
        </div>
      </div>

      <div className="lg:col-span-2">
        <LabelTiny>Compare</LabelTiny>
        <label className="mt-1 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 text-[11px] font-semibold text-muted">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="h-4 w-4 accent-primary"
            disabled={!from || !to}
            title={!from || !to ? "Set From and To to enable comparison" : ""}
          />
          Compare
        </label>
      </div>
    </div>

    {/* Row 2: Quick range (full width, wraps cleanly) */}
    <div className="mt-3">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setQuickRange("today")} className={chipBase}>
          Today
        </button>
        <button type="button" onClick={() => setQuickRange("week")} className={chipBase}>
          Last 7
        </button>
        <button type="button" onClick={() => setQuickRange("month")} className={chipBase}>
          This month
        </button>
        <button type="button" onClick={() => setQuickRange("lastMonth")} className={chipBase}>
          Last month
        </button>
        <button type="button" onClick={() => setQuickRange("all")} className={chipBase}>
          All time
        </button>
      </div>
    </div>

    {/* Tabs */}
    <div className="mt-3 border-t border-border/60 pt-3">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setActiveTab(t.key)}
            className={`rounded-full px-3 py-2 text-[11px] font-semibold transition ${
              activeTab === t.key
                ? "bg-primary text-black shadow-sm"
                : "bg-background/60 text-muted hover:bg-card"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  </div>
</section>



      {/* Content */}
      <main className="space-y-6 lg:space-y-8">
        {activeTab === "overview" && (
          <OverviewTab
            revenueTotal={revenueTotal}
            expensesTotal={expensesTotal}
            profitTotal={profitTotal}
            profitMargin={profitMargin}
            invoiceCount={invoiceCount}
            uniqueCustomers={uniqueCustomers}
            compare={compare}
            compareMetrics={compareMetrics}
            chartDays={chartDays}
            maxRevenueOrExpense={maxRevenueOrExpense}
            paymentMix={paymentMix}
            paymentTotalAmount={paymentTotalAmount}
            dailySummaries={dailySummaries}
          />
        )}

        {activeTab === "revenue" && (
          <RevenueTab
            revenueTotal={revenueTotal}
            invoiceCount={invoiceCount}
            avgBill={avgBill}
            uniqueCustomers={uniqueCustomers}
            bills={filteredBills}
          />
        )}

        {activeTab === "expenses" && (
          <ExpensesTab
            expensesTotal={expensesTotal}
            expenseCount={expenseCount}
            avgExpense={avgExpense}
            maxExpense={maxExpense}
            expenses={filteredExpenses}
          />
        )}

        {activeTab === "profit" && (
          <ProfitTab
            revenueTotal={revenueTotal}
            expensesTotal={expensesTotal}
            profitTotal={profitTotal}
            profitMargin={profitMargin}
            dailySummaries={dailySummaries}
            maxAbsProfit={maxAbsProfit}
          />
        )}
      </main>
    </>
  );
}
