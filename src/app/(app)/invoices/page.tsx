import Link from "next/link";
import { inr } from "@/lib/format";
import { getSession } from "@/lib/session";
import DeleteButton from "@/components/invoice/DeleteButton";
import { readRows } from "@/lib/sheets";
import InvoicesFiltersBar from "@/components/invoice/InvoicesFiltersBar";

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

function StatusBadge({ s }: { s: RowStatus }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium";
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
  const toTs = (parseISO(sp.to) || Number.POSITIVE_INFINITY) + 24 * 3600 * 1000;

  const session = await getSession();
  const role = session.user?.role;
  const isAdmin = role === "ADMIN";
  const canExport = role === "ADMIN" || role === "ACCOUNTS";
  const canEdit = role !== "ACCOUNTS";

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

  const dtDate = new Intl.DateTimeFormat(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dtTime = new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="min-w-0 space-y-3 pb-24 lg:space-y-4 lg:pb-0">
      <InvoicesFiltersBar
        initialQ={sp.q || ""}
        initialFrom={sp.from || ""}
        initialTo={sp.to || ""}
        initialStatus={(status || "ALL") as any}
        canExport={canExport}
        count={filtered.length}
      />

      {/* List */}
      <section className="min-w-0">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-background/70 p-4 text-center text-xs text-muted sm:text-sm">
            No invoices match your filters.
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-xl bg-background/40 ring-1 ring-border/60">
            <div className="divide-y divide-border/40">
              {filtered.map((r) => {
                const dateObj = new Date(r.dateISO);
                const isValid = !Number.isNaN(dateObj.getTime());
                const dateStr = isValid ? dtDate.format(dateObj) : "—";
                const timeStr = isValid ? dtTime.format(dateObj) : "";

                const label = r.billNo || r.id || r.key;
                const viewHref = `/invoices/${encodeURIComponent(r.key)}`;
                const printHref = `/invoices/${encodeURIComponent(r.key)}?print=1`;

                return (
                  <div key={r.key} className="px-3 py-2.5 transition hover:bg-card/90 sm:px-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      {/* Left */}
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={viewHref}
                            prefetch={false}
                            className="truncate text-sm font-semibold text-foreground hover:text-primary hover:no-underline"
                            title={label}
                          >
                            {label}
                          </Link>
                          <StatusBadge s={r.status} />
                        </div>

                        {/* keep compact: single meta line */}
                        <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted">
                          <span className="truncate">{r.customer || "Walk-in customer"}</span>
                          <span className="hidden sm:inline">•</span>
                          <span>
                            {dateStr}
                            {timeStr ? `, ${timeStr}` : ""}
                          </span>
                          {r.cashier ? (
                            <>
                              <span className="hidden sm:inline">•</span>
                              <span className="truncate">Cashier: {r.cashier}</span>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {/* Right */}
                      <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                        <div className="text-sm font-semibold text-foreground tabular-nums">
                          {inr(r.amount)}
                        </div>

                        <div className="flex flex-wrap justify-end gap-1 text-[11px]">
                          <Link
                            href={viewHref}
                            prefetch={false}
                            className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 font-medium hover:bg-card hover:no-underline"
                          >
                            View
                          </Link>

                          <Link
                            href={printHref}
                            prefetch={false}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 font-medium hover:bg-card hover:no-underline"
                          >
                            Print
                          </Link>

                          {canEdit && r.status === "DRAFT" ? (
                            <Link
                              href={`/billing?edit=${encodeURIComponent(r.key)}`}
                              prefetch={false}
                              className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 font-medium hover:bg-card hover:no-underline"
                            >
                              Edit
                            </Link>
                          ) : null}

                          {isAdmin ? <DeleteButton idOrNo={r.key} /> : null}
                        </div>
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