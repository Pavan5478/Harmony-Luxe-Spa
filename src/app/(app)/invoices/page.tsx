// src/app/(app)/invoices/page.tsx
import Link from "next/link";
import { inr } from "@/lib/format";
import { getSession } from "@/lib/session";
import DeleteButton from "@/components/invoice/DeleteButton";
import { readRows } from "@/lib/sheets";

type SP = {
  q?: string;
  from?: string;
  to?: string;
  status?: "FINAL" | "DRAFT" | "VOID" | "ALL";
};

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

function statusBadge(s: RowStatus) {
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium";

  if (s === "FINAL") {
    return (
      <span className={`${base} border border-emerald-500/30 bg-emerald-500/10 text-emerald-300`}>
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
    <span className={`${base} border border-amber-500/30 bg-amber-500/10 text-amber-300`}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Draft
    </span>
  );
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
    (parseISO(sp.to) || Number.POSITIVE_INFINITY) + 24 * 3600 * 1000;

  const session = await getSession();
  const role = session.user?.role;
  const isAdmin = role === "ADMIN";
  const canExport = role === "ADMIN" || role === "ACCOUNTS";
  const canEdit = role !== "ACCOUNTS";

  // ✅ FAST: read only A..W (skip RawJson X)
  const rowsRaw = await readRows("Invoices!A2:W");

  const rows: Row[] = rowsRaw
    .map((r: any[]) => {
      const billNo = String(r?.[0] || "").trim();
      const id = String(r?.[1] || "").trim();
      const key = billNo || id;
      if (!key) return null;

      const dateISO = String(r?.[2] || "").trim();
      const ts = Date.parse(dateISO);

      let st = String(r?.[22] || "").trim().toUpperCase();
      if (!st) st = billNo ? "FINAL" : "DRAFT";

      return {
        id: id || undefined,
        billNo: billNo || undefined,
        key,
        dateISO,
        ts: Number.isFinite(ts) ? ts : 0,
        customer: String(r?.[3] || ""),
        amount: Number(r?.[15] || 0),
        status: (st as RowStatus) || "DRAFT",
        cashier: String(r?.[21] || ""),
      };
    })
    .filter(Boolean) as Row[];

  const filtered = rows
    .filter((r) => {
      if (!(r.ts >= fromTs && r.ts < toTs)) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      const hay = `${r.key} ${r.customer} ${r.cashier}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.ts - a.ts);

  const totalAmount = filtered.reduce((s, r) => s + r.amount, 0);
  const finalCount = filtered.filter((r) => r.status === "FINAL").length;

  const exportHref = `/api/reports/export?${[
    sp.from ? `from=${encodeURIComponent(sp.from)}` : "",
    sp.to ? `to=${encodeURIComponent(sp.to)}` : "",
  ]
    .filter(Boolean)
    .join("&")}`;

  return (
    <div className="space-y-5 lg:space-y-6">
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
              Search, filter and export all bills. Click any row to open the full invoice view.
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            <div className="flex flex-wrap justify-end gap-2 text-[11px] text-muted sm:text-xs">
              <span className="inline-flex items-center rounded-full bg-background px-3 py-1.5">
                Total <span className="ml-1 font-semibold text-foreground">{filtered.length}</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-background px-3 py-1.5">
                Final <span className="ml-1 font-semibold text-foreground">{finalCount}</span>
              </span>
              <span className="inline-flex items-center rounded-full bg-background px-3 py-1.5">
                Filtered total <span className="ml-1 font-semibold text-foreground">{inr(totalAmount)}</span>
              </span>
            </div>
            <Link
              href="/billing"
              className="inline-flex items-center justify-center rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              + New bill
            </Link>
          </div>
        </div>
      </section>

      <form
        className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm sm:px-6 sm:py-4"
        action="/invoices"
        method="GET"
      >
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="md:flex-1">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted">
              Search{" "}
              <span className="font-normal normal-case text-[11px] text-muted">
                (bill no / customer / cashier)
              </span>
            </label>
            <input
              name="q"
              defaultValue={sp.q || ""}
              className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              placeholder="Type to search invoices…"
            />
          </div>

          <div className="flex flex-wrap gap-3 md:justify-end">
            <div className="w-full min-w-[150px] md:w-auto">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted">From</label>
              <input
                name="from"
                type="date"
                defaultValue={sp.from || ""}
                className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="w-full min-w-[150px] md:w-auto">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted">To</label>
              <input
                name="to"
                type="date"
                defaultValue={sp.to || ""}
                className="mt-1 w-full rounded-full border border-border bg-background px-3.5 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>

            <div className="w-full min-w-[140px] md:w-auto">
              <label className="text-[11px] font-medium uppercase tracking-wide text-muted">Status</label>
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

            <div className="flex w-full items-end gap-2 md:w-auto md:justify-end">
              <button
                className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card md:flex-none"
                type="submit"
              >
                Apply filters
              </button>
              {canExport && (
                <a
                  className="inline-flex flex-1 items-center justify-center rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card md:flex-none"
                  href={exportHref}
                >
                  Export CSV
                </a>
              )}
            </div>
          </div>
        </div>
      </form>

      <section className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-background/70 p-4 text-center text-xs text-muted sm:text-sm">
            No invoices match your filters yet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl bg-background/40 ring-1 ring-border/60">
            <div className="divide-y divide-border/40">
              {filtered.map((r, idx) => {
                const dateObj = new Date(r.dateISO);
                const isValid = !Number.isNaN(dateObj.getTime());
                const dateStr = isValid
                  ? dateObj.toLocaleDateString(undefined, {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "—";
                const timeStr = isValid
                  ? dateObj.toLocaleTimeString(undefined, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";

                const label = r.billNo || r.id || r.key;
                const serial = idx + 1;

                return (
                  <div
                    key={r.key}
                    className="group flex flex-col gap-3 px-3.5 py-3 text-xs transition hover:bg-card/90 sm:flex-row sm:items-center sm:justify-between sm:px-4"
                  >
                    <div className="flex flex-1 items-start gap-3">
                      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                        {serial}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            className="text-sm font-semibold text-foreground hover:text-primary hover:no-underline"
                            href={`/invoices/${encodeURIComponent(r.key)}`}
                          >
                            {label}
                          </Link>
                          {statusBadge(r.status)}
                        </div>
                        <div className="text-[11px] text-muted">{r.customer || "Walk-in customer"}</div>
                        <div className="flex flex-wrap gap-2 text-[10px] text-muted">
                          <span>{dateStr}</span>
                          {timeStr && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span>{timeStr}</span>
                            </>
                          )}
                          {r.cashier && (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span>Cashier: {r.cashier}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 sm:min-w-[230px]">
                      <div className="text-right text-sm font-semibold text-foreground">{inr(r.amount)}</div>
                      <div className="flex flex-wrap justify-end gap-1 text-[11px]">
                        <Link
                          className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 font-medium hover:bg-card hover:no-underline"
                          href={`/invoices/${encodeURIComponent(r.key)}`}
                        >
                          View
                        </Link>
                        <Link
                          className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 font-medium hover:bg-card hover:no-underline"
                          href={`/invoices/${encodeURIComponent(r.key)}?print=1`}
                        >
                          Print
                        </Link>
                        {canEdit && r.status === "DRAFT" && (
                          <Link
                            className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 font-medium hover:bg-card hover:no-underline"
                            href={`/billing?edit=${encodeURIComponent(r.key)}`}
                          >
                            Edit draft
                          </Link>
                        )}
                        {isAdmin && <DeleteButton idOrNo={r.key} />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}