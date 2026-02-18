import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCustomerByKey } from "@/lib/customers";
import { inr } from "@/lib/format";
import { getSession } from "@/lib/session";

type SP = {
  from?: string;
  to?: string;
  status?: "FINAL" | "DRAFT" | "VOID" | "ALL";
};

function fmtDate(d: string) {
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return d;
    return dt.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function StatusBadge({ s }: { s: "FINAL" | "DRAFT" | "VOID" }) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium";

  if (s === "FINAL") {
    return (
      <span
        className={`${base} border border-emerald-500/30 bg-emerald-500/10 text-emerald-300`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Final
      </span>
    );
  }
  if (s === "VOID") {
    return (
      <span className={`${base} border border-danger/40 bg-danger/10 text-danger`}>
        <span className="h-1.5 w-1.5 rounded-full bg-danger" />
        Void
      </span>
    );
  }
  return (
    <span
      className={`${base} border border-amber-500/30 bg-amber-500/10 text-amber-300`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Draft
    </span>
  );
}

export const dynamic = "force-dynamic";

export default async function CustomerDetailsPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams?: Promise<SP>;
}) {
  const session = await getSession();
  if (!session.user) redirect("/login");
  const role = session.user.role;

  const { key } = await params;
  const sp = (await searchParams) || {};
  const statusFilter = (sp.status || "ALL") as SP["status"];

  const wanted = decodeURIComponent(String(key || "").trim());
  const data = await getCustomerByKey(wanted, {
    fromISO: sp.from,
    toISO: sp.to,
    status: statusFilter,
  });

  if (!data) notFound();

  const { customer, invoices } = data;

  const billingHref = `/billing?${[
    customer.name ? `cname=${encodeURIComponent(customer.name)}` : "",
    customer.phone ? `cphone=${encodeURIComponent(customer.phone)}` : "",
    customer.email ? `cemail=${encodeURIComponent(customer.email)}` : "",
  ]
    .filter(Boolean)
    .join("&")}`;
  const canCreateBill = role === "ADMIN" || role === "CASHIER";

  return (
    <div className="space-y-4 lg:space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Customer
          </div>
          <h1 className="mt-1 truncate text-xl font-bold text-foreground">
            {customer.name || "—"}
          </h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
            <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs">
              {customer.phone || customer.key}
            </span>
            {customer.email ? (
              <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs">
                {customer.email}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/customers"
            prefetch={false}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground hover:bg-card"
          >
            Back
          </Link>
          {canCreateBill ? (
            <Link
              href={billingHref}
              prefetch={false}
              className="inline-flex h-10 items-center justify-center rounded-full bg-slate-900 px-4 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              + New bill
            </Link>
          ) : null}
        </div>
      </div>

      {/* Stats */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Last visit
          </div>
          <div className="mt-1 text-base font-bold text-foreground">
            {fmtDate(customer.lastDateISO)}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Invoices
          </div>
          <div className="mt-1 text-base font-bold text-foreground">
            {customer.invoicesCount}
          </div>
          <div className="mt-1 text-[11px] text-muted">
            Final {customer.finalCount} · Draft {customer.draftCount} · Void {customer.voidCount}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Final spend
          </div>
          <div className="mt-1 text-base font-bold text-foreground">
            {inr(customer.totalFinal)}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Key
          </div>
          <div className="mt-1 truncate text-sm font-semibold text-foreground">
            {customer.key}
          </div>
          <div className="mt-1 text-[11px] text-muted">(normalized phone / email)</div>
        </div>
      </section>

      {/* Filters */}
      <form
        className="rounded-2xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4"
        method="GET"
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            name="from"
            type="date"
            defaultValue={sp.from || ""}
            className="h-10 rounded-full border border-border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <input
            name="to"
            type="date"
            defaultValue={sp.to || ""}
            className="h-10 rounded-full border border-border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />

          <select
            name="status"
            defaultValue={statusFilter}
            className="h-10 rounded-full border border-border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="ALL">All</option>
            <option value="FINAL">Final</option>
            <option value="DRAFT">Draft</option>
            <option value="VOID">Void</option>
          </select>

          <button
            type="submit"
            className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-card"
          >
            Apply
          </button>
        </div>
      </form>

      {/* History */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Invoice history</h2>
          <p className="mt-1 text-[11px] text-muted">
            Click an invoice to open/print it.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-background/60 text-[11px] font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3 text-left">Invoice</th>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Cashier</th>
                <th className="px-4 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {invoices.map((r) => (
                <tr key={`${r.invoiceKey}-${r.ts}`} className="hover:bg-background/40">
                  <td className="px-4 py-3">
                    <Link
                      href={`/invoices/${encodeURIComponent(r.invoiceKey)}`}
                      prefetch={false}
                      className="font-semibold text-foreground hover:underline"
                    >
                      {r.billNo || r.draftId || r.invoiceKey}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{fmtDate(r.dateISO)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge s={r.status} />
                  </td>
                  <td className="px-4 py-3 text-muted">{r.cashier || "—"}</td>
                  <td className="px-4 py-3 text-right font-semibold text-foreground">
                    {inr(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
