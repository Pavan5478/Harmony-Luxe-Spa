import Link from "next/link";
import { inr } from "@/lib/format";
import { getSession } from "@/lib/session";
import DeleteButton from "@/components/invoice/DeleteButton";
import { readRows } from "@/lib/sheets";
import InvoicesFiltersBar from "@/components/invoice/InvoicesFiltersBar";

type SP = {
  q?: string;
  from?: string; // usually YYYY-MM-DD
  to?: string;   // usually YYYY-MM-DD
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

const IST_TZ = "Asia/Kolkata";
const IST_OFFSET = "+05:30";
const DAY_MS = 24 * 60 * 60 * 1000;

function isYMD(v: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(v);
}

function parseDateInputToTs(v?: string): number {
  if (!v) return NaN;
  const s = String(v).trim();
  if (!s) return NaN;

  // If date input is YYYY-MM-DD, treat as IST midnight to avoid off-by-one filtering.
  if (isYMD(s)) {
    const t = Date.parse(`${s}T00:00:00${IST_OFFSET}`);
    return Number.isFinite(t) ? t : NaN;
  }

  const t = Date.parse(s);
  return Number.isFinite(t) ? t : NaN;
}

function parseRowDateToTs(dateISO: string): number {
  const s = String(dateISO || "").trim();
  if (!s) return 0;

  // If sheet stores YYYY-MM-DD, treat as IST midnight
  if (isYMD(s)) {
    const t = Date.parse(`${s}T00:00:00${IST_OFFSET}`);
    return Number.isFinite(t) ? t : 0;
  }

  const t = Date.parse(s);
  return Number.isFinite(t) ? t : 0;
}

function parseMoney(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  const s = String(v ?? "").trim();
  if (!s) return 0;

  // remove currency symbols, commas, spaces; keep digits, dot, minus
  const cleaned = s.replace(/[^\d.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function normalizeStatus(raw: unknown, billNo?: string): RowStatus {
  const s = String(raw ?? "").trim().toUpperCase();
  if (s === "FINAL" || s === "DRAFT" || s === "VOID") return s;
  // fallback inference
  return billNo ? "FINAL" : "DRAFT";
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

  // Filters: treat from/to as IST local days when input is YYYY-MM-DD
  const fromStart = parseDateInputToTs(sp.from);
  const toStart = parseDateInputToTs(sp.to);

  const fromTs = Number.isFinite(fromStart) ? fromStart : Number.NEGATIVE_INFINITY;
  // end-exclusive: include the whole "to" day
  const toTs =
    Number.isFinite(toStart) ? toStart + DAY_MS : Number.POSITIVE_INFINITY;

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
      const ts = parseRowDateToTs(dateISO);

      const stRaw = r?.[22];
      const st = normalizeStatus(stRaw, billNo);

      return {
        id: id || undefined,
        billNo: billNo || undefined,
        key,
        dateISO,
        ts,
        customer: String(r?.[3] || ""),
        amount: parseMoney(r?.[15]),
        status: st,
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

  const dtDate = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TZ,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const dtTime = new Intl.DateTimeFormat("en-IN", {
    timeZone: IST_TZ,
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

      <section className="min-w-0">
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-background/70 p-4 text-center text-xs text-muted sm:text-sm">
            No invoices match your filters.
          </div>
        ) : (
          <div className="min-w-0 overflow-hidden rounded-xl bg-background/40 ring-1 ring-border/60">
            <div className="divide-y divide-border/40">
              {filtered.map((r) => {
                const dateObj = new Date(r.ts);
                const isValid = !Number.isNaN(dateObj.getTime());
                const dateStr = isValid ? dtDate.format(dateObj) : "—";
                const timeStr = isValid ? dtTime.format(dateObj) : "";

                const label = r.billNo || r.id || r.key;
                const viewHref = `/invoices/${encodeURIComponent(r.key)}`;
                const printHref = `/invoices/${encodeURIComponent(r.key)}?print=1`;

                return (
                  <div key={r.key} className="px-3 py-2.5 transition hover:bg-card/90 sm:px-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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

                          {/* Print only for FINAL */}
                          {r.status === "FINAL" ? (
                            <Link
                              href={printHref}
                              prefetch={false}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 font-medium hover:bg-card hover:no-underline"
                            >
                              Print
                            </Link>
                          ) : null}

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