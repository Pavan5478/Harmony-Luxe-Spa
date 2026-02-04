import Link from "next/link";
import { redirect } from "next/navigation";
import { inr } from "@/lib/format";
import { getSession } from "@/lib/session";
import { listCustomers } from "@/lib/customers";
import RebuildCustomersButton from "./RebuildCustomersButton.client";

type SP = {
  q?: string;
  from?: string;
  to?: string;
  status?: "FINAL" | "DRAFT" | "VOID" | "ALL";
  page?: string; // NEW
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
  const btn = `${btnBase} border-border bg-background hover:bg-card text-foreground`;
  const btnActive = `${btnBase} border-primary/30 bg-primary/10 text-primary`;
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

export const dynamic = "force-dynamic";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams?: Promise<SP>;
}) {
  const session = await getSession();
  if (!session.user) redirect("/login");

  const role = session.user.role;

  const sp = (await searchParams) || {};

  // Pagination config
  const PAGE_SIZE = 15;
  const page = Math.max(1, Number.parseInt(String(sp.page || "1"), 10) || 1);

  // Fetch full filtered list (existing lib call)
  const customersAll = await listCustomers({
    q: sp.q,
    fromISO: sp.from,
    toISO: sp.to,
    status: (sp.status || "ALL") as any,
  });

  // Slice for current page
  const totalItems = customersAll.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);

  const startIdx = (safePage - 1) * PAGE_SIZE;
  const endIdx = startIdx + PAGE_SIZE;
  const customers = customersAll.slice(startIdx, endIdx);

  const baseSP: Record<string, string | undefined> = {
    q: sp.q || "",
    from: sp.from || "",
    to: sp.to || "",
    status: (sp.status || "ALL") as any,
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      <form
        className="rounded-2xl border border-border bg-card px-3 py-3 shadow-sm sm:px-4"
        action="/customers"
        method="GET"
      >
        <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 items-center gap-2">
            <div className="relative w-full">
              <input
                name="q"
                defaultValue={sp.q || ""}
                className="w-full rounded-full border border-border bg-background px-4 py-2.5 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                placeholder="Search name / phone / email…"
              />
            </div>

            <button
              type="submit"
              className="hidden shrink-0 items-center justify-center rounded-full border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground hover:bg-card lg:inline-flex"
            >
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
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
              defaultValue={(sp.status || "ALL") as any}
              className="h-10 rounded-full border border-border bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <option value="ALL">All</option>
              <option value="FINAL">Final</option>
              <option value="DRAFT">Draft</option>
              <option value="VOID">Void</option>
            </select>

            {/* Reset page to 1 on apply by omitting page input */}
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-card"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
          <div>
            Showing{" "}
            <span className="font-semibold text-foreground">{customersAll.length}</span>{" "}
            customers
          </div>
          <div className="hidden sm:block">Tip: Phone is the primary key.</div>
        </div>

        {role === "ADMIN" ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted-foreground">
              Admin: rebuild the customer list from existing invoices.
            </div>
            <RebuildCustomersButton />
          </div>
        ) : null}
      </form>

      <section>
        {customersAll.length === 0 ? (
          <div className="rounded-xl bg-background/70 p-4 text-center text-xs text-muted-foreground sm:text-sm">
            No customers match your filters.
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-background/60 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-4 py-3 text-left">Customer</th>
                      <th className="px-4 py-3 text-left">Phone</th>
                      <th className="px-4 py-3 text-left">Last visit</th>
                      <th className="px-4 py-3 text-center">Invoices</th>
                      <th className="px-4 py-3 text-right">Final spend</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {customers.map((c) => (
                      <tr key={c.key} className="hover:bg-background/40">
                        <td className="px-4 py-3">
                          <Link
                            href={`/customers/${encodeURIComponent(c.key)}`}
                            prefetch={false}
                            className="font-semibold text-foreground hover:underline"
                          >
                            {c.name || "—"}
                          </Link>
                          {c.email ? (
                            <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                              {c.email}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{c.phone || c.key}</td>
                        <td className="px-4 py-3 text-muted-foreground">{fmtDate(c.lastDateISO)}</td>
                        <td className="px-4 py-3 text-center text-muted-foreground">
                          <span className="font-semibold text-foreground">{c.invoicesCount}</span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-foreground tabular-nums">
                          {inr(c.totalFinal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

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