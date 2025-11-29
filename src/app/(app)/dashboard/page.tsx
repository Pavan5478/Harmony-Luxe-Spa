// src/app/(app)/dashboard/page.tsx
import { getSession } from "@/lib/session";
import { listBills } from "@/store/bills";
import { listExpenses } from "@/store/expenses";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
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

  // ─────────────────────────────────────
  // Load bills + expenses from Sheets
  // ─────────────────────────────────────
  const [allBillsRaw, allExpensesRaw] = await Promise.all([
    listBills(),       // from Invoices sheet
    listExpenses(),    // from Expenses sheet
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

      // Grand total – from totals.grandTotal (fallback to top-level)
      const totals = (b.totals || {}) as any;
      const grandTotal =
        Number(
          (b as any).grandTotal ?? totals.grandTotal ?? totals.total ?? 0
        ) || 0;

      // customer name can be in customer.name or a top-level customerName
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

  // active customers this month (unique names)
  const activeCustomerNames = new Set<string>();
  for (const b of monthFinals) {
    if (b.customerName) activeCustomerNames.add(b.customerName.toLowerCase());
  }
  const activeCustomers = activeCustomerNames.size;

  const finalizationRate =
    totalInvoices > 0 ? (finalCount / totalInvoices) * 100 : 0;

  // Payment mix (this month, FINAL only)
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

  const pmTotalAmount = Object.values(pmTotals).reduce(
    (s, v) => s + v,
    0
  );

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

  // Last 7 days revenue (FINAL)
  const last7: { label: string; weekday: string; total: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);

    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);

    const total = finals
      .filter((b) => b.date >= dayStart && b.date < dayEnd)
      .reduce((s, b) => s + b.grandTotal, 0);

    last7.push({
      label: d.getDate().toString().padStart(2, "0"),
      weekday: d.toLocaleDateString(undefined, { weekday: "short" }),
      total,
    });
  }

  const maxDayTotal = Math.max(...last7.map((d) => d.total), 0);
  const weekTotal = last7.reduce((s, d) => s + d.total, 0);

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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      {/* Header */}
      <header className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
            Overview
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
            XiphiasSpa control room
          </h1>
          <p className="mt-1 text-xs text-muted sm:text-sm">
            Live snapshot of{" "}
            <span className="font-medium text-foreground">{monthLabel}</span>{" "}
            performance across invoices, expenses, and payments.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex max-w-xs items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] text-muted">
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
              {roleLabel}
            </span>
            <span className="max-w-[160px] truncate font-mono text-[10px] sm:max-w-[220px]">
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

      <main className="space-y-6 lg:space-y-8">
        {/* Top KPIs */}
        <section className="grid gap-4 md:grid-cols-3">
          {/* Today revenue */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  Today revenue
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                  {inr(todayRevenue)}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Final bills created since midnight.
                </p>
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                {todayCount} invoice{todayCount === 1 ? "" : "s"}
              </span>
            </div>
            {role === "ADMIN" && (
              <p className="mt-2 text-[11px] text-muted">
                Today profit:{" "}
                <span
                  className={
                    todayProfit >= 0
                      ? "font-semibold text-emerald-600"
                      : "font-semibold text-danger"
                  }
                >
                  {inr(todayProfit)}
                </span>{" "}
                ({inr(todayExpensesTotal)} expenses)
              </p>
            )}
          </div>

          {/* This month revenue */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                  This month revenue
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                  {inr(monthRevenue)}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {monthInvoiceCount} final invoice
                  {monthInvoiceCount === 1 ? "" : "s"} this month.
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 text-[10px]">
                {revenueChangePct !== null ? (
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 font-medium ${
                      revenueChangePct >= 0
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-danger/10 text-danger"
                    }`}
                  >
                    {revenueChangePct >= 0 ? "↑" : "↓"}{" "}
                    {Math.abs(revenueChangePct).toFixed(1)}%
                  </span>
                ) : (
                  <span className="inline-flex rounded-full bg-muted/40 px-2 py-0.5 text-muted">
                    No last month data
                  </span>
                )}
                <span className="text-muted">
                  vs previous month revenue
                </span>
              </div>
            </div>
          </div>

          {/* Average bill & status */}
          <div className="flex flex-col justify-between rounded-2xl border border-border bg-card px-4 py-3 shadow-sm sm:px-5 sm:py-4">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-muted">
                Average bill
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight sm:text-2xl">
                {inr(avgBill)}
              </p>
              <p className="mt-1 text-[11px] text-muted">
                Per finalized invoice • {activeCustomers} active customers
                this month.
              </p>
            </div>

            <div className="mt-3 space-y-2 text-[11px] text-muted">
              <div className="flex items-center justify-between gap-2">
                <span>Finalization rate</span>
                <span className="font-medium text-foreground">
                  {finalizationRate.toFixed(1)}%
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full bg-emerald-500"
                  style={{
                    width: `${Math.min(finalizationRate, 100).toFixed(1)}%`,
                  }}
                />
              </div>
              <div className="grid gap-2 pt-1 sm:grid-cols-3">
                <div>
                  <span className="text-muted">Final</span>
                  <div className="font-semibold text-foreground">
                    {finalCount}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Draft</span>
                  <div className="font-semibold text-foreground">
                    {draftCount}
                  </div>
                </div>
                <div>
                  <span className="text-muted">Void</span>
                  <div className="font-semibold text-foreground">
                    {voidCount}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Middle row: last 7 days + payment mix & quick actions & profit (admin) */}
        <section className="grid gap-4 lg:grid-cols-[minmax(0,2.1fr)_minmax(0,1.4fr)]">
          {/* Last 7 days chart */}
          <div className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  Last 7 days revenue
                </h2>
                <p className="mt-1 text-[11px] text-muted sm:text-xs">
                  Daily totals from finalized invoices.
                </p>
              </div>
              <div className="text-right text-[11px] text-muted">
                <div className="text-xs font-medium text-foreground">
                  {inr(weekTotal)}
                </div>
                <div>Total for last 7 days</div>
              </div>
            </div>

            <div className="mt-4 flex items-end gap-2">
              {last7.map((d) => {
                const pct =
                  maxDayTotal > 0 ? (d.total / maxDayTotal) * 100 : 0;
                const barHeight = pct === 0 ? 4 : pct;
                return (
                  <div key={d.label} className="flex-1 text-center">
                    <div className="flex h-28 w-full items-end justify-center rounded-full bg-muted/20">
                      <div
                        className="w-3 rounded-full bg-primary sm:w-4"
                        style={{ height: `${barHeight}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-muted">
                      <div>{d.weekday.slice(0, 2)}</div>
                      <div>{d.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right column: profit (admin) + payment mix + quick actions */}
          <div className="space-y-4">
            {role === "ADMIN" && (
              <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
                <h2 className="text-sm font-semibold text-foreground sm:text-base">
                  This month profit
                </h2>
                <p className="mt-1 text-[11px] text-muted sm:text-xs">
                  Revenue minus recorded expenses for{" "}
                  {monthLabel}.
                </p>

                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <div>
                    <p className="text-[11px] text-muted">Net profit</p>
                    <p
                      className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${
                        monthProfit >= 0
                          ? "text-emerald-600"
                          : "text-danger"
                      }`}
                    >
                      {inr(monthProfit)}
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
              </section>
            )}

            {/* Payment mix */}
            <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Payment mix (this month)
              </h2>
              <p className="mt-1 text-[11px] text-muted sm:text-xs">
                Distribution by payment mode for finalized invoices in{" "}
                {monthLabel}.
              </p>

              {pmTotalAmount > 0 && paymentMix.length > 0 ? (
                <>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted/20">
                    {paymentSegments.map((seg) => (
                      <div
                        key={seg.key}
                        className={seg.color + " h-full"}
                        style={{ width: `${seg.width}%` }}
                      />
                    ))}
                  </div>

                  <div className="mt-3 grid gap-2 text-[11px] sm:grid-cols-2">
                    {paymentMix.map((pm) => {
                      const amount = pmTotals[pm.key] || 0;
                      const pct =
                        pmTotalAmount > 0
                          ? (amount / pmTotalAmount) * 100
                          : 0;
                      return (
                        <div
                          key={pm.key}
                          className="flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${pm.color}`}
                            />
                            <span className="font-medium text-foreground">
                              {pm.label}
                            </span>
                          </div>
                          <div className="text-right text-muted">
                            <div>{inr(amount)}</div>
                            <div>{pct.toFixed(0)}%</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-[11px] text-muted">
                  No finalized invoices for this month yet.
                </p>
              )}
            </section>

            {/* Quick actions */}
            <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-5 sm:py-5">
              <h2 className="text-sm font-semibold text-foreground sm:text-base">
                Quick actions
              </h2>
              <p className="mt-1 text-[11px] text-muted sm:text-xs">
                Jump into common workflows.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {cards.map((card) => (
                  <a
                    key={card.href}
                    href={card.href}
                    className="inline-flex items-center justify-center rounded-full border border-border bg-background px-3 py-2 text-xs font-medium text-foreground shadow-sm hover:bg-card"
                  >
                    {card.title}
                  </a>
                ))}
              </div>
            </section>
          </div>
        </section>

        {/* Recent invoices list */}
        <RecentInvoices />
      </main>
    </div>
  );
}