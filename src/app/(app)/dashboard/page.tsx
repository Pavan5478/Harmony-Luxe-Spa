// src/app/(app)/dashboard/page.tsx
import { getSession } from "@/lib/session";
import { listBills } from "@/store/bills";
import { listExpenses } from "@/store/expenses";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import StatsRow from "@/components/dashboard/StatsRow";
import ChartsRow from "@/components/dashboard/ChartsRow";
import { inr } from "@/lib/format";

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

export default async function DashboardPage() {
  const session = await getSession();
  const role = session.user?.role as Role;
  const userEmail = session.user?.email || "";

  const cards =
    role === "ADMIN"
      ? [
          { title: "Create bill", href: "/billing" },
          { title: "Manage menu", href: "/menu" },
          { title: "Invoices", href: "/invoices" },
          { title: "Expenses", href: "/expenses" },
          { title: "Reports", href: "/reports" },
        ]
      : role === "ACCOUNTS"
      ? [
          { title: "Invoices", href: "/invoices" },
          { title: "Expenses", href: "/expenses" },
          { title: "Reports", href: "/reports" },
        ]
      : // CASHIER (and fallback)
        [{ title: "Create bill", href: "/billing" }];

  const roleLabel =
    role === "ADMIN"
      ? "Admin"
      : role === "CASHIER"
      ? "Cashier"
      : role === "ACCOUNTS"
      ? "Accounts"
      : "User";

  // ─────────────────────────────────────
  // Date ranges
  // ─────────────────────────────────────
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0);
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const monthLabel = startOfMonth.toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
  const todayLabel = startOfToday.toLocaleDateString();

  const totalDaysInMonth = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  ).getDate();
  const daysElapsedInMonth = Math.min(now.getDate(), totalDaysInMonth);

  // ─────────────────────────────────────
  // Load bills + expenses
  // ─────────────────────────────────────
  const [allBillsRaw, allExpensesRaw] = await Promise.all([
    listBills(),
    listExpenses(),
  ]);

  // ─────────────────────────────────────
  // Parse bills (invoices)
  // ─────────────────────────────────────
  const allBills = allBillsRaw as any[];

  const parsedBills: ParsedBill[] = allBills
    .map((b) => {
      const rawDate = b.finalizedAt || b.createdAt;
      const dateISO = String(rawDate ?? "");
      const ts = Date.parse(dateISO);

      const status = (b.status || "DRAFT") as BillStatus;

      const totals = (b.totals || {}) as any;
      const grandTotal =
        Number(
          (b as any).grandTotal ?? totals.grandTotal ?? totals.total ?? 0
        ) || 0;

      const customerName =
        (b.customer?.name as string | undefined) ||
        (b.customerName as string | undefined) ||
        "";

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

  const monthFinals = finals.filter((b) => b.date >= startOfMonth);
  const prevMonthFinals = finals.filter(
    (b) => b.date >= startOfPrevMonth && b.date <= endOfPrevMonth
  );
  const todayFinals = finals.filter((b) => b.date >= startOfToday);

  const todayRevenue = todayFinals.reduce((s, b) => s + b.grandTotal, 0);
  const monthRevenue = monthFinals.reduce((s, b) => s + b.grandTotal, 0);
  const prevMonthRevenue = prevMonthFinals.reduce(
    (s, b) => s + b.grandTotal,
    0
  );
  const monthInvoiceCount = monthFinals.length;
  const todayCount = todayFinals.length;
  const avgBill =
    monthInvoiceCount > 0 ? monthRevenue / monthInvoiceCount : 0;

  const revenueChangePct =
    prevMonthRevenue > 0
      ? ((monthRevenue - prevMonthRevenue) / prevMonthRevenue) * 100
      : null;

  const projectedRevenue =
    daysElapsedInMonth > 0
      ? (monthRevenue / daysElapsedInMonth) * totalDaysInMonth
      : 0;

  // active customers this month (unique names)
  const activeCustomerNames = new Set<string>();
  for (const b of monthFinals) {
    if (b.customerName) activeCustomerNames.add(b.customerName.toLowerCase());
  }
  const activeCustomers = activeCustomerNames.size;

  const finalizationRate =
    totalInvoices > 0 ? (finalCount / totalInvoices) * 100 : 0;

  // ─────────────────────────────────────
  // Parse expenses
  // ─────────────────────────────────────
  const allExpenses = allExpensesRaw as any[];

  const parsedExpenses: ParsedExpense[] = allExpenses
    .map((e) => {
      const dateISO = String(e.dateISO ?? e.DateISO ?? "");
      const ts = Date.parse(dateISO);
      const amount = Number(e.amount ?? e.Amount ?? 0) || 0;
      const category = (e.category ?? e.Category ?? "Misc") as string;

      return {
        ts,
        dateISO,
        date: new Date(dateISO),
        amount,
        category,
      };
    })
    .filter((x) => Number.isFinite(x.ts));

  const monthExpenses = parsedExpenses.filter((e) => e.date >= startOfMonth);
  const todayExpenses = parsedExpenses.filter((e) => e.date >= startOfToday);

  const monthExpensesTotal = monthExpenses.reduce(
    (s, e) => s + e.amount,
    0
  );
  const todayExpensesTotal = todayExpenses.reduce(
    (s, e) => s + e.amount,
    0
  );

  const monthProfit = monthRevenue - monthExpensesTotal;
  const todayProfit = todayRevenue - todayExpensesTotal;

  const expenseCategoryTotals: Record<string, number> = {};
  for (const e of monthExpenses) {
    const cat = (e.category || "Misc").toString();
    expenseCategoryTotals[cat] = (expenseCategoryTotals[cat] || 0) + e.amount;
  }

  const expenseCategoryData = Object.entries(expenseCategoryTotals)
    .map(([category, total]) => ({
      category,
      total,
      pct:
        monthExpensesTotal > 0 ? (total / monthExpensesTotal) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // null = no revenue yet
  const expenseRatio =
    monthRevenue > 0 ? (monthExpensesTotal / monthRevenue) * 100 : null;

  // Top customers this month
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
      .slice(0, 5);
  })();

  // ─────────────────────────────────────
  // Payment mix (this month, FINAL only)
  // ─────────────────────────────────────
  const pmTotals: Record<string, number> = {
    CASH: 0,
    CARD: 0,
    UPI: 0,
    SPLIT: 0,
    OTHER: 0,
  };

  for (const b of monthFinals) {
    const mode = (b.paymentMode || "OTHER").toUpperCase();
    const key =
      mode === "CASH" || mode === "CARD" || mode === "UPI" || mode === "SPLIT"
        ? mode
        : "OTHER";
    pmTotals[key] += b.grandTotal;
  }

  const pmTotalAmount = Object.values(pmTotals).reduce((s, v) => s + v, 0);

  const paymentMix = [
    { key: "CASH", label: "Cash", color: "bg-emerald-500" },
    { key: "CARD", label: "Card", color: "bg-sky-500" },
    { key: "UPI", label: "UPI", color: "bg-fuchsia-500" },
    { key: "SPLIT", label: "Split", color: "bg-amber-500" },
    { key: "OTHER", label: "Other", color: "bg-slate-400" },
  ].filter((x) => pmTotals[x.key] > 0);

  const paymentSegments = (() => {
    if (paymentMix.length === 0 || pmTotalAmount <= 0) return [];
    let offset = 0;
    return paymentMix.map((pm) => {
      const value = pmTotals[pm.key];
      const width = (value / pmTotalAmount) * 100;
      const seg = { key: pm.key, color: pm.color, width, left: offset, value };
      offset += width;
      return seg;
    });
  })();

  // ─────────────────────────────────────
  // Last 7 days revenue (FINAL) + net profit
  // ─────────────────────────────────────
  const last7: { label: string; weekday: string; total: number }[] = [];
  const last7Net: {
    label: string;
    weekday: string;
    revenue: number;
    expenses: number;
    net: number;
  }[] = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const revenue = finals
      .filter((b) => b.date >= dayStart && b.date < dayEnd)
      .reduce((s, b) => s + b.grandTotal, 0);

    const expenses = parsedExpenses
      .filter((e) => e.date >= dayStart && e.date < dayEnd)
      .reduce((s, e) => s + e.amount, 0);

    const net = revenue - expenses;

    const label = d.getDate().toString().padStart(2, "0");
    const weekday = d.toLocaleDateString(undefined, { weekday: "short" });

    last7.push({ label, weekday, total: revenue });
    last7Net.push({ label, weekday, revenue, expenses, net });
  }

  const maxDayTotal = Math.max(...last7.map((d) => d.total), 0);
  const weekTotal = last7.reduce((s, d) => s + d.total, 0);

  // ─────────────────────────────────────
  // Layout
  // ─────────────────────────────────────
  return (
    <div className="mx-auto max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-10">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Analytics
          </p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {roleLabel} analytics overview
          </h1>
          <p className="text-xs text-muted sm:text-sm">
            Live snapshot of{" "}
            <span className="font-medium text-foreground">
              {monthLabel}
            </span>{" "}
            revenue, profit, invoices, expenses and customers.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {roleLabel}
            </span>
            <span className="max-w-[180px] truncate font-mono text-[10px] sm:max-w-[220px]">
              {userEmail || "Signed in"}
            </span>
          </div>
          <div className="rounded-full bg-background px-3 py-1.5 text-[11px] text-muted shadow-sm">
            Today:{" "}
            <span className="font-medium text-foreground">
              {todayLabel}
            </span>
          </div>
        </div>
      </header>

      <main className="mt-5 space-y-6 lg:space-y-7">
        {/* Row 1 – high-level KPIs */}
        <StatsRow
          monthRevenue={monthRevenue}
          revenueChangePct={revenueChangePct}
          monthInvoiceCount={monthInvoiceCount}
          totalInvoices={totalInvoices}
          finalCount={finalCount}
          todayCount={todayCount}
          avgBill={avgBill}
          activeCustomers={activeCustomers}
          finalizationRate={finalizationRate}
          draftCount={draftCount}
          voidCount={voidCount}
          projectedRevenue={projectedRevenue}
          expenseRatio={expenseRatio}
        />

        {/* Row 2 – revenue trend + payment mix + profit */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)] lg:items-start">
          <ChartsRow
            last7={last7}
            maxDayTotal={maxDayTotal}
            weekTotal={weekTotal}
            paymentMix={paymentMix}
            paymentSegments={paymentSegments}
            pmTotals={pmTotals}
            pmTotalAmount={pmTotalAmount}
          />

          <ProfitAnalyticsCard
            monthLabel={monthLabel}
            monthProfit={monthProfit}
            monthRevenue={monthRevenue}
            monthExpensesTotal={monthExpensesTotal}
            todayProfit={todayProfit}
            todayExpensesTotal={todayExpensesTotal}
            data={last7Net}
          />
        </section>

        {/* Row 3 – deeper insights */}
        <section className="grid gap-4 lg:grid-cols-2 lg:items-start">
          <ExpensesByCategoryCard
            monthLabel={monthLabel}
            data={expenseCategoryData}
            expenseRatio={expenseRatio}
          />
          <TopCustomersCard
            data={topCustomers}
            monthRevenue={monthRevenue}
            cards={cards}
          />
        </section>

        {/* Row 4 – recent invoices */}
        <RecentInvoices />
      </main>
    </div>
  );
}

// ─────────────────────────────────────
// Local cards & charts
// ─────────────────────────────────────

type NetPoint = {
  label: string;
  weekday: string;
  revenue: number;
  expenses: number;
  net: number;
};

function ProfitAnalyticsCard({
  monthLabel,
  monthProfit,
  monthRevenue,
  monthExpensesTotal,
  todayProfit,
  todayExpensesTotal,
  data,
}: {
  monthLabel: string;
  monthProfit: number;
  monthRevenue: number;
  monthExpensesTotal: number;
  todayProfit: number;
  todayExpensesTotal: number;
  data: NetPoint[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground sm:text-base">
          Profit &amp; cash flow
        </h2>
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
          {monthLabel}
        </span>
      </div>
      <p className="mt-1 text-[11px] text-muted sm:text-xs">
        Net profit this month and last 7 days trend after expenses.
      </p>

      <div className="mt-3 flex items-baseline justify-between gap-2">
        <div>
          <p className="text-[11px] text-muted">Month profit</p>
          <p
            className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${
              monthProfit >= 0 ? "text-emerald-500" : "text-danger"
            }`}
          >
            {inr(monthProfit)}
          </p>
          <p className="mt-1 text-[11px] text-muted">
            Today:{" "}
            <span
              className={
                todayProfit >= 0
                  ? "font-medium text-emerald-500"
                  : "font-medium text-danger"
              }
            >
              {inr(todayProfit)}
            </span>{" "}
            ({inr(todayExpensesTotal)} expenses)
          </p>
        </div>
        <div className="text-right text-[11px] text-muted">
          <div>
            Revenue:{" "}
            <span className="font-medium text-foreground">
              {inr(monthRevenue)}
            </span>
          </div>
          <div>
            Expenses:{" "}
            <span className="font-medium text-foreground">
              {inr(monthExpensesTotal)}
            </span>
          </div>
        </div>
      </div>

      <Last7NetProfitChart data={data} />
    </section>
  );
}

function ExpensesByCategoryCard({
  monthLabel,
  data,
  expenseRatio,
}: {
  monthLabel: string;
  data: { category: string; total: number; pct: number }[];
  expenseRatio: number | null;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground sm:text-base">
          Expenses by category
        </h2>
        <span className="text-[11px] text-muted">{monthLabel}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted sm:text-xs">
        Where your money is going, grouped by expense category.
      </p>

      <p className="mt-2 text-[11px] text-muted">
        {expenseRatio === null ? (
          <>No revenue recorded yet this month.</>
        ) : (
          <>
            Expenses are{" "}
            <span className="font-medium text-foreground">
              {expenseRatio.toFixed(1)}%
            </span>{" "}
            of revenue this month.
          </>
        )}
      </p>

      <ExpenseCategoryChart data={data} />
    </section>
  );
}

function TopCustomersCard({
  data,
  monthRevenue,
  cards,
}: {
  data: { name: string; total: number; pct: number }[];
  monthRevenue: number;
  cards: { title: string; href: string }[];
}) {
  const primaryCta = cards[0];
  const ctaLabel = primaryCta?.title ?? "Open";

  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground sm:text-base">
          Top customers this month
        </h2>
        {primaryCta && (
          <a
            href={primaryCta.href}
            className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-card"
          >
            {ctaLabel}
          </a>
        )}
      </div>
      <p className="mt-1 text-[11px] text-muted sm:text-xs">
        Highest-spending customers on finalized invoices.
      </p>

      {data.length === 0 ? (
        <p className="mt-3 text-[11px] text-muted">
          No finalized invoices with customer names this month yet.
        </p>
      ) : (
        <ul className="mt-3 space-y-2 text-xs">
          {data.map((c) => (
            <li
              key={c.name}
              className="flex items-center justify-between gap-2 rounded-xl bg-background px-2.5 py-1.5"
            >
              <div className="flex flex-col">
                <span className="truncate font-medium text-foreground">
                  {c.name}
                </span>
                <span className="text-[11px] text-muted">
                  {c.pct.toFixed(1)}% of revenue
                </span>
              </div>
              <span className="text-sm font-medium">
                {inr(c.total)}
              </span>
            </li>
          ))}
        </ul>
      )}

      {monthRevenue > 0 && data.length > 0 && (
        <p className="mt-3 text-[10px] text-muted">
          These customers drive a big share of revenue — focus on
          retention and upsell here.
        </p>
      )}
    </section>
  );
}

function Last7NetProfitChart({ data }: { data: NetPoint[] }) {
  const maxAbsNet = Math.max(0, ...data.map((d) => Math.abs(d.net)));

  if (!data.length || maxAbsNet <= 0) {
    return (
      <p className="mt-3 text-[11px] text-muted">
        Not enough data to show profit trend yet.
      </p>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex h-28 items-end gap-2">
        {data.map((d) => {
          const ratio = maxAbsNet > 0 ? Math.abs(d.net) / maxAbsNet : 0;
          const height = 15 + ratio * 70; // 15–85%
          const isPositive = d.net >= 0;

          return (
            <div
              key={d.label + d.weekday}
              className="flex flex-1 flex-col items-center gap-1"
            >
              <div className="flex h-full w-full items-end justify-center rounded-full bg-muted/20">
                <div
                  className={`w-3 rounded-full sm:w-4 ${
                    isPositive ? "bg-emerald-500" : "bg-danger"
                  }`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <div className="mt-1 text-center text-[10px] leading-tight text-muted">
                <div className="font-medium text-foreground">
                  {d.weekday.slice(0, 2)}
                </div>
                <div>{d.label}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 flex justify-center gap-4 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
          Profit
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-danger" />
          Loss
        </span>
      </div>
    </div>
  );
}

function ExpenseCategoryChart({
  data,
}: {
  data: { category: string; total: number; pct: number }[];
}) {
  if (!data.length) {
    return (
      <p className="mt-3 text-[11px] text-muted">
        No expenses recorded for this month yet.
      </p>
    );
  }

  const top = data.slice(0, 5);

  return (
    <div className="mt-3 space-y-3">
      {top.map((item) => (
        <div key={item.category} className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted">
            <span className="truncate">{item.category}</span>
            <span className="font-medium text-foreground">
              {item.pct.toFixed(0)}%
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/20">
            <div
              className="h-full rounded-full bg-sky-500"
              style={{ width: `${item.pct}%` }}
            />
          </div>
          <div className="text-[10px] text-muted">
            {inr(item.total)} this month
          </div>
        </div>
      ))}
      {data.length > top.length && (
        <p className="pt-1 text-[10px] text-muted">
          +{data.length - top.length} more categories
        </p>
      )}
    </div>
  );
}