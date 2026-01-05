// src/components/dashboard/TopCustomersCard.tsx
import Link from "next/link";
import { inr } from "@/lib/format";

export default function TopCustomersCard({
  data,
  monthRevenue,
}: {
  data: { name: string; total: number; pct: number }[];
  monthRevenue: number;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card px-4 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Top customers</h2>
          <p className="mt-1 text-[11px] text-muted">Final invoices • this month</p>
        </div>

        <Link
          href="/invoices"
          prefetch={false}
          className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-card hover:no-underline"
        >
          Open invoices
        </Link>
      </div>

      {data.length === 0 ? (
        <div className="mt-3 rounded-xl border border-dashed border-border bg-background/40 px-3 py-3 text-[11px] text-muted">
          No finalized invoices with customer names yet.
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {data.map((c, idx) => (
            <li
              key={`${c.name}-${idx}`}
              className="flex items-center justify-between gap-3 rounded-xl bg-background/60 px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground" title={c.name}>
                  {c.name}
                </div>
                <div className="text-[11px] text-muted">{c.pct.toFixed(1)}% of revenue</div>
              </div>

              <div className="shrink-0 text-right">
                <div className="text-sm font-semibold text-foreground">{inr(c.total)}</div>
                {monthRevenue > 0 ? (
                  <div className="text-[10px] text-muted">of {inr(monthRevenue)}</div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}

      {monthRevenue > 0 && data.length > 0 ? (
        <p className="mt-3 text-[10px] text-muted">
          Tip: Focus on repeat customers (packages + retention).
        </p>
      ) : null}
    </section>
  );
}