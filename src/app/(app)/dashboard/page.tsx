// src/app/(app)/dashboard/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { listBills } from "@/store/bills";
import { listExpenses } from "@/store/expenses";

import DashboardKpis from "@/components/dashboard/DashboardKpis";
import RevenueTrendCard from "@/components/dashboard/RevenueTrendCard";
import PaymentMixCard from "@/components/dashboard/PaymentMixCard";
import ProfitCard from "@/components/dashboard/ProfitCard";
import ExpensesByCategoryCard from "@/components/dashboard/ExpensesByCategoryCard";
import TopCustomersCard from "@/components/dashboard/TopCustomersCard";
import RecentInvoices from "@/components/dashboard/RecentInvoices";

export const dynamic = "force-dynamic";

type Role = "ADMIN" | "CASHIER" | "ACCOUNTS" | undefined;
type BillStatus = "FINAL" | "DRAFT" | "VOID";

type ParsedBill = {
  ts: number;
  dateISO: string;
  date: Date;
  status: BillStatus;
  grandTotal: number;
  paymentMode?: string;
  customerName: string;
};

type ParsedExpense = {
  ts: number;
  dateISO: string;
  date: Date;
  amount: number;
  category: string;
};

type RawBill = {
  finalizedAt?: string;
  createdAt?: string;
  billDate?: string;
  status?: string;
  totals?: {
    grandTotal?: number | string;
    total?: number | string;
  };
  grandTotal?: number | string;
  customer?: {
    name?: string;
  };
  customerName?: string;
  paymentMode?: string;
};

type RawExpense = {
  dateISO?: string;
  DateISO?: string;
  amount?: number | string;
  Amount?: number | string;
  category?: string;
  Category?: string;
};

const IST_TZ = "Asia/Kolkata";

function ymdInTz(d: Date, timeZone = IST_TZ) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === "year")?.value ?? "0000";
  const m = parts.find((p) => p.type === "month")?.value ?? "00";
  const dd = parts.find((p) => p.type === "day")?.value ?? "00";
  return { y, m, d: dd };
}

function dayKeyIST(d: Date) {
  const { y, m, d: dd } = ymdInTz(d, IST_TZ);
  return `${y}-${m}-${dd}`;
}

function monthKeyIST(d: Date) {
  const { y, m } = ymdInTz(d, IST_TZ);
  return `${y}-${m}`;
}

export default async function DashboardPage() {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const role = session.user?.role as Role;
  const userEmail = session.user?.email || "";

  const now = new Date();
  const todayKey = dayKeyIST(now);
  const thisMonthKey = monthKeyIST(now);

  const prevMonthDate = new Date(now);
  prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
  const prevMonthKey = monthKeyIST(prevMonthDate);

  const monthLabel = new Intl.DateTimeFormat(undefined, {
    timeZone: IST_TZ,
    month: "short",
    year: "numeric",
  }).format(now);

  const todayLabel = new Intl.DateTimeFormat(undefined, {
    timeZone: IST_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(now);

  // Days in month / elapsed (IST)
  const { y: yNow, m: mNow, d: dNow } = ymdInTz(now, IST_TZ);
  const yearNum = Number(yNow);
  const monthIdx = Math.max(0, Number(mNow) - 1);
  const totalDaysInMonth = new Date(Date.UTC(yearNum, monthIdx + 1, 0)).getUTCDate();
  const daysElapsedInMonth = Math.min(Number(dNow) || 1, totalDaysInMonth);

  const [allBillsRaw, allExpensesRaw] = await Promise.all([listBills(), listExpenses()]);

  // ─────────────────────────────────────
  // Bills
  // ─────────────────────────────────────
  const parsedBills: ParsedBill[] = (allBillsRaw as RawBill[])
    .map((b) => {
      const rawDate = b.finalizedAt || b.createdAt || b.billDate;
      const dateISO = String(rawDate ?? "");
      const ts = Date.parse(dateISO);
      const status = (b.status || "DRAFT") as BillStatus;

      const grandTotal =
        Number(b.grandTotal ?? b.totals?.grandTotal ?? b.totals?.total ?? 0) || 0;

      const customerName = b.customer?.name || b.customerName || "";

      const paymentMode = String(b.paymentMode || "").toUpperCase() || undefined;

      return {
        ts,
        dateISO,
        date: new Date(dateISO),
        status,
        grandTotal,
        paymentMode,
        customerName: customerName.trim(),
      };
    })
    .filter((x) => Number.isFinite(x.ts));

  const totalInvoices = parsedBills.length;
  const finals = parsedBills.filter((b) => b.status === "FINAL");

  const finalCount = finals.length;
  const draftCount = parsedBills.filter((b) => b.status === "DRAFT").length;
  const voidCount = parsedBills.filter((b) => b.status === "VOID").length;

  const monthFinals = finals.filter((b) => monthKeyIST(b.date) === thisMonthKey);
  const prevMonthFinals = finals.filter((b) => monthKeyIST(b.date) === prevMonthKey);
  const todayFinals = finals.filter((b) => dayKeyIST(b.date) === todayKey);

  const todayRevenue = todayFinals.reduce((s, b) => s + b.grandTotal, 0);
  const monthRevenue = monthFinals.reduce((s, b) => s + b.grandTotal, 0);
  const prevMonthRevenue = prevMonthFinals.reduce((s, b) => s + b.grandTotal, 0);

  const monthInvoiceCount = monthFinals.length;
  const todayCount = todayFinals.length;
  const avgBill = monthInvoiceCount > 0 ? monthRevenue / monthInvoiceCount : 0;

  const revenueChangePct =
    prevMonthRevenue > 0 ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 : null;

  const projectedRevenue =
    daysElapsedInMonth > 0 ? (monthRevenue / daysElapsedInMonth) * totalDaysInMonth : 0;

  const activeCustomerNames = new Set<string>();
  for (const b of monthFinals) {
    if (b.customerName) activeCustomerNames.add(b.customerName.toLowerCase());
  }
  const activeCustomers = activeCustomerNames.size;

  const finalizationRate = totalInvoices > 0 ? (finalCount / totalInvoices) * 100 : 0;

  // ─────────────────────────────────────
  // Expenses
  // ─────────────────────────────────────
  const parsedExpenses: ParsedExpense[] = (allExpensesRaw as RawExpense[])
    .map((e) => {
      const dateISO = String(e.dateISO ?? e.DateISO ?? "");
      const ts = Date.parse(dateISO);
      const amount = Number(e.amount ?? e.Amount ?? 0) || 0;
      const category = String(e.category ?? e.Category ?? "Misc");
      return { ts, dateISO, date: new Date(dateISO), amount, category };
    })
    .filter((x) => Number.isFinite(x.ts));

  const monthExpenses = parsedExpenses.filter((e) => monthKeyIST(e.date) === thisMonthKey);
  const todayExpenses = parsedExpenses.filter((e) => dayKeyIST(e.date) === todayKey);

  const monthExpensesTotal = monthExpenses.reduce((s, e) => s + e.amount, 0);
  const todayExpensesTotal = todayExpenses.reduce((s, e) => s + e.amount, 0);

  const monthProfit = monthRevenue - monthExpensesTotal;
  const todayProfit = todayRevenue - todayExpensesTotal;

  const expenseRatio = monthRevenue > 0 ? (monthExpensesTotal / monthRevenue) * 100 : null;

  // Expenses by category (month)
  const expenseCategoryTotals: Record<string, number> = {};
  for (const e of monthExpenses) {
    const cat = (e.category || "Misc").toString();
    expenseCategoryTotals[cat] = (expenseCategoryTotals[cat] || 0) + e.amount;
  }
  const expenseCategoryData = Object.entries(expenseCategoryTotals)
    .map(([category, total]) => ({
      category,
      total,
      pct: monthExpensesTotal > 0 ? (total / monthExpensesTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Top customers (month)
  const topCustomers = (() => {
    if (!monthFinals.length) return [];
    const totals: Record<string, number> = {};
    for (const b of monthFinals) {
      const name = b.customerName || "Walk-in customer";
      totals[name] = (totals[name] || 0) + b.grandTotal;
    }
    return Object.entries(totals)
      .map(([name, total]) => ({
        name,
        total,
        pct: monthRevenue > 0 ? (total / monthRevenue) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  })();

  // Payment mix (month, FINAL)
  const pmTotals: Record<string, number> = { CASH: 0, CARD: 0, UPI: 0, SPLIT: 0, OTHER: 0 };
  for (const b of monthFinals) {
    const mode = (b.paymentMode || "OTHER").toUpperCase();
    const key =
      mode === "CASH" || mode === "CARD" || mode === "UPI" || mode === "SPLIT" ? mode : "OTHER";
    pmTotals[key] += b.grandTotal;
  }
  const pmTotalAmount = Object.values(pmTotals).reduce((s, v) => s + v, 0);

  // Revenue + expenses by IST day
  const revenueByDay: Record<string, number> = {};
  for (const b of finals) {
    const k = dayKeyIST(b.date);
    revenueByDay[k] = (revenueByDay[k] || 0) + b.grandTotal;
  }
  const expensesByDay: Record<string, number> = {};
  for (const e of parsedExpenses) {
    const k = dayKeyIST(e.date);
    expensesByDay[k] = (expensesByDay[k] || 0) + e.amount;
  }

  const last14: { key: string; label: string; weekday: string; total: number }[] = [];
  const last7Net: { label: string; weekday: string; revenue: number; expenses: number; net: number }[] = [];

  const weekdayFmt = new Intl.DateTimeFormat(undefined, { timeZone: IST_TZ, weekday: "short" });

  for (let i = 13; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    const k = dayKeyIST(d);
    const revenue = revenueByDay[k] || 0;

    const parts = ymdInTz(d, IST_TZ);
    const label = parts.d;
    const weekday = weekdayFmt.format(d);

    last14.push({ key: k, label, weekday, total: revenue });
  }

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    const k = dayKeyIST(d);
    const revenue = revenueByDay[k] || 0;
    const expenses = expensesByDay[k] || 0;
    const net = revenue - expenses;

    const parts = ymdInTz(d, IST_TZ);
    const label = parts.d;
    const weekday = weekdayFmt.format(d);

    last7Net.push({ label, weekday, revenue, expenses, net });
  }

  const maxDayTotal = Math.max(...last14.map((d) => d.total), 0);
  const last14Total = last14.reduce((s, d) => s + d.total, 0);
  const last7Revenue = last14.slice(-7);

  const canCreateBill = role === "ADMIN" || role === "CASHIER";

  // Links for KPI drill-down (works with your newer DashboardKpis)
  const monthFrom = `${thisMonthKey}-01`;
  const monthTo = todayKey;

  const links = {
    monthFinals: `/invoices?status=FINAL&from=${encodeURIComponent(monthFrom)}&to=${encodeURIComponent(monthTo)}`,
    todayFinals: `/invoices?status=FINAL&from=${encodeURIComponent(todayKey)}&to=${encodeURIComponent(todayKey)}`,
    invoicesAll: `/invoices`,
    expenses: `/expenses`,
    customers: `/customers`,
  };

  return (
    <div className="mx-auto w-full pb-10 pt-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
          <span className="rounded-full bg-card px-2.5 py-1">
            Month <span className="font-medium text-foreground">{monthLabel}</span>
          </span>
          <span className="rounded-full bg-card px-2.5 py-1">
            Today <span className="font-medium text-foreground">{todayLabel}</span>
          </span>
          {userEmail ? (
            <span className="hidden rounded-full bg-card px-2.5 py-1 font-mono text-[10px] text-muted sm:inline">
              {userEmail}
            </span>
          ) : null}
        </div>

        {canCreateBill ? (
          <Link
            href="/billing"
            className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold !text-white shadow-sm transition hover:bg-slate-800 dark:bg-white dark:!text-slate-900 dark:hover:bg-slate-100"
          >
            + Create bill
          </Link>
        ) : null}
      </div>

      <div className="mt-4 space-y-4 lg:space-y-5">
        {/* <DashboardKpis
          monthLabel={monthLabel}
          todayLabel={todayLabel}
          monthRevenue={monthRevenue}
          todayRevenue={todayRevenue}
          revenueChangePct={revenueChangePct}
          projectedRevenue={projectedRevenue}
          monthExpensesTotal={monthExpensesTotal}
          todayExpensesTotal={todayExpensesTotal}
          monthProfit={monthProfit}
          todayProfit={todayProfit}
          expenseRatio={expenseRatio}
          avgBill={avgBill}
          monthInvoiceCount={monthInvoiceCount}
          todayCount={todayCount}
          finalCount={finalCount}
          draftCount={draftCount}
          voidCount={voidCount}
          activeCustomers={activeCustomers}
          finalizationRate={finalizationRate}
          totalInvoices={totalInvoices}
          last7Revenue={last7Revenue}
          links={links}
        /> */}

        <div className="grid gap-4 lg:grid-cols-12 lg:items-start">
          <div className="space-y-4 lg:col-span-8">
             <RevenueTrendCard last14={last14} maxDayTotal={maxDayTotal} total={last14Total} />
            <ProfitCard
              monthLabel={monthLabel}
              monthProfit={monthProfit}
              monthRevenue={monthRevenue}
              monthExpensesTotal={monthExpensesTotal}
              todayProfit={todayProfit}
              todayExpensesTotal={todayExpensesTotal}
              data={last7Net}
            />
            <RecentInvoices />
          </div>

          <div className="space-y-4 lg:col-span-4">
            <PaymentMixCard pmTotals={pmTotals} pmTotalAmount={pmTotalAmount} monthLabel={monthLabel} />
            <ExpensesByCategoryCard monthLabel={monthLabel} data={expenseCategoryData} expenseRatio={expenseRatio} />
            <TopCustomersCard data={topCustomers} monthRevenue={monthRevenue} />
          </div>
        </div>
      </div>
    </div>
  );
}
