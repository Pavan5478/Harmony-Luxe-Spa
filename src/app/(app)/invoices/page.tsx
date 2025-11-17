// src/app/(app)/invoices/page.tsx
import Link from "next/link";
import { inr } from "@/lib/format";
import { listBills } from "@/store/bills";
import { getSession } from "@/lib/session";
import DeleteButton from "@/components/invoice/DeleteButton";
import type { BillDraft, BillFinal } from "@/types/billing";

type SP = {
  q?: string;
  from?: string;
  to?: string;
  status?: "FINAL" | "DRAFT" | "VOID" | "ALL";
};

type AnyBill = BillDraft | BillFinal;
type RowStatus = "FINAL" | "DRAFT" | "VOID";

type Row = {
  id?: string;
  billNo?: string;
  key: string;
  dateISO: string;
  ts: number;
  customer: string;
  amount: number;
  status: RowStatus;
  cashier: string;
};

function parseISO(d?: string) {
  if (!d) return NaN;
  const t = Date.parse(d);
  return Number.isFinite(t) ? t : NaN;
}

export default async function InvoicesListPage({
  searchParams,
}: {
  searchParams?: Promise<SP>;
}) {
  const sp = (await searchParams) || {};
  const q = (sp.q || "").trim().toLowerCase();
  const status = (sp.status || "ALL") as SP["status"];
  const fromTs = parseISO(sp.from) || Number.NEGATIVE_INFINITY;
  const toTs =
    (parseISO(sp.to) || Number.POSITIVE_INFINITY) +
    24 * 3600 * 1000;

  const session = await getSession();
  const role = session.user?.role;
  const isAdmin = role === "ADMIN";
  const canExport = role === "ADMIN" || role === "ACCOUNTS";
  const canEdit = role !== "ACCOUNTS";

  const allBills = (await listBills()) as AnyBill[];

  const rows: Row[] = allBills
    .map((b) => {
      const dateISO =
        (b as any).finalizedAt || (b as any).createdAt;
      const ts = Date.parse(dateISO as string);

      return {
        id: (b as any).id as string | undefined,
        billNo: (b as any).billNo as string | undefined,
        key:
          ((b as any).billNo as string | undefined) ??
          ((b as any).id as string),
        dateISO: dateISO as string,
        ts,
        customer: (b as any).customer?.name || "",
        amount: Number((b as any).totals?.grandTotal || 0),
        status: ((b as any).status as RowStatus) || "DRAFT",
        cashier: (b as any).cashierEmail || "",
      };
    })
    .filter((r) => {
      if (!(r.ts >= fromTs && r.ts < toTs)) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      const hay = `${r.key} ${r.customer} ${r.cashier}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.ts - a.ts);

  const totalAmount = rows.reduce((s, r) => s + r.amount, 0);
  const finalCount = rows.filter((r) => r.status === "FINAL").length;

  const exportHref = `/api/reports/export?${[
    sp.from ? `from=${encodeURIComponent(sp.from)}` : "",
    sp.to ? `to=${encodeURIComponent(sp.to)}` : "",
  ]
    .filter(Boolean)
    .join("&")}`;

  function statusBadge(s: RowStatus) {
    const base =
      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium";

    if (s === "FINAL") {
      return (
        <span
          className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-100`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Final
        </span>
      );
    }

    if (s === "VOID") {
      return (
        <span
          className={`${base} bg-danger/5 text-danger border border-danger/30`}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-danger" />
          Void
        </span>
      );
    }

    return (
      <span
        className={`${base} bg-amber-50 text-amber-800 border border-amber-100`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
        Draft
      </span>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-6">
      {/* Header card */}
      <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Invoices
            </p>
            <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
              Invoice history
            </h1>
            <p className="mt-1 text-xs text-muted sm:text-sm">
              Search, filter and export all bills generated from your
              workspace.
            </p>
          </div>
          <div className="grid gap-2 text-[11px] text-muted sm:text-xs">
            <div className="inline-flex items-center justify-between rounded-xl bg-background px-3 py-2">
              <span>Total invoices</span>
              <span className="font-semibold text-foreground">
                {rows.length}
              </span>
            </div>
            <div className="inline-flex items-center justify-between rounded-xl bg-background px-3 py-2">
              <span>Finalized</span>
              <span className="font-semibold text-foreground">
                {finalCount}
              </span>
            </div>
            <div className="inline-flex items-center justify-between rounded-xl bg-background px-3 py-2">
              <span>Grand total (filtered)</span>
              <span className="font-semibold text-foreground">
                {inr(totalAmount)}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <form
        className="grid gap-3 rounded-2xl border border-border bg-card px-4 py-4 shadow-sm md:grid-cols-6 sm:px-6 sm:py-5"
        action="/invoices"
        method="GET"
      >
        <div className="md:col-span-2">
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Search
            <span className="font-normal normal-case text-[11px] text-muted">
              {" "}
              (bill no / customer / cashier)
            </span>
          </label>
          <input
            name="q"
            defaultValue={sp.q || ""}
            className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
            From
          </label>
          <input
            name="from"
            type="date"
            defaultValue={sp.from || ""}
            className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
            To
          </label>
          <input
            name="to"
            type="date"
            defaultValue={sp.to || ""}
            className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        </div>
        <div>
          <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
            Status
          </label>
          <select
            name="status"
            defaultValue={status}
            className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="ALL">All</option>
            <option value="FINAL">Final</option>
            <option value="DRAFT">Draft</option>
            <option value="VOID">Void</option>
          </select>
        </div>
        <div className="flex items-end gap-2 md:justify-end">
          <button
            className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card"
            type="submit"
          >
            Apply filters
          </button>
          {canExport && (
            <a
              className="inline-flex items-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card"
              href={exportHref}
            >
              Export CSV
            </a>
          )}
        </div>
      </form>

      {/* Table */}
      <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm">
        <table className="min-w-full text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-border/70 bg-background/70 text-[11px] uppercase tracking-wide text-muted">
              <th className="py-2 pl-4 pr-2 font-medium">
                Bill no
              </th>
              <th className="py-2 px-2 font-medium">Date</th>
              <th className="py-2 px-2 font-medium">Customer</th>
              <th className="py-2 px-2 font-medium">Status</th>
              <th className="py-2 px-2 text-right font-medium">
                Grand total
              </th>
              <th className="py-2 pr-4 text-right font-medium">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.key}
                className="border-b border-border/60 bg-card/40 hover:bg-background/80"
              >
                <td className="py-2 pl-4 pr-2">
                  <Link
                    className="text-sm font-medium text-primary hover:underline"
                    href={`/invoices/${encodeURIComponent(r.key)}`}
                  >
                    {r.billNo || r.id}
                  </Link>
                  <div className="text-[11px] text-muted">
                    Cashier: {r.cashier || "—"}
                  </div>
                </td>
                <td className="px-2 align-top">
                  <div className="text-xs">
                    {new Date(r.dateISO).toLocaleDateString()}
                  </div>
                  <div className="text-[11px] text-muted">
                    {new Date(r.dateISO).toLocaleTimeString()}
                  </div>
                </td>
                <td className="px-2 align-top">
                  {r.customer || "-"}
                </td>
                <td className="px-2 align-top">
                  {statusBadge(r.status)}
                </td>
                <td className="px-2 text-right align-top">
                  <div className="font-medium">
                    {inr(r.amount)}
                  </div>
                </td>
                <td className="pr-4 text-right align-top">
                  <div className="inline-flex flex-wrap justify-end gap-1">
                    <a
                      className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-card"
                      href={`/invoices/${encodeURIComponent(r.key)}`}
                    >
                      View
                    </a>
                    <a
                      className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-card"
                      href={`/invoices/${encodeURIComponent(
                        r.key
                      )}?print=1`}
                    >
                      Print
                    </a>
                    {canEdit && r.status === "DRAFT" && (
                      <a
                        className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium hover:bg-card"
                        href={`/billing?edit=${encodeURIComponent(
                          r.key
                        )}`}
                      >
                        Edit draft
                      </a>
                    )}
                    {isAdmin && (
                      <DeleteButton idOrNo={r.key} />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="p-4 text-center text-xs text-muted sm:text-sm"
                >
                  No invoices match your filters yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}