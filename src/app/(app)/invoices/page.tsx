import Link from "next/link";
import { inr } from "@/lib/format";
import { getSession } from "@/lib/session";
import DeleteButton from "@/components/invoice/DeleteButton";
import { readRows } from "@/lib/sheets";
import InvoicesFiltersBar from "@/components/invoice/InvoicesFiltersBar";

type SP = {
  q?: string;
  from?: string; // usually YYYY-MM-DD
  to?: string; // usually YYYY-MM-DD
  status?: "FINAL" | "DRAFT" | "VOID" | "ALL";
  page?: string; // NEW
};

type RowStatus = "FINAL" | "DRAFT" | "VOID";

type Row = {
  id?: string;
  billNo?: string;
  key: string;
  dateISO: string;
  ts: number;
  eventTs?: number;
  sortTs: number;
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

function parseEventTsFromRaw(raw: unknown, status: RowStatus): number | undefined {
  if (typeof raw !== "string" || !raw.trim()) return undefined;

  try {
    const parsed = JSON.parse(raw) as { createdAt?: string; finalizedAt?: string };
    const preferred =
      status === "FINAL"
        ? parsed.finalizedAt || parsed.createdAt
        : parsed.createdAt || parsed.finalizedAt;
    if (!preferred) return undefined;
    const t = Date.parse(preferred);
    return Number.isFinite(t) ? t : undefined;
  } catch {
    return undefined;
  }
}

function StatusBadge({ s }: { s: RowStatus }) {
  // Use theme tokens (looks consistent in light/dark)
  const base =
    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border";

  if (s === "FINAL") {
    return (
      <span className={`${base} border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300`}>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Final
      </span>
    );
  }
  if (s === "VOID") {
    return (
      <span className={`${base} border-destructive/40 bg-destructive/10 text-destructive`}>
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        Void
      </span>
    );
  }
  return (
    <span className={`${base} border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300`}>
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
      Draft
    </span>
  );
}

/** Build query string preserving existing filters */
function buildHrefWithSP(
  sp: Record<string, string | undefined>,
  patch: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  const merged = { ...sp, ...patch };

  Object.entries(merged).forEach(([k, v]) => {
    const s = String(v ?? "").trim();
    if (!s) return;
    params.set(k, s);
  });

  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function Pagination({
  baseSP,
  page,
  totalPages,
  totalItems,
  pageSize,
}: {
  baseSP: Record<string, string | undefined>;
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
}) {
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(totalItems, page * pageSize);

  // windowed pages: 1 ... (p-2) (p-1) p (p+1) (p+2) ... total
  const window = 2;
  const pages: (number | "dots")[] = [];

  const push = (x: number | "dots") => {
    if (pages.length && pages[pages.length - 1] === x) return;
    pages.push(x);
  };

  const left = Math.max(1, page - window);
  const right = Math.min(totalPages, page + window);

  push(1);
  if (left > 2) push("dots");

  for (let p = left; p <= right; p++) {
    if (p !== 1 && p !== totalPages) push(p);
  }

  if (right < totalPages - 1) push("dots");
  if (totalPages > 1) push(totalPages);

  const btnBase =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-full border px-2 text-[12px] font-medium transition";
  const btn =
    `${btnBase} border-border bg-background hover:bg-card text-foreground`;
  const btnActive =
    `${btnBase} border-primary/30 bg-primary/10 text-primary`;
  const btnDisabled =
    `${btnBase} border-border/50 bg-muted/30 text-muted-foreground pointer-events-none opacity-60`;

  const prevHref = buildHrefWithSP(baseSP, { page: String(Math.max(1, page - 1)) });
  const nextHref = buildHrefWithSP(baseSP, { page: String(Math.min(totalPages, page + 1)) });

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl bg-background/40 p-3 ring-1 ring-border/60 sm:flex-row sm:items-center sm:justify-between">
      <div className="text-[11px] text-muted-foreground">
        Showing <span className="font-medium text-foreground">{start}</span>–
        <span className="font-medium text-foreground">{end}</span> of{" "}
        <span className="font-medium text-foreground">{totalItems}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Link
          prefetch={false}
          href={prevHref}
          className={page <= 1 ? btnDisabled : btn}
          aria-disabled={page <= 1}
        >
          Prev
        </Link>

        {pages.map((p, idx) =>
          p === "dots" ? (
            <span key={`dots-${idx}`} className="px-2 text-[12px] text-muted-foreground">
              …
            </span>
          ) : (
            <Link
              key={p}
              prefetch={false}
              href={buildHrefWithSP(baseSP, { page: String(p) })}
              className={p === page ? btnActive : btn}
              aria-current={p === page ? "page" : undefined}
            >
              {p}
            </Link>
          )
        )}

        <Link
          prefetch={false}
          href={nextHref}
          className={page >= totalPages ? btnDisabled : btn}
          aria-disabled={page >= totalPages}
        >
          Next
        </Link>
      </div>
    </div>
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

  // Pagination config
  const PAGE_SIZE = 15;
  const page = Math.max(1, Number.parseInt(String(sp.page || "1"), 10) || 1);

  // Filters: treat from/to as IST local days when input is YYYY-MM-DD
  const fromStart = parseDateInputToTs(sp.from);
  const toStart = parseDateInputToTs(sp.to);

  const fromTs = Number.isFinite(fromStart) ? fromStart : Number.NEGATIVE_INFINITY;
  // end-exclusive: include the whole "to" day
  const toTs = Number.isFinite(toStart) ? toStart + DAY_MS : Number.POSITIVE_INFINITY;

  const session = await getSession();
  const role = session.user?.role;
  const isAdmin = role === "ADMIN";
  const canExport = role === "ADMIN" || role === "ACCOUNTS";
  const canEdit = role !== "ACCOUNTS";
  const canCreateBill = role === "ADMIN" || role === "CASHIER";

  const rowsRaw = await readRows("Invoices!A2:X");

  const rows: Row[] = rowsRaw
    .map((r: unknown[]) => {
      const billNo = String(r?.[0] || "").trim();
      const id = String(r?.[1] || "").trim();
      const key = billNo || id;
      if (!key) return null;

      const dateISO = String(r?.[2] || "").trim();
      const ts = parseRowDateToTs(dateISO);

      const stRaw = r?.[22];
      const st = normalizeStatus(stRaw, billNo);
      const eventTs = parseEventTsFromRaw(r?.[23], st);
      const sortTs = Number.isFinite(eventTs) ? (eventTs as number) : ts;

      return {
        id: id || undefined,
        billNo: billNo || undefined,
        key,
        dateISO,
        ts,
        eventTs,
        sortTs,
        customer: String(r?.[3] || ""),
        amount: parseMoney(r?.[15]),
        status: st,
        cashier: String(r?.[21] || ""),
      };
    })
    .filter(Boolean) as Row[];

  const filteredAll = rows
    .filter((r) => {
      if (!(r.ts >= fromTs && r.ts < toTs)) return false;
      if (status !== "ALL" && r.status !== status) return false;
      if (!q) return true;
      const hay = `${r.key} ${r.customer} ${r.cashier}`.toLowerCase();
      return hay.includes(q);
    })
    .sort((a, b) => b.sortTs - a.sortTs || b.ts - a.ts);

  // Pagination slice
  const totalItems = filteredAll.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const filtered = filteredAll.slice(startIdx, endIdx);

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

  // baseSP for pagination links (preserve filters)
  const baseSP: Record<string, string | undefined> = {
    q: sp.q || "",
    from: sp.from || "",
    to: sp.to || "",
    status: status || "ALL",
    // page will be added by Pagination
  };

  return (
    <div className="min-w-0 space-y-3 pb-24 lg:space-y-4 lg:pb-0">
      <InvoicesFiltersBar
        initialQ={sp.q || ""}
        initialFrom={sp.from || ""}
        initialTo={sp.to || ""}
        initialStatus={status || "ALL"}
        canCreateBill={canCreateBill}
        canExport={canExport}
        count={filteredAll.length} // show total matching count, not just current page
      />

      <section className="min-w-0">
        {filteredAll.length === 0 ? (
          <div className="rounded-xl bg-background/70 p-4 text-center text-xs text-muted-foreground sm:text-sm">
            No invoices match your filters.
          </div>
        ) : (
          <>
            <div className="min-w-0 overflow-hidden rounded-xl bg-background/40 ring-1 ring-border/60">
              <div className="divide-y divide-border/40">
                {filtered.map((r) => {
                  const displayTs = Number.isFinite(r.eventTs as number)
                    ? (r.eventTs as number)
                    : r.ts;
                  const hasEventTime = Number.isFinite(r.eventTs as number);
                  const dateObj = new Date(displayTs);
                  const isValid = !Number.isNaN(dateObj.getTime());
                  const dateStr = isValid ? dtDate.format(dateObj) : "—";
                  const timeStr = hasEventTime && isValid ? dtTime.format(dateObj) : "";

                  const label = r.billNo || r.id || r.key;
                  const viewHref = `/invoices/${encodeURIComponent(r.key)}`;
                  const printHref = `/invoices/${encodeURIComponent(r.key)}?print=1`;

                  return (
                    <div
                      key={r.key}
                      className="px-3 py-2.5 transition hover:bg-card/90 sm:px-4"
                    >
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

                          <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            <span className="truncate">
                              {r.customer || "Walk-in customer"}
                            </span>
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

            {/* Pagination (keep 15 per page) */}
            <Pagination
              baseSP={baseSP}
              page={safePage}
              totalPages={totalPages}
              totalItems={totalItems}
              pageSize={PAGE_SIZE}
            />
          </>
        )}
      </section>
    </div>
  );
}
