// src/app/(app)/dashboard/page.tsx
import { getSession } from "@/lib/session";
import { listBills } from "@/store/bills";
import RecentInvoices from "@/components/dashboard/RecentInvoices";
import StatsRow from "@/components/dashboard/StatsRow";
import ChartsRow from "@/components/dashboard/ChartsRow";
import SidePanel from "@/components/dashboard/SidePanel";

export const dynamic = "force-dynamic";

type Role = "ADMIN" | "CASHIER" | "ACCOUNTS" | undefined;
type BillStatus = "FINAL" | "DRAFT" | "VOID";

type ParsedBill = {
  ts: number;
  dateISO: string;
  date: Date;
  status: BillStatus;
  grandTotal: number;
  paymentMode: string;
  customerName: string;
};

export default async function DashboardPage() {
  const session = await getSession();
  const role = session.user?.role as Role;
  const userEmail = session.user?.email || "";

  const cards =
    role === "ADMIN"
      ? [
          { title: "Create Bill", href: "/billing" },
          { title: "Manage Menu", href: "/menu" },
          { title: "Invoices", href: "/invoices" },
          { title: "Reports", href: "/reports" },
        ]
      : role === "ACCOUNTS"
      ? [
          { title: "Invoices", href: "/invoices" },
          { title: "Reports", href: "/reports" },
        ]
      : // CASHIER (and fallback)
        [{ title: "Create Bill", href: "/billing" }];

  const roleLabel =
    role === "ADMIN"
      ? "Admin"
      : role === "CASHIER"
      ? "Cashier"
      : role === "ACCOUNTS"
      ? "Accounts"
      : "User";

  // ─────────────────────────────────────
  // Analytics from Google Sheets bills
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

  const allBills = await listBills();

  const parsed: ParsedBill[] = allBills
    .map((b: any) => {
      const rawDate = b.finalizedAt || b.createdAt;
      const dateISO = String(rawDate ?? "");
      const ts = Date.parse(dateISO);
      const status = (b.status as BillStatus) ?? "DRAFT";
      const grandTotal = Number(b.totals?.grandTotal ?? 0);
      const paymentMode = String(b.paymentMode ?? "");
      const customerName = String(b.customer?.name ?? "");

      return {
        ts,
        dateISO,
        date: new Date(dateISO),
        status,
        grandTotal,
        paymentMode,
        customerName,
      };
    })
    .filter((x) => Number.isFinite(x.ts));

  const totalInvoices = parsed.length;
  const finals = parsed.filter((b) => b.status === "FINAL");
  const finalCount = finals.length;
  const draftCount = parsed.filter((b) => b.status === "DRAFT").length;
  const voidCount = parsed.filter((b) => b.status === "VOID").length;

  const monthFinals = finals.filter((b) => b.date >= startOfMonth);
  const prevMonthFinals = finals.filter(
    (b) => b.date >= startOfPrevMonth && b.date <= endOfPrevMonth
  );
  const todayFinals = finals.filter((b) => b.date >= startOfToday);

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
    const name = b.customerName.trim();
    if (name) activeCustomerNames.add(name.toLowerCase());
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

  return (
    <div className="mx-auto max-w-6xl space-y-8 pb-10 lg:space-y-10">
      {/* Header / overview card */}
      <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Dashboard
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Business overview
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              High-level snapshot of revenue, invoices and payment mix for{" "}
              <span className="font-medium text-foreground">{monthLabel}</span>.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-xl bg-background px-3 py-2 text-[11px] text-muted">
              <div className="text-xs font-semibold text-foreground">
                {roleLabel} workspace
              </div>
              <div className="mt-1 truncate max-w-[220px]">
                {userEmail || "Signed in"}
              </div>
              <div className="mt-1 text-[11px]">
                {totalInvoices} invoices • {finalCount} final
              </div>
            </div>
            <div className="rounded-full border border-border bg-background px-3 py-1.5 text-[11px] text-muted">
              Today:{" "}
              <span className="font-medium text-foreground">
                {todayLabel}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* KPI row like admin template */}
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
      />

      {/* Charts row with graphics / lines */}
      <ChartsRow
        last7={last7}
        maxDayTotal={maxDayTotal}
        weekTotal={weekTotal}
        paymentMix={paymentMix}
        paymentSegments={paymentSegments}
        pmTotals={pmTotals}
        pmTotalAmount={pmTotalAmount}
      />

      {/* Lower section: recent invoices + side panel */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,2.2fr)_minmax(0,1.1fr)]">
        <RecentInvoices />
        <SidePanel roleLabel={roleLabel} cards={cards} />
      </section>
    </div>
  );
}