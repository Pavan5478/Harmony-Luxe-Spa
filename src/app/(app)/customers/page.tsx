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

  const customers = await listCustomers({
    q: sp.q,
    fromISO: sp.from,
    toISO: sp.to,
    status: (sp.status || "ALL") as any,
  });

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

            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center rounded-full border border-border bg-background px-4 text-sm font-medium text-foreground hover:bg-card"
            >
              Apply
            </button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted">
          <div>
            Showing <span className="font-semibold text-foreground">{customers.length}</span>{" "}
            customers
          </div>
          <div className="hidden sm:block">Tip: Phone is the primary key.</div>
        </div>

        {role === "ADMIN" ? (
          <div className="mt-3 flex items-center justify-between gap-2">
            <div className="text-[11px] text-muted">
              Admin: rebuild the customer list from existing invoices.
            </div>
            <RebuildCustomersButton />
          </div>
        ) : null}
      </form>

      <section>
        {customers.length === 0 ? (
          <div className="rounded-xl bg-background/70 p-4 text-center text-xs text-muted sm:text-sm">
            No customers match your filters.
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-background/60 text-[11px] font-semibold uppercase tracking-wide text-muted">
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
                          <div className="mt-0.5 truncate text-[11px] text-muted">{c.email}</div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted">{c.phone || c.key}</td>
                      <td className="px-4 py-3 text-muted">{fmtDate(c.lastDateISO)}</td>
                      <td className="px-4 py-3 text-center text-muted">
                        <span className="font-semibold text-foreground">{c.invoicesCount}</span>
                        {/* <span className="ml-2 text-[11px]">(F:{c.finalCount} D:{c.draftCount} V:{c.voidCount})</span> */}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-foreground">
                        {inr(c.totalFinal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
